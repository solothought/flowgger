export default class TestAppender{
  construct(){
    this.streamData = [];
    this.layout;
  }

  append(logRecord, level){
    if(typeof this.layout === "function"){
      this.streamData.push([level, this.layout(logRecord, level)]);
    }else{
      this.streamData.push([level, this.layout[level](logRecord)]);
    }
  }
}