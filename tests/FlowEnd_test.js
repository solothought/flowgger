import Flowgger from "../src/Flowgger.js";
import path from "path";
import TestAppender from "./TestAppender.js";

function flowName(lr){
  if(lr.version || lr.version === 0)
    return `${lr.flowName}(${lr.version})`;
  else
    return lr.flowName;
}

describe("Flowgger", function() {
  const appender = new TestAppender();

  const config = {
      "appenders": [
        {
          handler: appender,
          layout: (lr,lvl) => { //can be a function or object
            const fName = flowName(lr)
            if(lvl === "trace"){
              return fName;
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
    
    const flowgger = new Flowgger(config)

  it("should not wait for 'end' when a non-branch step points to END", function() {
    appender.streamData = [];
    
    const expected = [
      [ 'trace', 'first flow' ],
      [ 'info', 'true,first flow,[0,2,2,4]' ]
    ]
    
    const flow = flowgger.init("first flow");

    flow.info("this is the sample flow") //0
    flow.info("until the next condition is true") //2
    flow.info("until the next condition is true") //2
    flow.info("mark it complete") //4


    // console.log(appender.streamData);
    expect(appender.streamData).toEqual(expected);
  });

  it("should not error when 'end' is called but flow is already ended", function() {
    appender.streamData = [];
    const expected = [
      [ 'trace', 'first flow' ],
      [ 'info', 'true,first flow,[0,2,2,2,4]' ]
    ]

    const logInstance = flowgger.init("first flow");
    logInstance.info("this is the sample flow")
    logInstance.info("until the next condition is true")
    logInstance.info("until the next condition is true")
    logInstance.info("until the next condition is true")
    logInstance.info("mark it complete")
    logInstance.end();
    
    // console.log(appender.streamData);
    expect(appender.streamData).toEqual(expected);
  });

  it("should end flow on 'end' when last step points to end and non-end steps", function() {
    appender.streamData = [];
    const expected = [
      [ 'trace', 'first flow' ],
      [ 'info', 'true,first flow,[0,2]' ]
    ]

    const logInstance = flowgger.init("first flow");
    logInstance.info("this is the sample flow")
    logInstance.info("until the next condition is true")
    logInstance.end();

    // console.log(appender.streamData);
    expect(appender.streamData).toEqual(expected);
  });

  xit("should end flow on expiry when optional steps are in flow", function(done) {
    //This is an edge case. User is expected to end flow with ending step or end()
    appender.streamData = [];
    const expected = [
      [ 'trace', 'first flow' ],
      [ 'info', 'true,first flow,[0,2]' ]
    ]

    const logInstance = flowgger.init("first flow");
    logInstance.info("this is the sample flow")
    logInstance.info("until the next condition is true")

    setTimeout(() => {
      // console.log(appender.streamData);
      expect(appender.streamData).toEqual(expected);
      done();
    }, 500);
  });
});
