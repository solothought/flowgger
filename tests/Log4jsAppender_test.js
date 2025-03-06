import Flowgger from "../src/Flowgger.js";
import path from "path";
import log4js from 'log4js';
import Log4jsAdapter from '../src/Log4jsAdapter.js';


describe("Flowgger", function() {
  log4js.configure({
    appenders: {
      all: { type: 'console' }
    },
    categories: {
      all: { appenders: ['all'], level: 'all' },
      default: { appenders: ['all'], level: 'all' }
    }
  });
  const log4jsLogger = log4js.getLogger("all")
  const log4jsErrAppender = new Log4jsAdapter(log4jsLogger);

  const config = {
    "appenders": [
      {
        handler: log4jsErrAppender,
      }
    ],
    flow: {
      source: path.resolve("./tests/flows"),
    }
  };
  
  const flowgger = new Flowgger(config)

  it("should not wait for 'end' when a non-branch step points to END", function() {

    // log4jsLogger.on('log', (...args) =>{
    //   console.log(args)
    // })
    const logger = flowgger.init("first flow");
    logger.info("this is the sample flow") //0
    logger.info("until the next condition is true") //2
    logger.debug("extra info doesnt impact  flow");
    logger.info("until the next condition is true") //2
    logger.error("unexpected error");
    logger.trace("unexpected trace");
    logger.info("mark it complete") //4

    logger.end()
  });

  
});