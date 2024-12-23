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
  info(lr){
    let msg = `${lr.success},${lr.id},${lr.reportTime},${lr.flowName},${lr.version},${stringify(lr.steps)},${Date.now()-lr.reportTime}`; 
    if(lr.parentFlowId){
      msg += `,${lr.parentFlowId},${lr.parentStepId}`;
    }else{
      msg += ",,";
    }
    msg = `,${lr.errMsg}`
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