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
  constructor(flowName, version, logProcessor, headMsg, parentFlow){
    this.flowName = flowName;
    this.lp = logProcessor;
    this.logRecord = logProcessor.register(flowName, version, headMsg, parentFlow);
    // this.flow.parentFlow = parentFlow;
  }
  /**
   * Use to match with the flow
   * @param {string} msg 
   */
  info(msg){
    if(typeof msg !== "string") 
      throw Error(`info method supports only string . and it must be present in ${this.flowName}`);
    this.lp.record(this.logRecord, msg);
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
  
    let enhancedData;
    if (data instanceof Error) {
      // Extract error details
      enhancedData = {
        errorMessage: data.message || "No error message",
        stackTrace: data.stack || "No stack trace available",
      };
    } else {
      // Treat data as a generic value
      enhancedData = data;
    }

    this.lp.logError(this.logRecord, msg, enhancedData, key);
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
    this.lp.logDebug(this.logRecord, msg, data, key);
  }
  /**
   * Use to log extra information
   * @param {any} msg summary about data
   * @param {string} key to group/enable/disable logs at run time
   */
  trace(msg, key){
    if(typeof msg !== "string") 
      throw Error(`Provide brief detail about debug data detail through first parameter.`);

    const err = new Error();
    const stackTrace = err.stack.split('\n').slice(2).join('\n'); // Skip the first two lines
    this.lp.logTrace(this.logRecord, msg, stackTrace, key);
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
    this.lp.logWarn(this.logRecord, msg, data, key);
  }

  end(){
    this.lp.end(this.logRecord);
  }
}