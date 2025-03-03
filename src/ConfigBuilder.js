import FlowggerError from "./FlowggerError.js";

// const fileAppender = {
//   handler: new FileAppender({
//     outputDir: "path/to/dir",
//     // fileName: "path/to/dir/file",
//     rollOn: "size", // hourly, daily, undefined
//     maxLogSize: 1024, //KB, if rollOn: "size"
//   }),
//   onlyFor: { //not valid with notFor
//     env: ["dev"], //* for all
//     flows: ["name of flow"] //* for all
//   },
//   notFor: { //not valid with onlyIf
//     env: ["dev"], //* for all
//     flows: ["name of flow"] //* for all
//   }
// };

export const deaultConfig = {
  "logging": {
    "streams": {
      "flows": [],
      "head": [],
      "data": [],
      "error": []
    },
    "appenders": {}
  },
  flow: {
    // source: "input/dir",
    // maxIdleTime: 200,       //time difference between 2 consecutive steps
    // maxFlowsCapacity: 1000  //active flows. TODO: manage number of open active flows in memory
  },
  layout: {
    // stepDuration: "EXCEED" // ALWAYS, NEVER
  }
};

export function validateConfig(config) {
  const hasFlowsAppender = config.appenders.some(appenderConfig => {
    const onlyForTypes = appenderConfig.onlyFor?.types || [];
    const notForTypes = appenderConfig.notFor?.types || [];

    if (onlyForTypes.includes('flows') || !notForTypes.includes('flows')) {
      return true;
    }else return false;
  });

  if (!hasFlowsAppender) {
    throw new FlowggerError("No appender supports 'flows' type.");
  }

  //All appender must have 'append' method
  config.appenders.forEach(appenderConfig => {
    if(!appenderConfig.handler || !appenderConfig.handler.append){
      throw new FlowggerError("Invalid handler. Appender must have 'append' method");
    }
    if(appenderConfig.layout){
      appenderConfig.handler.layout = appenderConfig.layout
    }else{
      appenderConfig.handler.layout = a => a;
    }
  })

  if (!config.flow || typeof config.flow.source !== 'string') {
    //TODO: let user add content as string
    throw new FlowggerError('Mandatory property flow.source is missing or not a string.');
  }
}

export function deepMerge(target, ...sources) {
  sources.forEach(source => {
    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = target[key];

      // Check if sourceValue is an object or array
      if (Array.isArray(sourceValue)) {
        // Handle arrays: merge or replace
        target[key] = Array.isArray(targetValue)
          ? [...targetValue, ...sourceValue] // Concatenate arrays
          : [...sourceValue]; // Overwrite if target is not an array
      } else if (typeof sourceValue === 'object' && sourceValue !== null) {
        // Handle objects: recursive merge
        if (typeof targetValue === 'object' && targetValue !== null && !Array.isArray(targetValue)) {
          deepMerge(targetValue, sourceValue);
        } else {
          target[key] = {};
          deepMerge(target[key], sourceValue);
        }
      } else {
        // Handle primitive values
        target[key] = sourceValue;
      }
    }
  });

  return target;
}
