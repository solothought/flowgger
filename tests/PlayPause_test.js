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
            // console.debug(lr);
            const fName = `${lr.flowName}(${lr.version})`;

            if(lvl === "trace"){
              return fName;
            }else if(lvl === "error"){
              return `${lr.msg},${lr.lastStepId}`;
            }else if(lvl === "debug"){
              return `${lr.msg},${lr.lastStepId}`;
            }else{
              //remove exec time
              const seq = [];
              lr.steps.forEach(result => {
                seq.push(result[0]);
              })
              return `${lr.success},${fName},[${seq}]`;
            }
          }
        }
      ],
      flow: {
        source: path.resolve("./tests/flows"),
      }
    };
    
    

  it("should pause logs for particular key", function() {

    const flowgger = new Flowgger(config)

    appender.streamData = [];
    
    const expected = [
      [ 'trace', 'first flow(0.0.1)' ],
      [ 'trace', 'second flow(1)' ],
      [ 'trace', 'second flow(2)' ],
      // [ 'debug', 'extra info 1,2' ], //paused
      [ 'debug', 'extra info 2,2' ],
      [ 'debug', 'extra info 3,2' ],
      [ 'info', 'true,first flow(0.0.1),[0,2,2,4]' ],
      [ 'debug', 'extra info 4,0' ],
      [ 'debug', 'extra info 5,0' ],
      [ 'debug', 'extra info 7,0' ],
      [ 'info', 'true,second flow(1),[0,2,4]' ],
      [ 'error', 'invalid step: this is wrong step,-1' ],
      [ 'info', 'false,second flow(2),[]' ]
    ]    
    
    const flow = flowgger.init("first flow");
    const flow2 = flowgger.init("second flow",1);
    const flow3 = flowgger.init("second flow",2);
    
    flow.info("this is the sample flow") //0
    flow.info("until the next condition is true") //2
    flow.debug("extra info 1", null, "abc"); //by default paused
    flowgger.play({
      keys: ["abc", "mno"]
    })
    flow.debug("extra info 2", null, "abc"); //playing
    flow.info("until the next condition is true") //2
    flow.debug("extra info 3", null, "mno"); //playing
    flow.info("mark it complete") //4
    
    
    flow2.info("this is the also another flow") //0
    flow2.debug("extra info 4", null, "abc"); //playing
    flow2.debug("extra info 5", null, "mno"); //playing
    flowgger.pause({
      keys: ["abc"]
    })
    flow2.debug("extra info 6", null, "abc"); //paused
    flow2.debug("extra info 7", null, "mno"); //playing
    flow2.info("until the next condition is true") //2
    flow2.info("mark it complete") //4


    flow3.info("this is wrong step")


    // console.log(appender.streamData);
    expect(appender.streamData).toEqual(expected);
  });

  it("should pause logs for particular flow", function() {

    const flowgger = new Flowgger(config)

    appender.streamData = [];
    
    const expected = [
      [ 'trace', 'first flow(0.0.1)' ],
      [ 'trace', 'second flow(1)' ],
      [ 'trace', 'second flow(2)' ],
      [ 'debug', 'extra info 1,2' ],
      [ 'info', 'true,first flow(0.0.1),[0,2,2,4]' ],
      [ 'debug', 'extra info 6,0' ],
      [ 'info', 'true,second flow(1),[0,2,4]' ],
      [ 'error', 'invalid step: this is wrong step,-1' ],
      [ 'info', 'false,second flow(2),[]' ]
    ]    
    
    const flow = flowgger.init("first flow");
    const flow2 = flowgger.init("second flow",1);
    const flow3 = flowgger.init("second flow",2);
    
    flow.info("this is the sample flow") //0
    flow.info("until the next condition is true") //2
    flowgger.play({
      keys: ["abc","mno"]
    })
    flow.debug("extra info 1", null, "abc");
    flowgger.pause({
      flows: ["second flow(1)","first flow(0.0.1)"]
    })
    flow.debug("extra info 2", null, "abc");
    flow.info("until the next condition is true") //2
    flow.debug("extra info 3",null,  "mno");
    flow.info("mark it complete") //4
    
    
    flow2.info("this is the also another flow") //0
    flow2.debug("extra info 4", null, "abc");
    flow2.error("extra info 5");
    flowgger.play({
      flows: ["second flow(1)", "second flow(2)"]
    })
    flow2.debug("extra info 6", null, "abc");
    flow2.info("until the next condition is true") //2
    flow2.info("mark it complete") //4


    flow3.info("this is wrong step")


    // console.log(appender.streamData);
    expect(appender.streamData).toEqual(expected);
  });
  
  it("should pause logs for particular level", function() {

    const flowgger = new Flowgger(config)

    appender.streamData = [];
    
    const expected = [
      [ 'trace', 'first flow(0.0.1)' ],
      [ 'trace', 'second flow(1)' ],
      [ 'trace', 'second flow(2)' ],
      // [ 'debug', 'extra info 1,2' ],
      [ 'info', 'true,first flow(0.0.1),[0,2,2,4]' ],
      [ 'error', 'extra info 5,0' ],
      [ 'debug', 'extra info 6,0' ],
      [ 'info', 'true,second flow(1),[0,2,4]' ],
      [ 'error', 'invalid step: this is wrong step,-1' ],
      [ 'info', 'false,second flow(2),[]' ]
    ]    
    
    const flow = flowgger.init("first flow");
    const flow2 = flowgger.init("second flow",1);
    const flow3 = flowgger.init("second flow",2);
    
    flow.info("this is the sample flow") //0
    flow.info("until the next condition is true") //2
    flow.debug("extra info 1", null, "abc"); //paused
    flowgger.play({
      keys: ["abc", "mno"]
    })
    flowgger.pause({
      types: ["data"]
    })
    flow.debug("extra info 2", null, "abc"); //paused
    flow.info("until the next condition is true") //2
    flow.warn("extra info 3", null, "mno"); //paused
    flow.info("mark it complete") //4
    
    
    flow2.info("this is the also another flow") //0
    flow2.debug("extra info 4", null, "abc");
    flow2.error("extra info 5");
    flowgger.play({
      types: ["data"]
    })
    flow2.debug("extra info 6",null,  "abc");
    flow2.info("until the next condition is true") //2
    flow2.info("mark it complete") //4


    flow3.info("this is wrong step")


    // console.log(appender.streamData);
    expect(appender.streamData).toEqual(expected);
  });
});