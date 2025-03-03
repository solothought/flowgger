import {stringify} from "./util.js"

export default class CsvLayout{
  constructor(){
  }


  info(lr){
    let msg = "";
    if(!lr.steps){
      msg = `HEAD,${lr.id},${lr.reportTime},${lr.flowName},${lr.version}`;
      if(lr.parentFlowId){
        return `${msg},${lr.parentFlowId},${lr.parentStepId}`;
      }
    }else{
      msg = `FLOW,${lr.id},${lr.reportTime},${lr.flowName},${lr.version},${stringify(lr.steps)},${Date.now()-lr.reportTime},${lr.success}`; 
      if(lr.parentFlowId){
        msg += `,${lr.parentFlowId},${lr.parentStepId}`;
      }else{
        msg += ",,";
      }
      msg += `,${lr.errMsg}`
    }
    return msg;
  }
  debug(lr){
    let msg = `DEBUG,${lr.id},${lr.reportTime},${lr.lastStepId},${lr.msg},${stringify(lr.data)}`; 
    return msg;
  }
  trace(lr){
    const data = this.#transformStackTraceForCSV(lr.data);
    let msg = `TRACE,${lr.id},${lr.reportTime},${lr.lastStepId},${lr.msg},${data}`; 
    return msg;
  }
  warn(lr){
    let msg = `WARN,${lr.id},${lr.reportTime},${lr.lastStepId},${lr.msg},${stringify(lr.data)}`; 
    return msg;
  }
  error(lr){
    let msg = `ERROR,${lr.id},${lr.reportTime},${lr.lastStepId},${lr.msg},${stringify(lr.data)}`; 
    return msg;
  }
  fatal(lr){
    let msg = `FATAL,${lr.id},${lr.reportTime},${lr.lastStepId},${lr.msg},${stringify(lr.data)}`; 
    return msg;
  }
  
  #transformStackTraceForCSV(stackTrace) {
    // Split the stack trace into lines and skip the first line (e.g., "Error: ...")
    const lines = stackTrace.split('\n').slice(1);
  
    // Take only the first two meaningful lines
    const relevantLines = lines.slice(0, 2); //TODO: Make it configurable
  
    // Flatten the lines into a single string using a delimiter (e.g., '|')
    const flattenedTrace = relevantLines.join('|');
  
    // Escape double quotes and enclose in double quotes for CSV compatibility
    return `"${flattenedTrace.replace(/"/g, '""')}"`;
  }
}
