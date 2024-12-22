import Flowgger from "../src/Flowgger.js";
import path from "path";
import TestAppender from "./TestAppender.js";
import log4js from 'log4js';
import Log4jsAdapter from '../src/Log4jsAdapter.js';
import CsvLayout from '../src/CsvLayout.js';


describe("Flowgger", function() {
  const flowsAppender = new TestAppender();
  const headAppender = new TestAppender();
  const dataAppender = new TestAppender();


  log4js.configure({
    appenders: {
      error: { type: 'console' }
    },
    categories: {
      error: { appenders: ['error'], level: 'error' },
      default: { appenders: ['error'], level: 'error' }
    }
  });
  
  const log4jsErrAppender = new Log4jsAdapter(log4js.getLogger("error"));

  const config = {
    "appenders": [
      {
        handler: flowsAppender,
        layout: lr => { //can be a function or object
          return `${lr.status},${lr.id},${lr.reportTime},${lr.flowName},${lr.steps}`;
        },
        onlyFor: {
          types: ["flows"],
          flows: ["second flow(2)", "first flow"]
        }
      },
      {
        handler: headAppender,
        layout: new CsvLayout(),
        onlyFor: {
          types: ["head"],
          flows: ["second flow(2)", "first flow"]
        }
      },
      {
        handler: dataAppender,
        // layout: logRecord => logRecord, //default
        onlyFor: {
          types: ["data", "error"],
          flows: ["second flow(2)", "first flow"]
        }
      },
      {
        handler: log4jsErrAppender,
        // layout: logRecord => logRecord, //default
        onlyFor: {
          types: ["error"],
          flows: ["second flow(1)"]
        }
      }
    ],
    flow: {
      source: path.resolve("./tests/flows"),
      // maxIdleTime: 200,       //time difference between 2 consecutive steps
    }
  };
  
  const flowgger = new Flowgger(config)

  it("should not wait for 'end' when a non-branch step points to END", function() {
    flowsAppender.streamData = [];
    headAppender.streamData = [];
    dataAppender.streamData = [];
    // errAppender.streamData = [];
    const flow1 = flowgger.init("first flow");
    const flow2 = flowgger.init("second flow(1)");
    flow1.info("this is the sample flow") //0
    flow1.info("until the next condition is true") //2
    flow2.info("this is the sample flow") //0
    flow1.debug("extra info doesnt impact  flow");
    flow1.info("until the next condition is true") //2
    flow1.error("unexpected scenario should also be reported");
    flow2.error("unexpected scenario in second flow");
    flow1.info("mark it complete") //4



    console.log(flowsAppender.streamData);
    console.log(headAppender.streamData);
    console.log(dataAppender.streamData);
    // console.log(errAppender.streamData);
    
    // expect(testAppender.streamData[0].endsWith(`${flow.flowId},${formatDate(flow.flowId)},first flow\n`)).toBeTrue();
    // expect(testAppender.streamData[1]).toEqual(`${flow.flowId},${formatDate(flow.flowId)},first flow,0,2,2,4,✅\n`);
  });

  
});