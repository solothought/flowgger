import {formatDate} from "./util.js";
import FlowggerError from "./FlowggerError.js";

/**
 * Holds info of a flow in progress.
 */
class FlowLog{
  constructor(flowObj, flowId, flowName, parentFlow){
    this.id= flowId,
    this.name = flowName;
    this.nextExpecteSteps = flowObj.startSteps;
    this.startTime = Date.now();
    this.lastStep= {id: -1, startTime: this.startTime}; //sequence of msg passed by user
    const dt = formatDate(this.startTime);
    this.logHead= `"${flowId}",${dt},"${flowName}"`;
    this.stepsSeq= ""; // [[step id, exe time], [step id, exe time]]
    this.failed= false;
    this.parentFlow = parentFlow;
    this.logTail = "";
    this.errMsg = "";
    if(parentFlow){
      this.logTail= `,${parentFlow.id},${parentFlow.lastStep().index}`;
    }
  }

  isExceed(threshold){
    return (Date.now() - this.startTime) > threshold;
  }
  lastParentStep(){
    return this.parentFlow.seq[this.parentFlow.seq.length-1];
  }

  buildLogMsg(){
    return `[${this.logHead},[${this.stepsSeq}],${Date.now()-this.startTime},"${this.failed ? '❌':'✅' }","${this.errMsg}"]`
  }
  buildMsgHead(errMsg){
    return `"${this.id}",${formatDate()},${this.lastStep.id}`;
    // return `["${flowId}",${formatDate()},${this.lastStep.id},"${errMsg || this.errMsg}"]`;
  }

}

const freq = [ "ALWAYS", "NEVER", "EXCEED"];

export default class LogProcessor{
  #config;
  #logFlows; //ExpirableList
  #flows;    //flows{} from .stflow files (key: flowname+headerkey)

  constructor(config, flows){
    this.#config = {
      flows: config.flows,
      layout: {
        logStepDuration: freq.indexOf(config.layout.stepDuration),
      }
    };
    //TODO: decide he capacity of each queue base on avg run time or number of items in queues
    // this.queues = 
    this.#logFlows = {};
    this.#flows = flows;
    // console.debug(this.#flows);
    this.logDebug = this.recordData;
    this.logWarn = this.recordWarn;
  }

  /**
   * Create a flow og record.
   * Write to head stream
   * @param {string} flowName name of flow defined in some .stflow file
   * @param {string} flowKeyVal value of flow header defined in config
   * @returns {FlowLog}
   */
  register(flowName, flowKeyVal, parentFlow){
    // validation
      if(flowKeyVal) flowName += `(${flowKeyVal})`;

      const flow = this.#flows[flowName];
      // console.debug(this.#flows);
      if(!flow) throw new FlowggerError(`Invalid Flow name: ${flowName}, or key value`);
    // End of validation
    
    const flowId = logId();
    const logRecord = new FlowLog(flow, flowId, flowName, parentFlow);
    this.#logFlows[flowId] = logRecord;
    log(`[${logRecord.logHead}${logRecord.logTail}]`, "", "",flow.streams["head"], true);
    return logRecord;
  }


  record(flowLog, msg){
    // Log record would be removed on incorrect logging
    // or if dead-end step is logged
    // Hence, it needs to be checked on each call
    if(this.#logFlows[flowLog.id]){
      this.#updateLogRecord(flowLog, msg);
    }else{
      this.recordErr(flowLog, `Unexpected step ${msg}`);
    }

  }
  /**
   * Log additional data to error stream which is not the part of the flow
   * @param {FlowLog} logRecord
   * @param {string} errMsg Error msg to log 
   */
  recordErr(logRecord, errMsg){
    const flow = this.#flows[logRecord.name];
    if(flow.paused) return;
    log(errMsg, `[${logRecord.buildMsgHead()},`, ']',flow.streams["error"], true);
  }
  /**
   * Log additional data to data stream which is not the part of the flow
   * @param {FlowLog} flow LogFow record
   * @param {any} data data to log 
   * @param {string} key to enable/disable logging at runtime 
   */
  recordData(logRecord, data, key){
    if(key && this.pausedKeys.has(key)) return;
    const flow = this.#flows[logRecord.name];
    if(flow.paused) return;
    
    log(data, `[${logRecord.buildMsgHead()},`, ']',flow.streams["data"]);
  }
  /**
   * Log additional data to data stream which is not the part of the flow
   * @param {FlowLog} flow LogFow record
   * @param {any} data data to log 
   */
  recordWarn(logRecord, data){
    const flow = this.#flows[logRecord.name];
    if(flow.paused) return;
    log(data, `[${logRecord.buildMsgHead()},`, `,⚠️]`,flow.streams["data"]);
  }

  /**
   * A dummy method for dynamic pause
   */
  noLog(){

  }
  /**
   * Signal the ending of a flow.
   * It helps to flush a log record immediately. 
   * It also helps when the current step may be pointing to end and non-ending step.
   * @param {string} id 
   * @param {number} time 
   */
  end(flowLog){
    if(this.#logFlows[flowLog.id]){
      const flowData = this.#flows[flowLog.name];
      const links = this.#flows[flowLog.name].links[flowLog.lastStep.id];
      //check if last step was ending step
      if(links.includes(-1)){
        //end the flow
        this.flush(flowLog);
      }else{// invalid ending
        flowLog.failed = true;
        flowLog.errMsg = `Flow is ended after step: ${flowData.steps[flowLog.lastStep.id].msg}`;
        //log error
        this.recordErr(flowLog,flowLog.errMsg);
        //end the flow
        this.flush(flowLog);
      }
    }else{// flow object is removed
      //do nothing
    }
  }

  /**
   * check if the the given log msg is expected. 
   * Update the last step and log message accordingly. 
   * @param {FlowLog} logRecord 
   * @param {string} msg 
   */
  #updateLogRecord(logRecord, msg){
    const flow = this.#flows[logRecord.name];
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
    }
  }

  /**
   * Build log msg of steps with execution time if asked or exceed
   * @param {FlowLog} logRecord 
   * @param {number} currentStepIndex 
   * @param {number} timeNow 
   */
  //TODO: decide at start time
  #logStepSeq(logRecord, currentStepIndex, timeNow){
    const duration = timeNow - logRecord.lastStep.startTime;

    if(logRecord.stepsSeq.length > 0) logRecord.stepsSeq += ",";

    switch(this.#config.layout.logStepDuration){
      case 0: //ALWAYS
        logRecord.stepsSeq += `[${currentStepIndex},${duration}]`;
        break;
      case 2: //EXCEED
        if(duration > this.#config.flows.maxIdleTime)
          logRecord.stepsSeq += `[${currentStepIndex},${duration}]`;
        else
          logRecord.stepsSeq += `[${currentStepIndex}]`
        break;
      default: //NEVER
        logRecord.stepsSeq += `[${currentStepIndex}]`
        break;
    }
  }


  /**
   * log message to main stream
   * and delete log record from memory
   * @param {FlowLog} logRecord 
   */
  flush(logRecord){
    const flow = this.#flows[logRecord.name];
    log(logRecord.buildLogMsg(),"","",flow.streams["flows"]);
    delete this.#logFlows[logRecord.id];
  }

  flushAll(data){
    log(`[ "Flushing all messages at ${formatDate()}"]`,"","",flow.streams["error"], true);
    log(data, "", "", flow.streams["error", true]);

    for(const logid in this.#logFlows){
      const flowLog = this.#logFlows[logId];
      const logMsgBefore = `["${flowLog.id}",${formatDate()},${flowLog.seq[flowLog.seq.length-1].index}`;
      log(flowLog.logMsg, logMsgBefore, "]",flow.streams["error"], true);
    }
    this.#logFlows = {};
  }

  /**
   * 
   * @param {{keys: string[], flows: string[], level: string[]}} pauseConfig 
   */
  pause(pauseConfig = {}){
    if(Array.isArray(pauseConfig.keys)){
      this.pausedKeys = new Set(pauseConfig.keys); 
    }
    if(Array.isArray(pauseConfig.flows)){
      //set paused flag in flows to reduce comparisons
      const flowNames = Object.keys(this.#flows);
      for (let i = 0; i < flowNames.length; i++) {
        const flow = flowNames[i];
        if(pauseConfig.flows.includes(flow.name)) flow.paused = true;
      }
    }
    if(Array.isArray(pauseConfig.levels)){
      //assign record methods with 'noLog' to reduce runtime comparisons
      //only debug, warn are supported
      if(pauseConfig.levels.includes("debug")){
        this.logDebug = this.noLog;
      }
      if(pauseConfig.levels.includes("warn")){
        this.logWarn = this.noLog;
      }
    }
    // if(Array.isArray(pauseConfig.appenders)){
    //   //replace appender in a all flows with dummy appender
    // }
  }
    

  /**
   * 
   * @param {{keys: Set<string>, flows: string[], level: string[]}} playConfig 
   */
  play(playConfig = {}){
    if(Array.isArray(playConfig.keys) && this.pausedKeys){
      playConfig.keys.forEach(key => {
        if(this.pausedKeys.has(key)) this.pausedKeys.delete(key);
      })
    }
    if(Array.isArray(playConfig.flows)){
      //set paused flag in flows to reduce comparisons
      const flowNames = Object.keys(this.#flows);
      for (let i = 0; i < flowNames.length; i++) {
        const flow = flowNames[i];
        if(playConfig.flows.includes(flow.name)) flow.paused = false;
      }
    }
    if(Array.isArray(playConfig.levels)){
      //assign record methods with 'noLog' to reduce runtime comparisons
      //only debug, warn are supported
      if(playConfig.levels.includes("debug")){
        this.logDebug = this.recordData;
      }
      if(playConfig.levels.includes("warn")){
        this.logWarn = this.recordWarn;
      }
    }
  }
}

function logId(){
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * log a message to all appenders
 * @param {any} msg 
 * @param {string} before 
 * @param {string} after 
 * @param {Array} appenders 
 */
function log(msg, before, after, appenders, immediate = false){
  appenders.forEach(appender => {
    appender.write(msg, before, after, immediate);
  });
}
