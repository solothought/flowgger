const LogProcessor = require("./LogProcessor");
const Slimo = require("slimo");
const fs = require("fs");
const path = require("path");

class Logger {
  constructor(config = {}) {
    if(!config.flowDir) throw Error("SlimoLogger: flow directory is not defined");
    const flows = readFlows(config.flowDir);
    this.logProcessor = new LogProcessor(config, flows);
  }

  init(flowName){
    return new FlowLogger(flowName, this.logProcessor);
  }
}

function readFlows(dirPath){
  let flows = {};
  fs.readdirSync(dirPath).forEach(file => {
    const content = fs.readFileSync(path.resolve(dirPath,file)).toString();
    console.log("reading", file);
    const parser = new Slimo();
    const f= parser.parse(content);
    // console.log(JSON.stringify(f,null,4));
    flows = Object.assign(flows,f);
  });
  return flows;
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
    this.lp.record(this.flowId, msg, Date.now());
  }
  end(){
    this.lp.end(this.flowId, Date.now());
  }
}

module.exports = Logger;