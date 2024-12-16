import LogProcessor from "./LogProcessor.js";
/**
 * Handle flow-level logging
 * Act as a proxy to LogProcessor to record a log with log id
 */
export default class FlowLogger{
  /**
   * @param {string} flowName 
   * @param {LogProcessor} logProcessor 
   */
  constructor(flowName, flowKey = "", logProcessor, parentFlow){
    this.flowName = flowName;
    this.lp = logProcessor;
    this.flow = logProcessor.register(flowName, flowKey);
    this.flow.parentFlow = parentFlow;
  }
  /**
   * Use to match with the flow
   * @param {string} msg 
   */
  info(msg){
    if(typeof msg !== "string") 
      throw Error(`info method supports only string . and it must be present in ${this.flowName}`);
    this.lp.record(this.flow, msg);
  }
  /**
   * Use to match with the flow
   * @param {string} msg 
   */
  error(msg){
    if(typeof msg !== "string") 
      throw Error(`error method supports only string. and it must be present in ${this.flowName}`);
    this.lp.logError(this.flow, msg);
  }
  /**
   * Use to log extra information
   * @param {any} data data to log
   * @param {string} key to enable/disable logging at run time
   */
  debug(data, key){
    this.lp.logDebug(this.flow, data, key);
  }

    /**
   * Use to log extra information with warning symbol '⚠️'
   * @param {any} data data to log
   */
  warn(data){
    this.lp.logWarn(this.flow, data);
  }
  /**
   * Data would be written to error stream.
   * All the inprogress logs would also be written to error stream 
   * @param {any} data 
   */
  fatal(data){
    this.lp.flushAll(data);
  }
  end(){
    this.lp.end(this.flow);
  }
}