const {ExpirableList} = require("thds");

const branchSteps = ["IF", "ELSE_IF", "LOOP"];
function generateMsgHeader(id,flowName){
  return `${Date.now()}:${id}:${flowName}:`;
}
class LogFlow{
  constructor(flowId,flowName, flowSteps){
    this.id= flowId,
    this.currentNode= flowSteps,
    this.seq=[{index:-1,time: Date.now()}],
    this.logMsg= generateMsgHeader(flowId, flowName),
    this.failed= false
  }
}
const defaultConfig = {
  //log file path
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
  constructor(config, flows){
    this.#config = Object.assign({},defaultConfig,config);

    this.#logFlows = new ExpirableList({
      entryLifespan: this.#config.maxStepExecTime, 
      cleanupInterval: this.#config.maxFlowExecTime,
      maxExpiredEntries: 1000
    }, this.#onExpiry);
    this.#flows = flows; //TODO
  }

  register(flowName){
    const flow = this.#flows[flowName];
    if(!flow) throw Error("Invalid Flow name.");
    
    const meta = Object.assign({},
      {maxStepExecTime: this.#config.maxStepExecTime}
      ,flow.headers); 
    
    const flowId = Date.now();
    this.#logFlows.add(flowId,
      new LogFlow(flowId, flowName, flow.steps),
      meta.maxStepExecTime);
    return flowId;
  }

  record(id, msg, time){
    const logRecord = this.#logFlows.get(id);
    // console.log(logRecord)
    if(!logRecord) this.#unexpectedLog(id,msg,time);
    else{
      this.#logFlows.delayExpiry(id);
      this.#updateLogRecord(logRecord, logRecord.currentNode, msg, time);
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
    if(!logRecord) this.#unexpectedLog("",time);
    else{
      this.markLogMsg(logRecord);
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
      console.log("matching", node.msg, msg);
      this.#updateLogMsgWithExecDuration(logRecord, node.index, time);
      logRecord.seq.push({index: node.index, time: time});
      logRecord.currentNode = node.nextStep;
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
    console.log("flushed")
    const logRecord = this.#logFlows.get(id);
    this.#writeToLogFile(logRecord);
    this.#logFlows.removeEntry(id);
  }

  #writeToLogFile(logRecord){
    console.log(logRecord.logMsg);
  }
  #unexpectedLog(msg, time){
    console.log("late:", msg)
  }

  /**
   * Take necessary action when a step long time than max defined time
   * @param {string} logFlowId 
   * @param {LogFlow} logRecord 
   */
  #onExpiry(logFlowId, logRecord){ //TODO: make it async
    // FLOW: check for expired log records
    // LOOP for each log record
      // IF current step has nextStep with no step or a null step
        // mark logRecord successful (flush)
      // ELSE
        // mark logRecord fail (flush)
    console.log("Expiring", logRecord.id);
    this.markLogMsg(logRecord);
    this.flush(logFlowId);
  }

  markLogMsg(logRecord){
    const node = logRecord.currentNode;
    if( node
      && (node.length === 0
        || node.includes(null))){
      // TODO: it is possible that nestStep has some branch step (or series of branch steps) which eventually point to null
      logRecord.logMsg += ">✅";
    }else{
      logRecord.logMsg += ">🕑❌";
    }
  }
    
}


module.exports = LogProcessor;
