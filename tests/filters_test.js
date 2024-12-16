import Flowgger from "../src/Flowgger.js";
import path from "path";
import TestAppender from "./TestAppender.js";


describe("Flowgger", function() {
  const appender = new TestAppender();

  const config = {
      "appenders": [
        {
          handler: appender,
          layout: (lr,lvl) => { //can be a function or object
            if(lvl === "trace"){
              return lr.flowName;
            }else if(lvl === "error"){
              return `${lr.data},${lr.lastStepId}`;
            }else{
              //remove exec time
              const seq = [];
              lr.steps.forEach(result => {
                seq.push(result[0]);
              })
              return `${lr.status},${lr.flowName},[${seq}]`;
            }
          }
        }
      ],
      flow: {
        source: path.resolve("./tests/flows"),
        discriminationHeader: "v",
      }
    };
    
    

  it("should filter out appenders notFor particular flow", function() {
    config.appenders[0].onlyFor = undefined;
    config.appenders[0].notFor = {
      flows: ["first flow"]
    }
    const flowgger = new Flowgger(config)

    appender.streamData = [];
    
    const expected = [
      [ 'trace', 'second flow(1)' ],
      [ 'trace', 'second flow(2)' ],
      [ 'info', '✅,second flow(1),[0,2,4]' ],
      [ 'error', 'invalid step: this is wrong step,-1' ],
      [ 'info', '❌,second flow(2),[]' ]
    ]    
    
    const flow = flowgger.init("first flow");
    const flow2 = flowgger.init("second flow(1)");
    const flow3 = flowgger.init("second flow(2)");
    
    flow.info("this is the sample flow") //0
    flow.info("until the next condition is true") //2
    flow.info("until the next condition is true") //2
    flow.info("mark it complete") //4
    
    
    flow2.info("this is the also another flow") //0
    flow2.info("until the next condition is true") //2
    flow2.info("mark it complete") //4


    flow3.info("this is wrong step")


    // console.log(appender.streamData);
    expect(appender.streamData).toEqual(expected);
  });
  
  it("should use the appenders onlyFor particular flow", function() {
    config.appenders[0].notFor = undefined;
    config.appenders[0].onlyFor = {
      flows: ["first flow"]
    }
    const flowgger = new Flowgger(config)

    appender.streamData = [];
    
    const expected = [
      [ 'trace', 'first flow' ],
      [ 'info', '✅,first flow,[0,2,2,4]' ]
    ]    
    
    const flow = flowgger.init("first flow");
    const flow2 = flowgger.init("second flow(1)");
    const flow3 = flowgger.init("second flow(2)");
    
    flow.info("this is the sample flow") //0
    flow.info("until the next condition is true") //2
    flow.info("until the next condition is true") //2
    flow.info("mark it complete") //4
    
    
    flow2.info("this is the also another flow") //0
    flow2.info("until the next condition is true") //2
    flow2.info("mark it complete") //4


    flow3.info("this is wrong step")


    // console.log(appender.streamData);
    expect(appender.streamData).toEqual(expected);
  });
  
  it("should not use appenders for particular types", function() {
    config.appenders[0].onlyFor = undefined;
    config.appenders[0].notFor = {
      types: ["head"]
    }
    const flowgger = new Flowgger(config)

    appender.streamData = [];
    
    const expected = [
      [ 'info', '✅,first flow,[0,2,2,4]' ],
      [ 'info', '✅,second flow(1),[0,2,4]' ],
      [ 'error', 'invalid step: this is wrong step,-1' ],
      [ 'info', '❌,second flow(2),[]' ]
    ]    
    
    const flow = flowgger.init("first flow");
    const flow2 = flowgger.init("second flow(1)");
    const flow3 = flowgger.init("second flow(2)");
    
    flow.info("this is the sample flow") //0
    flow.info("until the next condition is true") //2
    flow.info("until the next condition is true") //2
    flow.info("mark it complete") //4
    
    
    flow2.info("this is the also another flow") //0
    flow2.info("until the next condition is true") //2
    flow2.info("mark it complete") //4


    flow3.info("this is wrong step")


    // console.log(appender.streamData);
    expect(appender.streamData).toEqual(expected);
  });
  
  it("should use appenders onlyFor particular types", function() {
    config.appenders[0].notFor = undefined;
    config.appenders[0].onlyFor = {
      types: ["head"]
    }
    const flowgger = new Flowgger(config)

    appender.streamData = [];
    
    const expected = [
      [ 'trace', 'first flow' ],
      [ 'trace', 'second flow(1)' ],
      [ 'trace', 'second flow(2)' ]    
    ]    
    
    const flow = flowgger.init("first flow");
    const flow2 = flowgger.init("second flow(1)");
    const flow3 = flowgger.init("second flow(2)");
    
    flow.info("this is the sample flow") //0
    flow.info("until the next condition is true") //2
    flow.info("until the next condition is true") //2
    flow.info("mark it complete") //4
    
    
    flow2.info("this is the also another flow") //0
    flow2.info("until the next condition is true") //2
    flow2.info("mark it complete") //4


    flow3.info("this is wrong step")


    // console.log(appender.streamData);
    expect(appender.streamData).toEqual(expected);
  });
  
  it("should use appenders onlyFor particular types but not for particular flow", function() {
    config.appenders[0].notFor = {
      flows: ["first flow"]
    };
    config.appenders[0].onlyFor = {
      types: ["head"]
    }
    const flowgger = new Flowgger(config)

    appender.streamData = [];
    
    const expected = [
      [ 'trace', 'second flow(1)' ],
      [ 'trace', 'second flow(2)' ]    
    ]    
    
    const flow = flowgger.init("first flow");
    const flow2 = flowgger.init("second flow(1)");
    const flow3 = flowgger.init("second flow(2)");
    
    flow.info("this is the sample flow") //0
    flow.info("until the next condition is true") //2
    flow.info("until the next condition is true") //2
    flow.info("mark it complete") //4
    
    
    flow2.info("this is the also another flow") //0
    flow2.info("until the next condition is true") //2
    flow2.info("mark it complete") //4


    flow3.info("this is wrong step")


    // console.log(appender.streamData);
    expect(appender.streamData).toEqual(expected);
  });
});
