/**
 * Holds info of a flow in progress.
 */
export default class LogRecord{
  /**
   * 
   * @param {string} flowId 
   * @param {string} flowName 
   * @param {string} version Eg "0.0.1"
   * @param {string} mapKey `flowname(vesion)` to access flow object from map
   * @param {object} startSteps Eg: {1:[0],6:[3,-1]}
   * @param {string} headMsg initial message
   * @param {number} parentFlowId 
   * @param {number} parentStepId 
   */
  constructor(flowId, flowName, version, mapKey, startSteps, headMsg = "", parentFlowId, parentStepId){
    this.id= flowId,
    this.name = flowName;
    this.key = mapKey;
    this.version = version;
    this.headMsg = headMsg;
    this.nextExpecteSteps = startSteps;
    this.startTime = Date.now();
    this.lastStep= {id: -1, startTime: this.startTime};
    this.stepsSeq= []; // [[step id, exe time], [step id, exe time]]
    this.failed= false;
    this.parentFlowId = parentFlowId;
    this.parentStepId = parentStepId;
    this.errMsg = "";
  }

  headLog(){
    const response = {
      id: this.id,
      flowName: this.name,
      version: this.version,
      reportTime: this.startTime,
      headMsg: this.headMsg
    }
    if(this.parentFlowId){
      response.parentFlowId = this.parentFlowId;
      response.parentStepId = this.parentStepId;
    }
    return response;
  }

  flowLog(){
    const response =  {
      success: this.failed ? false: true,
      flowName: this.name,
      version: this.version,
      id: this.id,
      reportTime: this.startTime,
      steps: this.stepsSeq,
      errMsg: this.errMsg // when success is false
    }
    if(this.parentFlowId){
      response.parentFlowId = this.parentFlowId;
      response.parentStepId = this.parentStepId;
    }
    return response;
  }
  dataLog(msg, data){
    return {
      id: this.id,
      flowName: this.name,
      version: this.version,
      lastStepId: this.lastStep.id,
      msg,
      data,
      reportTime: Date.now(),
    }
  }

  /**
   * 
   * @param {LogRecord} lr 
   */
  static convert(lr){
    const newLr = new LogRecord(
      lr.id,
      lr.name,
      lr.version,
      lr.key,
      lr.startSteps,
      lr.headMsg,
      lr.parentFlowId,
      lr.parentStepId
    );
    newLr.startTime = lr.startTime;
    newLr.lastStep= lr.lastStep;
    newLr.stepsSeq= lr.startSeq;
    newLr.failed= lr.failed;
    newLr.errMsg = lr.errMsg;
  }
}