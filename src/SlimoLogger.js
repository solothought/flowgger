const LogProcessor = require("./LogProcessor");
const Slimo = require("slimo");
const fs = require("fs");
const path = require("path");

class Logger {
  constructor(config = {}) {
    if(!config.flowDir) throw Error("SlimoLogger: flow directory is not defined");
    this.flowKey = config.flowKey;
    const flows = readFlows(config.flowDir, this.flowKey);
    this.logProcessor = new LogProcessor(config, flows);
  }

  init(flowName, flowKey = ""){
    return new FlowLogger(flowName, flowKey, this.logProcessor);
  }
}

function readFlows(dirPath, flowKey = ""){
  let flows = {};
  fs.readdirSync(dirPath).forEach(file => {
    if(!file.endsWith(".flow")) return;
    const content = fs.readFileSync(path.resolve(dirPath,file)).toString();
    console.log("reading", file);
    // console.log(JSON.stringify(f,null,4));
    const f = addFlow(Slimo.parse(content), flowKey);
    flows = Object.assign(flows,f);
  });
  return flows;
}

/**
 * 
 * @param {object} accumulatedflows 
 * @param {object} flows 
 */
function addFlow(flows, flowKey){
  const newFlows = {};
  const flowNames = Object.keys(flows);
  flowNames.forEach( name => {
    flows[name].forEach( flowVar => {
      let key = name;
      if(flowKey){
        if(flowVar.headers[flowKey]){
          key +=`(${flowVar.headers[flowKey]})`;
        }else{
          console.warn(`${flowKey} is not found in ${name}`);
        }
      }
      newFlows[key] = flowVar;
    });
  });
  return newFlows;
}

class FlowLogger{
  /**
   * @param {string} flowName 
   * @param {LogProcessor} logProcessor 
   */
  constructor(flowName, flowKey = "", logProcessor){
    this.flowName = flowName;
    this.lp = logProcessor;
    this.flowId = logProcessor.register(flowName, flowKey);
  }
  /**
   * Use to match with the flow
   * @param {string} msg 
   */
  info(msg){
    if(typeof msg !== "string") 
      throw Error(`info method supports only string . and it must be present in ${this.flowName}`);
    this.lp.record(this.flowId, msg, Date.now());
  }
  /**
   * Use to match with the flow
   * @param {string} msg 
   */
  error(msg){
    if(typeof msg !== "string") 
      throw Error(`error method supports only string. and it must be present in ${this.flowName}`);
    this.lp.recordErr(this.flowId, msg, Date.now());
  }
  /**
   * Use to log extra information
   * @param {any} data 
   */
  debug(data){
    //
    this.lp.record(this.flowId, data, Date.now());
  }
  /**
   * 
   * @param {*} msg 
   */
  warn(msg){
    // not supported
    // this.lp.record(this.flowId, msg, Date.now());
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
    this.lp.end(this.flowId, Date.now());
  }
}

module.exports = Logger;