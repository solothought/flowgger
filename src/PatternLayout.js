import { stringify } from "./util.js";

export default class PatternLayout{
  #pattern
  constructor(pattern){
    this.#pattern = {
      head: `%TYPE% %TIME% %ID% %NAME% %VERSION%  %PARENT_ID% %PARENT_STEP_ID%`,
      flow: `%TYPE% %TIME% %ID% %NAME% %VERSION% %STEPS% %DURATION% %STATUS% %PARENT_ID% %PARENT_STEP_ID% %ERR_MSG%`,
      data: `%TYPE% %TIME% %ID% %LAST_STEP% %MSG% %DATA%`,
    };
    
    if(typeof pattern === "string"){
      this.#pattern = {
        head: pattern,
        flow: pattern,
        data: pattern,
      }
    }else if(typeof pattern === "object" && !(pattern instanceof PatternLayout)){
      if(typeof pattern.head === "string") this.#pattern.head = pattern.head;
      if(typeof pattern.flow === "string") this.#pattern.flow = pattern.flow;
      if(typeof pattern.data === "string") this.#pattern.data = pattern.data;
    }
    this.maskRules = [];
    this.replaceData = this.#pattern.data.indexOf('%DATA%') > 0;
    this.dateFormat = "";
    this.traceLines = 2;
    this.newLine = "|"; //set to some delimeter to replace multiline data in stacktrace of data to single line    
  }

  setHeadPattern(customPattern){
    this.#pattern.head = customPattern;
  };
  setFlowPattern(customPattern){
    this.#pattern.flow = customPattern;
  };
  setDataPattern(customPattern){
    this.#pattern.data = customPattern;
    this.replaceData = this.#pattern.data.indexOf('%DATA%') > 0;
  };
  setDateFormat(customFormat){
    this.dateFormat = customFormat;
  };

  setMaskingRules(maskRules){
    this.maskRules = maskRules;
  }

  info(lr){
    if(lr.steps) return this.flow(lr);
    else return this.head(lr);
  }

  head(lr){
    let logMsg = this.#pattern.head;
    console.log(logMsg)
    logMsg = this.#fillCommonProperties(lr, logMsg, "HEAD");
    return logMsg;
  }
  flow(lr){
    let logMsg = this.#pattern.flow;
    
    logMsg = this.#fillCommonProperties(lr, logMsg, "FLOW");

    logMsg = logMsg.replace("%STEPS%", stepsStr(lr.steps));
    logMsg = logMsg.replace("%DURATION%", String(Date.now()-lr.reportTime));
    logMsg = logMsg.replace("%STATUS%", lr.success ? 1:0);
    logMsg = logMsg.replace("%PARENT_ID%", lr.parentFlowId || "");
    logMsg = logMsg.replace("%PARENT_STEP_ID%", lr.parentStepId || "");
    
    logMsg = logMsg.replace("%ERR_MSG%", lr.errMsg ? `[${lr.errMsg}]`: "");

    return logMsg;
  }
  debug(lr){
    return this.#data(lr, "DEBUG");
  }
  warn(lr){
    return this.#data(lr, "WARN");
  }
  trace(lr){
    const data = this.#transformStackTraceForCSV(lr.data);
    return this.#data(lr, "TRACE", data);
  }
  error(lr){
    return this.#data(lr, "ERROR");
  }
  fatal(lr){
    return this.#data(lr, "FATAL");
  }

  #data(lr, lvl, data){
    let logMsg = this.#pattern.data;
    
    logMsg = this.#fillCommonProperties(lr, logMsg, lvl);
    
    
    logMsg = logMsg.replace("%LAST_STEP%", `${lr.lastStepId}`);
    const msg = this.#applyMaskingRules(lr.msg);
    logMsg = logMsg.replace("%MSG%", `[${msg}]`);
    data = data || lr.data;
    if(data && this.replaceData){
      data = this.#applyMaskingRules(stringify(data));
    }
    logMsg = logMsg.replace("%DATA%", data ? `[${data}]` : "");
    return logMsg;
  }

  #fillCommonProperties(lr, logMsg, lvl){
    logMsg = logMsg.replace("%TYPE%", lvl);
    logMsg = logMsg.replace("%ID%", lr.id);
    logMsg = logMsg.replace("%TIME%", `[${this.#toFormattedDate(lr.reportTime)}]`);
    logMsg = logMsg.replace("%NAME%", `[${lr.flowName}]`);
    logMsg = logMsg.replace("%VERSION%", lr.version);
    return logMsg;
  }

  #toFormattedDate(time){
    if(this.dateFormat){
      //TODO: 
      return new Date(time).toISOString();
    }else {
      return new Date(time).toISOString();
    }
  }
  /**
   * 
   * @param {string} str 
   * @returns {string}
   */
  #applyMaskingRules(str){
    this.maskRules.forEach(rule => {
      if(typeof rule.replacement === "string"){
        str = str.replaceAll(rule.regex, rule.replacement);
      }else if(typeof rule.replacement === "function"){
        const match = str.match(rule.regex);
        if(match){
          str = str.replaceAll(rule.regex,(...matches) => rule.replacement(...matches));
        }
      }
    });
    return str;
  }
  

  #singleLine(str){
    if(this.newLine) return str.replaceAll("\n", this.newLine);
    else  return str;
  }

  #transformStackTraceForCSV(stackTrace) {
    // Split the stack trace into lines and skip the first line (e.g., "Error: ...")
    let lines = stackTrace.split('\n').slice(1);
    lines = lines.slice(0, this.traceLines);
  
    if(this.newLine)
      lines = lines.join(this.newLine); //flattenedTrace
  
    return lines;
  }
}

function stepsStr(steps){
  return steps.join(">").replaceAll(",",":")
}



/**
 * Replace Special character for CSV data
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