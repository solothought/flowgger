const LogProcessor = require("./LogProcessor");


class Logger {
  constructor(config) {
    this.logProcessor = new LogProcessor(config, flows);
  }

  init(flowName){
    return new FlowLogger(flowName, this.logProcessor);
  }

}

class FlowLogger{
  /**
   * @param {string} flowName 
   * @param {LogProcessor} logProcessor 
   */
  constructor(flowName, logProcessor){
    this.lp = logProcessor;
    this.flowId = logProcessor.register(flowName);
  }
  log(msg){
    this.lp.record(msg);
  }
  end(){
    this.lp.end();
  }
}

module.exports = Logger;