import Flowgger from "../src/Flowgger.js";
import path from "path";
import TestAppender from "./TestAppender.js";

describe("Subflows", function() {
  const appender = new TestAppender();
  
    const config = {
        "appenders": [
          {
            handler: appender,
            layout: (lr,lvl) => { //can be a function or object
              // console.debug(lr);
              const fName = `${lr.flowName}(${lr.version})`;
  
              if(lvl === "info" && !lr.steps){
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

  it("should handle subflows correctly", function() {
    const flowgger = new Flowgger(config);
    appender.streamData = [];

    const expected = [
      [ 'info', 'Binary Search(0.0.1)' ],
      [ 'info', 'update boundaries(0.0.1)' ],
      [ 'info', 'true,update boundaries(0.0.1),[1]' ], //sub flows are logged before main flow
      [ 'info', 'true,Binary Search(0.0.1),[1,2,4,9]' ]
    ];

    const flow = flowgger.init("Binary Search");
    
    flow.info("read low");
    flow.info("read high");
    flow.info("calculate mid");
    flow.info("update boundaries");
    const subflow = flowgger.init("update boundaries","0.0.1",flow);
    subflow.info("update low to mid + 1");
    // subflow.end(); //ending a flow is optional when end step is already called
    flow.end();
    
    // console.log(appender.streamData);

    expect(appender.streamData).toEqual(expected);
  });
  
  it("should fail main flow when subflow fails", function() {
    const flowgger = new Flowgger(config);
    appender.streamData = [];

    const expected = [
      [ 'info', 'Binary Search(0.0.1)' ],
      [ 'info', 'update boundaries(0.0.1)' ],
      [ 'error', 'Flow is ended before taking any step,-1' ],
      [ 'info', 'false,update boundaries(0.0.1),[]' ],
      [ 'info', 'false,Binary Search(0.0.1),[1,2,4,9]' ]
    ];

    const flow = flowgger.init("Binary Search");
    
    flow.info("read low");
    flow.info("read high");
    flow.info("calculate mid");
    flow.info("update boundaries");
    const subflow = flowgger.init("update boundaries","0.0.1",flow);
    // subflow.info("update low to mid + 1");
    subflow.end();
    flow.end();
    
    // console.log(appender.streamData);
    expect(appender.streamData).toEqual(expected);
  });

  it("should fail main flow if it fails and further steps of main flow will error", function() {
    const flowgger = new Flowgger(config);
    appender.streamData = [];

    const expected = [
      [ 'info', 'Binary Search(0.0.1)' ],
      [ 'info', 'update boundaries(0.0.1)' ],
      [ 'error', 'Flow is ended before taking any step,-1' ],
      [ 'info', 'false,update boundaries(0.0.1),[]' ],
      [ 'info', 'false,Binary Search(0.0.1),[1,2,4,9]' ],
      [ 'error', 'Unexpected step: read low,9' ],
      [ 'error', 'Unexpected step: read high,9' ],
      [ 'error', 'Unexpected step: calculate mid,9' ],
      [ 'error', 'Unexpected step: update boundaries,9' ]
    ];

    const flow = flowgger.init("Binary Search");
    
    flow.info("read low");
    flow.info("read high");
    flow.info("calculate mid");
    flow.info("update boundaries");
    const subflow = flowgger.init("update boundaries","0.0.1",flow);
    // subflow.info("update low to mid + 1");
    subflow.end();
    flow.info("read low");
    flow.info("read high");
    flow.info("calculate mid");
    flow.info("update boundaries");
    flow.end();
    
    // console.log(appender.streamData);
    expect(appender.streamData).toEqual(expected);
  });
});