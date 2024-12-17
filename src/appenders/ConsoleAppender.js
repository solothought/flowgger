export default class ConsoleAppender {
  constructor() {
    this.layout;
  }

  /**
   * Append method to write logs to console.
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
    console[logLevel](logMsg);
  }
}