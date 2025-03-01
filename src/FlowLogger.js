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
  constructor(flowName, version, logProcessor, parentFlow){
    this.flowName = flowName;
    this.lp = logProcessor;
    this.flow = logProcessor.register(flowName, version);
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
   * @param {any} msg summary about data
   * @param {any} data data to log
   * @param {string} key to group/enable/disable logs at run time
   */
  error(msg, data="", key){
    if(typeof msg !== "string") 
      throw Error(`Provide brief detail about Error detail through first parameter.`);
    this.lp.logError(this.flow, msg, data, key);
  }
  /**
   * Use to log extra information
   * @param {any} msg summary about data
   * @param {any} data data to log
   * @param {string} key to group/enable/disable logs at run time
   */
  debug(msg, data="", key){
    if(typeof msg !== "string") 
      throw Error(`Provide brief detail about debug data detail through first parameter.`);
    this.lp.logDebug(this.flow, msg, data, key);
  }

    /**
   * Use to log extra information with warning symbol '⚠️'
   * @param {any} msg summary about data
   * @param {any} data data to log
   * @param {string} key to group/enable/disable logs at run time
   */
  warn(msg, data="", key){
    if(typeof msg !== "string") 
      throw Error(`Provide brief detail about warning data through first parameter.`);
    this.lp.logWarn(this.flow, msg, data, key);
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