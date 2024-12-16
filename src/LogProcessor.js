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
    this.lastStep= {id: -1, startTime: this.startTime};
    this.stepsSeq= []; // [[step id, exe time], [step id, exe time]]
    this.failed= false;
    this.parentFlow = parentFlow;
    this.errMsg = "";
  }

  isExceed(threshold){
    return (Date.now() - this.startTime) > threshold;
  }
  lastParentStep(){
    return this.parentFlow.seq[this.parentFlow.seq.length-1];
  }

  headLog(){
    const response = {
      id: this.id,
      flowName: this.name,
      reportTime: this.startTime,
    }
    if(this.parentFlow){
      response.parentFlowId = this.parentFlow.id;
      response.parentStepId = this.parentFlow.seq[this.parentFlow.seq.length-1];
    }
    return response;
  }

  flowLog(){
    const response =  {
      status: this.failed ? '❌':'✅',
      flowName: this.name,
      id: this.id,
      reportTime: this.startTime,
      steps: this.stepsSeq,
      errMsg: this.errMsg // when status is failed
    }
    if(this.parentFlow){
      response.parentFlowId = this.parentFlow.id
      response.parentStepId = this.parentFlow.seq[this.parentFlow.seq.length-1]
    }
    return response;
  }
  dataLog(data){
    return {
      id: this.id,
      lastStepId: this.lastStep.id,
      data: data
    }
  }

}

export default class LogProcessor{
  // #config;
  #logFlows; //ExpirableList
  #flows;    //flows{} from .stflow files (key: flowname+headerkey)

  constructor(config, flows){
    // this.#config = config;
    //TODO: decide he capacity of each queue base on avg run time or number of items in queues
    // this.queues = 
    this.#logFlows = {};
    this.#flows = flows;
    // console.debug(this.#flows);
    // console.debug(this.#flows["second flow(1)"]);
    this.logDebug = this.recordData;
    this.logWarn = this.recordWarn;
    this.logError = this.recordErr;
    this.pausedKeys = new Set();
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

    //acknowledge
    log(logRecord.headLog(),flow.streams["head"],"trace");
    
    return logRecord;
  }

  record(flowLog, msg){
    // Log record would be removed on incorrect logging
    // or if dead-end step is logged
    // Hence, it needs to be confirmed on each call
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
    log(logRecord.dataLog(errMsg),flow.streams["error"], "error");
  }
  /**
   * Log additional data to data stream which is not the part of the flow
   * @param {FlowLog} logRecord LogFow record
   * @param {any} data data to log 
   * @param {string} key to enable/disable logging at runtime 
   */
  recordData(logRecord, data, key){
    if(key && this.pausedKeys.has(key)) return;
    const flow = this.#flows[logRecord.name];
    if(flow.paused) return;
    log(logRecord.dataLog(data),flow.streams["data"],"debug");
  }
  /**
   * Log additional data to data stream which is not the part of the flow
   * @param {FlowLog} logRecord LogFow record
   * @param {any} data data to log 
   */
  recordWarn(logRecord, data){
    const flow = this.#flows[logRecord.name];
    if(flow.paused) return;
    log(logRecord.dataLog(data),flow.streams["data"],"warn");
  }

  /**
   * A dummy method for dynamic pause
   */
  noLog(){  }
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
    logRecord.stepsSeq.push([currentStepIndex,duration]);
  }


  /**
   * log message to main stream
   * and delete log record from memory
   * @param {FlowLog} logRecord 
   */
  flush(logRecord){
    const flow = this.#flows[logRecord.name];
    log(logRecord.flowLog(),flow.streams["flows"], "info");
    delete this.#logFlows[logRecord.id];
  }

  flushAll(data){
    log(`Flushing all messages at ${formatDate()}`,flow.streams["error"], "error");
    log(data, flow.streams["error"], "error");

    for(const logid in this.#logFlows){
      const flowLog = this.#logFlows[logId];
      log({
         id:flowLog.id,
         steps:flowLog.stepsSeq
        },flow.streams["error"], "error");
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
      }else if(pauseConfig.types.includes("error")){
        this.logError = this.noLog;
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
