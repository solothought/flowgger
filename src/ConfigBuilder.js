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
    // discriminationHeader: "version",
    maxIdleTime: 200,       //time difference between 2 consecutive steps
    maxFlowsCapacity: 1000  //active flows. TODO: manage number of open active flows in memory
  },
  layout: {
    stepDuration: "EXCEED" // ALWAYS, NEVER
  }
};

export function validateConfig(config) {
  if (!config.logging || !config.logging.streams || !Array.isArray(config.logging.streams.flows)) {
    throw new Error('Mandatory property logging.streams.flows is missing or not an array.');
  }
  if (!config.flow || typeof config.flow.source !== 'string') {
    //TODO: let user add content as string
    throw new Error('Mandatory property flow.source is missing or not a string.');
  }

  const appenders = config.logging.appenders || {};
  Object.keys(config.logging.streams).forEach(stream => {
    config.logging.streams[stream].forEach(appenderName => {
      if (!appenders[appenderName]) {
        throw new FlowggerError(`Appender '${appenderName}' specified in streams.${stream} not defined in appenders.`);
      }
    });
  });
  Object.values(config.logging.appenders).forEach(appender => {
    if ('onlyFor' in appender && 'notFor' in appender) {
      throw new FlowggerError('Appender cannot have both onlyFor and notFor filters.');
    }
  });
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
