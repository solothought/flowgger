import {stringify} from "./util.js"

export default class CsvLayout{
  constructor(){
  }

  trace(logRecord){
    let msg = `${logRecord.id},${logRecord.reportTime},${logRecord.flowName}`;
    if(logRecord.parentFlowId){
      return `${msg},${logRecord.parentFlowId},${logRecord.parentStepId}`;
    }else{
      return msg;
    }
  }
  info(logRecord){
    let msg = `${logRecord.status},${logRecord.id},${logRecord.reportTime},${logRecord.flowName},${stringify(logRecord.steps)},${Date.now()-logRecord.reportTime}`; 
    if(logRecord.parentFlowId){
      msg += `,${logRecord.parentFlowId},${logRecord.parentStepId}`;
    }else{
      msg += ",,";
    }
    msg = `,${logRecord.errMsg}`
    return msg;
  }
  debug(logRecord){
    return logRecord
  }
  warn(logRecord){
    logRecord
  }
  error(logRecord){
    logRecord
  }
  fatal(logRecord){
    logRecord
  }
}