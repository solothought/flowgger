const {ExpirableList} = require("thds");

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
  // #pipeStream;
  constructor(config, flows){
    this.#config = Object.assign({},defaultConfig,config);

    //piping
    this.#pipeStream(this.#config.mainStream);
    this.#pipeStream(this.#config.errStream);
    this.#pipeStream(this.#config.dataStream);
    this.#pipeStream(this.#config.headStream);

    this.#logFlows = new ExpirableList({
      entryLifespan: this.#config.maxStepExecTime, 
      cleanupInterval: this.#config.maxFlowExecTime,
      maxExpiredEntries: 1000
    }, this.#onExpiry);
    this.#flows = flows; //TODO
  }
  #pipeStream(arr){
    let mainStream = arr[0];
    for (let i = 1; i < arr.length; i++) {
      mainStream = mainStream.pipe(arr[i]);
    }
    arr[0] = mainStream;
  }
  register(flowName){
    const flow = this.#flows[flowName];
    if(!flow) throw Error("Invalid Flow name.");
    
    const meta = Object.assign({},
      {maxStepExecTime: this.#config.maxStepExecTime}
      ,flow.headers); 
    
    const flowId = Date.now();
    const logRecord = new LogFlow(flowId, flowName, flow.steps);
    this.#logFlows.add(flowId,
      logRecord,
      meta.maxStepExecTime);
    this.#writeToHeadStream(logRecord)
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
   * to log data to an additional stream
   * @param {string} id Flow Id
   * @param {string} msg Error msg to log 
   * @param {number} time time of logging
   */
  recordErr(id, msg, time){
    const logRecord = this.#logFlows.get(id);
    if(logRecord){
      this.#writeToErrStream(logRecord);
      this.record(id,msg,time);
    }
  }
  /**
   * to log extra data related to flow
   * @param {string} id Flow Id
   * @param {Object} obj data to log 
   * @param {number} time time of logging
   */
  recordData(id, obj, time){
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
      logRecord.nodeType = node.type;
      if(node.nextStep.length === 0 || (node.nextStep.length ===1 && node.nextStep[0] === null)){
        this.markLogMsg(logRecord);
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
    console.log("flushed")
    const logRecord = this.#logFlows.get(id);
    this.#writeToMainStream(logRecord);
    this.#logFlows.removeEntry(id);
  }

  #writeToMainStream(logRecord){
    this.#config.mainStream[0].write(logRecord.logMsg);
    // console.log(logRecord.logMsg);
  }
  #writeToHeadStream(logRecord){
    this.#config.headStream[0].write(`${this.formatDate(Date.now())}:${logRecord.logHead}`);
  }
  #writeToErrStream(logMsg){
    this.#config.errStream[0].write(logMsg);
  }
  #writeToDataStream(obj){
    //TODO: resolve circular dependency to transform to string
    this.#config.dataStream[0].write(logRecord.logMsg);
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
    // FLOW: check for expired log records
    // LOOP for each log record
      // IF current step has nextStep with no step or a null step
        // mark logRecord successful (flush)
      // ELSE
        // mark logRecord fail (flush)
    // console.log("Expiring", logRecord.id);
    this.markLogMsg(logRecord);
    this.flush(logFlowId);
  }

  markLogMsg(logRecord){
    const node = logRecord.currentNode;
    if( node && isPointingToEnd (node, logRecord.nodeType)){
      logRecord.logMsg += ">✅";
    }else{
      logRecord.logMsg += ">🕑❌";
    }
  }
    
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
