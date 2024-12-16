Flowgger has following classes;

- Flowgger
- FlowLogger
- LogProcessor
- FlowsReader
- StreamHandler

`Flowgger` is user facing class. It uses `FlowLogger` to read pre defined flows and parse them. It sets up `LogProcessor` for processing and it returns an object of `FlowLogger` every time user enters into a flow.

This is the summary of a complete application.
```
ENTITY: Flowgger
Read flows from `.stflow` files. 
Refine flows to be used by LogProcessor.
- LogProcessor
- FlowsReader
ON init
  register a flow to be traced
  END with :FlowLogger: instance (to be used by users)

ENTITY: FlowLogger
Handle flow-level logging
register a flow with LogProcessor
record an entry in head stream
- LogProcessor
ON info
  record log msg to main stream (logProcessor.record)
ON error
  record to err stream (logProcessor.recordErr)
ON warn
  record extra data (logProcessor.recordData)
ON debug
  record extra data (logProcessor.recordData)
ON fatal
  dump all the in-memory flows to err stream (logProcessor.flushAll)
ON end
  end a flow (to persist and free memory (logProcessor.end))

ENTITY: LogProcessor
Core log processing, log matching, log persistance
- StreamHandler
- FlowLog (data for running flow)
- 
ON register (flow name, header key)
  save a flow in-memory
  set next expected step ids (first step)
  report to head stream (persist immediately to avoid missing log in case of unexpected failure)

ON record (msg)
  compare msg with expectedSteps
  IF dead-end step
    FOLLOW flush
  ELSE IF msg doesn't match
    mark the flow as failed
    FOLLOW flush
  ELSE msg with one of the expected steps
    set next expected steps

ON end
  IF FLOW is not already ended
    IF last step was end step
      FOLLOW flush
    ELSE
      mark the  flow as failed
      FOLLOW flush

ON flush
  write log msg to main stream
  remove flow log from memory

ON Flush all
  write all flow logs to error stream
  remove all flow logs

ENTITY StreamHandler
ON addStream (name, stream)
  add a stream with name
ON async log (steamName, msg)
  log a msg to a stream
  //TODO: batch processing
  log a msg to stream's queue for logging
  FOLLOW .processQueue
ON processQueue
  LOOP msg in queue
    FOLLOW .writeToStream
ON writeToStream
  IF data type is string
    write to stream
  ElSE
    FOLLOW .writeData
ON writeData
  write object/array to stream
  # TODO: handle cycle reference

```

This is how a user will use it.
```js
const Flowgger = require("@solothought/flowgger");
const flowgger = new Flowgger(config);

const flow = flowgger.init("flowname");
flow.info("step in the flow");
//..
const subflow = flowgger.init("subflowname", flow);
subflow.info("another flow step");

subflow.end();
flow.end();
```

# Configuration

```js
{
  "logging": {
    "streams": {
      "flows": ["fileAppender1", "consoleAppender"],
      "head": ["fileAppender1"],
      "data": ["consoleAppender"],
      "error": ["fileAppender1", "consoleAppender"]
    },
    "appenders": {
      "fileAppender1": {
        "handler": new Handler(handlerConfig),
        "onlyFor": { "env": ["dev"] }
      },
      "consoleAppender": {
        "handler": new ConsoleAppender(someconfg),
        "notFor": { "flows": ["flowname"] }
      }
    }
  },
  "flow": {
    "source": "/dir/path"
    "maxIdleTime": 200,
    "maxFlowsCapacity": 1000
  },
  "layout": {
    "stepDuration": "EXCEED"
  }
}


```