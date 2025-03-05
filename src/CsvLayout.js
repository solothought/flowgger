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
      msg = `FLOW,${lr.id},${lr.reportTime},${sanitizeForCSV(lr.flowName)},${lr.version},${stepsStr(lr.steps)},${Date.now()-lr.reportTime},${lr.success?1:0}`; 
      if(lr.parentFlowId){
        msg += `,${lr.parentFlowId},${lr.parentStepId}`;
      }else{
        msg += ",,";
      }
      msg += `,${sanitizeForCSV(lr.errMsg)}`
    }
    return msg;
  }
  debug(lr){
    return this.#inform("DEBUG",lr);
  }
  trace(lr){
    const data = this.#transformStackTraceForCSV(lr.data);
    let msg = `TRACE,${lr.id},${lr.reportTime},${lr.lastStepId},${sanitizeForCSV(lr.msg)},${sanitizeForCSV(data)}`; 
    return msg;
  }
  warn(lr){
    return this.#inform("WARN",lr);
  }
  error(lr){
    return this.#inform("ERROR",lr);
  }
  fatal(lr){
    return this.#inform("FATAL",lr);
  }

  #inform(lvl,lr){
    return `${lvl},${lr.id},${lr.reportTime},${lr.lastStepId},${sanitizeForCSV(lr.msg)},${sanitizeForCSV(stringify(lr.data))}`; 
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

/**
 * @param {any} value 
 * @returns {string}
 */
function sanitizeForCSV(value) {
  if (!value) return "";
  if (typeof value !== 'string') {
      value = String(value);
  }
  
  // Escape double quotes by doubling them
  value = value.replace(/"/g, '""');
  
  // If the value contains a comma, newline, or double-quote, enclose it in double quotes
  if (/[,"\n\r]/.test(value)) {
      value = `"${value}"`;
  }

  return value;
}

/**
 * 
 * @param {[[number,number]]} steps 
 * @returns {string} E.g. 1:1|2:0|3:1
 */
function stepsStr(steps){
  return steps.join("|").replaceAll(",",":")

}