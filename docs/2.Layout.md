# Layout

A log record is passed through the layout fist before it is handed over to the appender. A layout property of an appender configuration can bet set to a pattern string, function, or an instance.

## Pattern String

A pattern string supports following parameters.

- `%TYPE%`: Possible values are HEAD, FLOW, DEBUG, WARN, TRACE, ERROR, FATAL
- `%ID%`: An unique log id which is same for all the log statements for a flow.
- `%TIME%`: Reporting time or start time. By default it is printed in UTC format.
- `%NAME%`: Flow name. It's better to log flow name for easy debugging. 
- `%VERSION%`: Flow version.
- `%STEPS%`: This is the array of step id and their processing time. {0:23, 1:12}
- `%DURATION%`: Total execution time of a flow.
- `%STATUS%`: 1 means success. 0 means fail. Success means that the flow reach to the end step. No matter if any error is reported in between.
- `%PARENT_ID%`: Sub flow are recorded as separated entry. These has parent flow id to find relationship.
- `%PARENT_STEP_ID%`: step id of parent flow before initiating subflow.
- `%ERR_MSG%`: Reason of not failing the flow. It could be caused if a wrong step is logged or your program stuck to complete the flow.
- `$MSG%`: only for extra information
- `$DATA%`: only for extra information
- `$LAST_STEP%`: only for extra information

Values which may contain spaces, are surrounded `[flow name]`.


Appender Config

```js
{
  handler: flowsAppender,
  layout: `%TIME% %ID% %NAME% %VERSION%`,
  onlyFor: {
    types: ["flows"],
    flows: ["second flow(2)", "first flow(0.0.1)"]
  }
}
```

Values of all the attributes are not available for all type of logs. Eg  `%STEPS%` is available only for FLOW type. So you can define different layouts for each log type.
```js
{
  handler: flowsAppender,
  layout: {
    head: `%TIME% %ID% %NAME% %VERSION%`,
    flow: `%TIME% %ID% %NAME% %VERSION% %STATUS%`,
    data: `%TIME% %ID% %MSG%`,
  },
  onlyFor: {
    types: ["flows"],
    flows: ["second flow(2)", "first flow(0.0.1)"]
  }
}
```

## Layout Function

A layout function is called with a log record. With a layout function you control the replacement your own. This good give you the good chance of masking any sensitive information.

```js
function mask(data){
  //..
}

{
  handler: flowsAppender,
  layout: (lr, type) => {
    if(!lr.steps && !lastStepId){//HEAD
      return `[${lr.reportTime}] ${lr.id} [${lr.flowName}] ${lr.version}`;
    }else if(!lastStepId){ //FLOW
      return `[${lr.reportTime}] ${lr.id} [${lr.flowName}] ${lr.version} [${JSON.stringify(lr.steps)}$]`;
    }else{//DATA
      const msg = mask(lr.msg)
      const data = lr.data || mask(lr.data);
      return `[${lr.reportTime}] ${lr.id} ${JSON.stringify(lr.data)}`
    }
  },
  onlyFor: {
    types: ["flows"],
    flows: ["second flow(2)", "first flow(0.0.1)"]
  }
}
```

## Layout Class

Here, you can create log level methods;

```js
class CustomLayout{
  info(lr){}//you need to check for head and flow type
  debug(lr){}
  warn(lr){}
  trace(lr){}
  error(lr){}
  fatal(lr){}
}

```

# PatternLayout

Flowgger internally use `PatternLayout` with following templates. 

```js
{
  head: `%TYPE% %TIME% %ID% %NAME% %VERSION%`,
  flow: `%TYPE% %TIME% %ID% %NAME% %VERSION% %STEPS% %DURATION% %STATUS% %PARENT_ID% %PARENT_STEP_ID% %ERR_MSG%`,
  data: `%TYPE% %TIME% %ID% %LAST_STEP% %MSG% %DATA%`,
}
```

You can use this to override settings like log pattern, regular expressions to mask sensitive data etc.;

```js

const maskRules = [
  {
    regex: /AKIA[0-9A-Z]{16}/g,  // Regex to match
    replacement: "[AWS_KEY_REDACTED]"  // Direct string replacement
  },
  {
    regex: /(\bsk_live_[a-zA-Z0-9]{24,}\b)/g, 
    replacement: (match) => { // Function replacement
      let strToReplace = "";
      //..
      return strToReplace;
    } 
  }
];

import PatternLayout from "@solothought/flowgger/PatternLayout";

const layout = new PatternLayout();
layout.setHeadPattern(customPattern);
layout.setFlowPattern(customPattern);
layout.setDataPattern(customPattern);

layout.setMaskingRules(maskRules);
```