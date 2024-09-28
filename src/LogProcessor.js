const {ExpirableList} = require("thds");
const StreamHandler = require("./StreamHandler");

const branchSteps = ["IF", "ELSE_IF", "LOOP"];

class LogFlow{
  constructor(flowId,flowName, flowSteps){
    this.id= flowId,
    this.currentNode= flowSteps,
    this.seq=[{index:-1,time: Date.now()}],
    this.logHead= `${flowId}:${flowName}`,
    this.logMsg= `${flowId}:${flowName}`,
    this.failed= false
  }
}
const defaultConfig = {
  //log file path
  mainStream: [process.stdout], // for flow sequence (delayed)
  errStream:[process.stderr],   // for error msg and it's data (immediate)
  dataStream:[process.stdout],  // for extra data for logging (immediate)
  headStream:[process.stdout],  // for start of a flow (immediate)
  //flow
  maxFlowExecTime: 10000, //for a flow 
  maxStepExecTime: 200,    //for a step
  // maxStepExecTime: 5000,    //for a step
  maxHaltedFlows: 500     //for flows didn't end in expected time
}
class LogProcessor{
  #config;
  #logFlows;
  #flows;
  #sh;
  constructor(config, flows){
    this.#config = Object.assign({},defaultConfig,config);
    this.#sh = new StreamHandler();
    this.#sh.addStream("mainStream",this.#config.mainStream);
    this.#sh.addStream("errStream",this.#config.errStream);
    this.#sh.addStream("dataStream",this.#config.dataStream);
    this.#sh.addStream("headStream",this.#config.headStream);


    this.#logFlows = new ExpirableList({
      entryLifespan: this.#config.maxStepExecTime, 
      cleanupInterval: this.#config.maxFlowExecTime,
      maxExpiredEntries: 1000
    }, this.#onExpiry.bind(this));
    this.#flows = flows;
  }

  register(flowName, flowKeyVal){
    if(this.#config.flowKey && !flowKeyVal) 
      throw Error("Slimo Logger expects a flow key");
    
    if(flowKeyVal) flowName += `(${flowKeyVal})`;

    const flow = this.#flows[flowName];
    if(!flow) throw Error(`Slimo Logger: Invalid Flow name: ${flowName}`);
    
    const meta = Object.assign({},
      {maxStepExecTime: this.#config.maxStepExecTime}
      ,flow.headers); 
    
    const flowId = Date.now();
    const logRecord = new LogFlow(flowId, flowName, flow.steps);
    this.#logFlows.add(flowId, logRecord, meta.maxStepExecTime);
    this.#sh.log("headStream",`${this.formatDate(Date.now())}:${logRecord.logHead}`);
    return flowId;
  }


  record(id, msg, time){
    const logRecord = this.#logFlows.get(id);
    // console.log(logRecord)
    // console.log(msg)
    if(!logRecord) this.#unexpectedLog(id,msg,time);
    else{
      this.#logFlows.delayExpiry(id);
      this.#updateLogRecord(logRecord, logRecord.currentNode, msg, time);
    }
  }
  /**
   * to log data to an additional stream
   * @param {string} id Flow Id
   * @param {string} msg Error msg to log 
   * @param {number} time time of logging
   */
  recordErr(id, msg, time){
    const logRecord = this.#logFlows.get(id);
    if(logRecord){
      this.#sh.log("errStream",msg);
      this.record(id,msg,time);
    }
  }
  /**
   * to log extra data related to flow
   * @param {string} id Flow Id
   * @param {Object} obj data to log 
   * @param {number} time time of logging
   */
  recordData(id, data, time){
    const logRecord = this.#logFlows.get(id);
    if(logRecord){
      //TODO: log the current step index
      //data should be logged when the record is failed or as rules defined
    }
  }
  /**
   * Signal the ending of a flow.
   * 
   * It helps to flush a log record immediately. 
   * It also helps when the current step may be pointing to end and non-ending step.
   * @param {string} id 
   * @param {number} time 
   */
  end(id, time){
    const logRecord = this.#logFlows.get(id);
    if(logRecord){
      this.#markLogMsg(logRecord, time);
      this.flush(id);
    }
  }

  /**
   * check if the the given log msg is expected. 
   * Update the current step and log message accordingly. 
   * @param {LogFlow} logRecord 
   * @param {Step | Step[]} node 
   * @param {string} msg 
   * @param {number} time 
   */
  #updateLogRecord(logRecord, node, msg, time){
    // console.log(node);
    if(Array.isArray(node)){
      return this.#loopThrough(logRecord, node, msg, time);
    }else if(branchSteps.includes(node.type)){
      return this.#loopThrough(logRecord, node.nextStep, msg, time);
    }else if(node.type === "FOLLOW"){
      //TODO: 
    }else if(node.msg === msg){
      // console.log("matching", node.msg, msg);
      this.#updateLogMsgWithExecDuration(logRecord, node.index, time);
      logRecord.seq.push({index: node.index, time: time});
      logRecord.currentNode = node.nextStep;
      logRecord.nodeType = node.type;
      if(isExitStep(node)){
        this.#updateLogMsgWithExecDuration(logRecord, `✅`, time);
        this.flush(logRecord.id);
      }
      return true;
    }
  }
  #loopThrough(logRecord, steps, msg, time){
    let foundMatch = false;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if(step) foundMatch = this.#updateLogRecord(logRecord, step, msg, time);
      if(foundMatch === true) return true;
    }
    if(foundMatch === false){ //TODO: this is not testes
      logRecord.failed = true;
      this.#updateLogMsgWithExecDuration(logRecord, `❌${msg}`, time);
      this.flush(logRecord.id);
      return false;
    }
  }

  /**
   * append execution time to last executed step in log message if threshold cross
   * @param {LogFlow} logRecord 
   * @param {string} msg 
   */
  #updateLogMsgWithExecDuration(logRecord, msg, timeNow){
    const lastStep = logRecord.seq[logRecord.seq.length - 1]
    lastStep.duration = lastStep.time - timeNow;
    if(lastStep.duration > this.#config.maxStepExecTime){
      logRecord.logMsg += `(${lastStep.duration})>${msg}`;
    }else{
      logRecord.logMsg += `>${msg}`
    }
  }
  flush(id){
    // console.log("flushed")
    const logRecord = this.#logFlows.get(id);
    this.#sh.log("mainStream",logRecord.logMsg);
    this.#logFlows.removeEntry(id);
  }
  flushAll(data){
    this.#sh.log("errStream", `Flushing all messages at ${this.formatDate(Date.now())}`);
    this.#sh.log("errStream", data); //TODO stringify it

    this.#logFlows.forEachNonExpired((k,v)=>{
      this.#sh.log("errStream", v.logMsg);
    }) 
    this.#logFlows.forEachExpired((k,v)=>{
      this.#sh.log("errStream", v.logMsg);
    })

    //TODO: write in memory data to error stream
  }

  
  #unexpectedLog(msg, time){
    console.log("late:", msg)
  }

  formatDate(time){ //TODO: format as per config
    return time;
  }

  /**
   * Take necessary action when a step long time than max defined time
   * @param {string} logFlowId 
   * @param {LogFlow} logRecord 
   */
  #onExpiry(logFlowId, logRecord){ //TODO: make it async
    // console.log("Expiring:",logFlowId)
    this.#markLogMsg(logRecord, Date.now(), "🕑");
    this.flush(logFlowId);
  }

  #markLogMsg(logRecord, time, reason = ""){
    const node = logRecord.currentNode;
    if( node && isPointingToEnd (node, logRecord.nodeType)){
      this.#updateLogMsgWithExecDuration(logRecord, `✅`, time);
    }else{
      this.#updateLogMsgWithExecDuration(logRecord, `${reason}❌`, time);
    }
  }
    
}

function isExitStep(node){
  // for (let id = 0; id < flows.exitSteps.length; id++) {
  //   const step = flows.exitSteps[id];
  //   if(step.index === node.index) return true;
  // }
  // return false;
  return node.nextStep.length === 0 || (node.nextStep.length ===1 && node.nextStep[0] === null);
}
function isPointingToEnd(node, type, cache = []){
  // console.log(node);
  if(node.includes(null)) return true;
  else if(node.length === 0) return true;
  else if(isBranch(type) && node.length < 2 ) return true;
  else {
    let foundEnd = false;
    for (let i = 0; i < node.length; i++) { //max 2 times
      const step = node[i];
      if(!cache.includes(step.index) && isBranch(step.type)) {
        cache.push(step.index);
        foundEnd = isPointingToEnd(step.nextStep,step.type, cache);
      }
      if(foundEnd) return true;
    }
    return foundEnd;
  }
}

function isBranch(type){
  return branchSteps.includes(type);
}

module.exports = LogProcessor;
