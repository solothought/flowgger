import { stringify } from "../util.js";

export default  class SyserrAppender {
  constructor() {
    this.layout;
  }

  /**
   * Append method to write logs to stderr.
   * @param {Object} logRecord - Log data.
   * @param {string} logLevel - Log level (e.g., INFO, DEBUG, ERROR).
   */
  append(logRecord, logLevel) {
    let logMsg = "";
    if(typeof this.layout === "function"){
      logMsg = this.layout(logRecord, logLevel);
    }else{
      logMsg = this.layout[logLevel](logRecord);
    }
    if(typeof logMsg !== "string") logMsg = stringify(logMsg);

    process.stderr.write(`${logMsg}\n`); // Write to stdout
  }
}