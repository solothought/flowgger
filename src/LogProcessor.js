import FlowggerError from "./FlowggerError.js";
import FlowLogger from "./FlowLogger.js";
import LogRecord from "./LogRecord.js";



export default class LogProcessor{
  // #config;
  /**
   * { flowId: LogRecord}
   */
  #logRecords;
  #flows;    //flows{} from .stflow files (key: flowname+headerkey)

  constructor(config, flows){
    // this.#config = config;
    //TODO: decide he capacity of each queue base on avg run time or number of items in queues
    // this.queues = 
    this.#logRecords = config.store;
    this.#logRecords.init(config.storeKeyPrefix || "");
    this.storeKeyPrefix = config.storeKeyPrefix|| "";
    this.#flows = flows;
    this.logDebug = this.recordData;
    this.logWarn = this.recordWarn;
    this.logError = this.recordErr;
    this.logTrace = this.recordTrace;
    this.playingKeys = new Set();
  }

  /**
   * Create a flow og record.
   * Write to head stream
   * @param {string} flowName name of flow defined in some .stflow file
   * @param {string} version value of flow header defined in config
   * @param {string} headMsg 
   * @param {FlowLogger} parentFlowLoggerInstance 
   * @returns {LogRecord}
   */
  register(flowName, version, headMsg = "", parentFlowLoggerInstance){
    let storeKey = `${this.storeKeyPrefix}${flowName}(${version})`;

    const flow = this.#flows[storeKey];
    // console.debug(this.#flows);
    if(!flow) throw new FlowggerError(`Invalid Flow name: ${flowName}, or version`);
    
    const flowId = logId();
    const logRecord = new LogRecord(flowId, flowName, version, storeKey, flow.startSteps, headMsg);
      if(parentFlowLoggerInstance){
        logRecord.parentFlowId = parentFlowLoggerInstance.logRecord.id;
        logRecord.parentStepId = parentFlowLoggerInstance.logRecord.lastStep.id;
      }
    this.#logRecords.set(flowId,logRecord);

    //acknowledge
    log(logRecord.headLog(),flow.streams["head"],"info");
    
    return logRecord;
  }

  record(logRecord, msg){
    // Log record would be removed on incorrect logging
    // or if dead-end step is logged
    // Hence, it needs to be confirmed on each call
    if(this.#logRecords.has(logRecord.id)){
      this.#updateLogRecord(logRecord, msg);
    }else{
      this.recordErr(logRecord, `Unexpected step: ${msg}`);
    }

  }

  recordErr(logRecord, msg, data="", filterKey){
    this.#recordLog(logRecord,msg,data,"error","error",filterKey);
  }
  recordData(logRecord, msg, data, filterKey){
    this.#recordLog(logRecord,msg,data,"data","debug",filterKey);
  }
  recordWarn(logRecord, msg, data, filterKey){
    this.#recordLog(logRecord,msg,data,"data","warn",filterKey);
  }
  recordTrace(logRecord, msg, data, filterKey){
    this.#recordLog(logRecord,msg,data,"data","trace",filterKey);
  }

  /**
   * Log additional data to error stream which is not the part of the flow
   * @param {LogRecord} logRecord
   * @param {string} msg Short msg about data 
   * @param {any} data data to log 
   * @param {string} streamType where to log 
   * @param {string} logLevel log level 
   * @param {string} filterKey play/pause logs
   */
  #recordLog(logRecord, msg, data, streamType, logLevel, filterKey){
    if(filterKey && !this.playingKeys.has(filterKey)) return;
    const flow = this.#flows[logRecord.storeKey];
    if(flow.paused) return;
    log(logRecord.dataLog(msg, data),flow.streams[streamType],logLevel);
  }
  /**
   * A dummy method for dynamic pause
   */
  noLog(){  }
  /**
   * Signal the ending of a flow.
   * It helps to flush a log record immediately. 
   * It also helps when the current step may be pointing to end and non-ending step.
   * @param {LogRecord} logRecord 
   */
  end(logRecord){
    if(this.#logRecords.has(logRecord.id)){
      const flowData = this.#flows[logRecord.storeKey];
      const links = flowData.links[logRecord.lastStep.id];
      //valid ending
      //- if last step is an ending step
      //- if last step is not -1
      if(logRecord.lastStep.id !== -1 && links.includes(-1)){
        //end the flow
        this.flush(logRecord);
      }else{// invalid ending
        logRecord.failed = true;
        if(logRecord.lastStep.id === -1){
          logRecord.errMsg = `Flow is ended before taking any step`;
        }else{
          logRecord.errMsg = `Flow is ended after step: ${flowData.steps[logRecord.lastStep.id].msg}`;
        }
        //log error
        this.recordErr(logRecord,logRecord.errMsg);
        //end the flow
        this.flush(logRecord);
        this.failParent(logRecord);
      }
    }else{// flow object is removed
      //do nothing
    }
  }

  failParent(lr){
    if(lr.parentFlowId){
      const parentLogRecord = this.#logRecords.get(lr.parentFlowId);
      parentLogRecord.failed = true;
      parentLogRecord.errMsg = "Subflow failed";
      
      this.flush(parentLogRecord);
    }
  }

  /**
   * check if the the given log msg is expected. 
   * Update the last step and log message accordingly. 
   * @param {LogRecord} logRecord 
   * @param {string} msg 
   */
  #updateLogRecord(logRecord, msg){
    const flow = this.#flows[logRecord.storeKey];
    const stepIndex = flow.stepsIndex[msg];

    const matchedId = logRecord.nextExpecteSteps.includes(stepIndex);
    const timeNow = Date.now();
    if(matchedId){
      const links = flow.links[stepIndex];
      if(links.length === 1 && links[0] === -1){ //dead-end step points to end(-1) only
        //end the flow
        this.#logStepSeq(logRecord, stepIndex, timeNow);
        this.flush(logRecord);
      }else{
        //update log msg
        this.#logStepSeq(logRecord, stepIndex, timeNow);
        //update log seq
        logRecord.lastStep = {id: stepIndex, startTime: timeNow};
        //update nextExpectedSteps
        logRecord.nextExpecteSteps = links;
      }
    }else{ //invalid msg
      this.#logStepSeq(logRecord, stepIndex, timeNow);
      logRecord.failed = true;
      logRecord.errMsg = `invalid step: ${msg}`;
      //log error
      this.recordErr(logRecord,logRecord.errMsg);
      //end the flow
      this.flush(logRecord);
      this.failParent(logRecord);
    }
  }

  /**
   * Build log msg of steps with execution time if asked or exceed
   * @param {LogRecord} logRecord 
   * @param {number} currentStepIndex 
   * @param {number} timeNow 
   */
  //TODO: decide at start time
  #logStepSeq(logRecord, currentStepIndex, timeNow){
    const duration = timeNow - logRecord.lastStep.startTime;
    logRecord.stepsSeq.push([currentStepIndex,duration]);
  }


  /**
   * log message to main stream
   * and delete log record from memory
   * @param {LogRecord} logRecord 
   */
  flush(logRecord){
    const flow = this.#flows[logRecord.storeKey];
    log(logRecord.flowLog(),flow.streams["flows"], "info");
    this.#logRecords.delete(logRecord.id);
  }

  flushAll(msg){
    for(const logId of this.#logRecords.keys()){
      const logRecord = this.#logRecords.get(logId);
      const flowStream = this.#flows[logRecord.storeKey].streams["flows"];
      const record =  {
        success: false,
        flowName: logRecord.name,
        version: logRecord.version,
        id: logRecord.id,
        reportTime: logRecord.startTime,
        steps: logRecord.stepsSeq,
        errMsg: msg,
      }
      if(logRecord.parentFlowId){
        record.parentFlowId = logRecord.parentFlowId
        record.parentStepId = logRecord.parentStepId;
      }

      log(record,flowStream, "info");
    }
    this.#logRecords.clear();
  }

  /**
   * If a key is present in playedKeys, delete it else take no action 
   * @param {{keys: string[], flows: string[], level: string[]}} pauseConfig 
   */
  pause(pauseConfig = {}){
    if(Array.isArray(pauseConfig.keys) && this.playingKeys){
      pauseConfig.keys.forEach(key => {
        if(this.playingKeys.has(key)) this.playingKeys.delete(key);
      })
      
    }
    if(Array.isArray(pauseConfig.flows)){
      const flowNames = Object.keys(this.#flows);
      for (let i = 0; i < flowNames.length; i++) {
        const flow = this.#flows[flowNames[i]];
        if(pauseConfig.flows.includes(flow.uName)) flow.paused = true;
      }
    }
    if(Array.isArray(pauseConfig.types)){
      //assign record methods with 'noLog' to reduce runtime comparisons
      //only debug, warn are supported
      if(pauseConfig.types.includes("data")){
        this.logDebug = this.noLog;
        this.logWarn = this.noLog;
      }else if(pauseConfig.types.includes("trace")){
        this.logTrace = this.noLog;
      }else if(pauseConfig.types.includes("error")){
        this.logError = this.noLog;
      }
    }
    // if(Array.isArray(pauseConfig.appenders)){
    //   //replace appender in a all flows with dummy appender
    // }
  }
    

  /**
   * If a key are not present in playedKeys, add it.
   * @param {{keys: Set<string>, flows: string[], level: string[]}} playConfig 
   */
  play(playConfig = {}){
    if(Array.isArray(playConfig.keys)){
      if(!this.playingKeys) this.playingKeys = new Set();
      playConfig.keys.forEach(key => this.playingKeys.add(key));
    }
    if(Array.isArray(playConfig.flows)){
      const flowNames = Object.keys(this.#flows);
      for (let i = 0; i < flowNames.length; i++) {
        const flow = this.#flows[flowNames[i]];
        if(playConfig.flows.includes(flow.uName)) flow.paused = false;
      }
    }
    if(Array.isArray(playConfig.types)){
      if(playConfig.types.includes("data")){
        this.logDebug = this.recordData;
        this.logWarn = this.recordWarn;
      }else if(playConfig.types.includes("trace")){
        this.logTrace = this.recordTrace;
      }else if(playConfig.types.includes("error")){
        this.logError = this.recordErr;
      }
    }
  }
}

function logId(){
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * log a message to all appenders
 * @param {object} logRecord 
 * @param {Array} appenders 
 * @param {string} level info|trace|debug|warn|error 
 */
function log(logRecord, appenders, level){
  appenders.forEach(appender => {
    appender.append(logRecord, level);
  });
}
