export default class Log4jsAdapter {
  constructor(logger) {
    this.logger = logger;
    this.layout;
  }

  append(logRecord, level) {
    if(typeof this.layout === "function"){
      this.logger[level](this.layout(logRecord, level));
    }else{
      this.logger[level](this.layout[level](logRecord));
    }
  }
}
