import Flowgger from "../src/Flowgger.js";
import FlowggerError from "../src/FlowggerError.js";
import path from "path";
import TestAppender from "./TestAppender.js";

describe("Flowgger", function() {
  const appender = new TestAppender();

  const config = {
      "appenders": [
        {
          handler: appender,
          layout: (lr,lvl) => { //can be a function or object
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
              return `${lr.success},${fName},[${seq}],${lr.errMsg}`;
            }
    
          }
        }
      ],
      flow: {
        source: path.resolve("./tests/flows"),
      }
    };
    
    const flowgger = new Flowgger(config)

    it("should error when reading invalid flow", function() {
      expect(() => {
        flowgger.init("flow doesnt exist");
      }).toThrow(new FlowggerError("Invalid Flow name: flow doesnt exist, or version"));
  
    });
    
    it("should error and flush all logs", function() {
      appender.streamData = [];
      const expected = [
        [ 'info', 'first flow(0.0.1)' ],
        [ 'info', 'second flow(2)' ],
        [ 'info', '3rd flow(1)' ],
        [ 'info', 'false,first flow(0.0.1),[0],Shutting down the application'],
        [ 'info', 'false,second flow(2),[0],Shutting down the application' ],
        [ 'info', 'false,3rd flow(1),[],Shutting down the application' ]
      ]

      const f1 = flowgger.init("first flow");
      f1.info("this is the sample flow")
      
      const f2 = flowgger.init("second flow",2);
      f2.info("this is the another flow")
      
      const f3 = flowgger.init("3rd flow",1);
      // f3.info("first step")
  
      flowgger.flush("Shutting down the application");
  
      f1.end();
  
      // console.log(appender.streamData);
      expect(appender.streamData).toEqual(expected);
    });
  });