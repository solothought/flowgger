import LogProcessor from "./LogProcessor.js";
import FlowLogger from "./FlowLogger.js";
import FlowsReader from "./FlowsReader.js";
import {deaultConfig, validateConfig} from "./ConfigBuilder.js";



/**
 * Read flows from .stflow file once.
 * Give an instance of logger to log msg for each flow
 */
export default class Flowgger {
  constructor(userConfig = {}) {
    this.config = Object.assign({}, deaultConfig, userConfig);
    // this.config = deepMerge({}, deaultConfig, userConfig);
    // console.log(this.config);
    validateConfig(this.config);

    //read flows
    const flowsReader = new FlowsReader(this.config);
    flowsReader.readFlows();
    attacheAppenderToFlow(flowsReader.flows, this.config);
    
    // console.debug(flowsReader.flows);
    this.logProcessor = new LogProcessor(this.config, flowsReader.flows);
  }

  init(flowName, flowKey = "", parentFlow){
    return new FlowLogger(flowName, flowKey, this.logProcessor, parentFlow);
  }

  play(config){
    this.logProcessor.play(config);
  }
  pause(config){
    this.logProcessor.pause(config);
  }
}

/**
   * attach appender from config to a flow.
   * purpose: 
   * 1) user can have different appenders for each flow 
   * 2) need not to find relevant appender at run time 
   * @param {object} flows 
   */
function attacheAppenderToFlow(flows, loggingConfig) {
  const env = process.env.NODE_ENV || 'default';

  for (const flowName in flows) {
    const flow = flows[flowName];

    loggingConfig.appenders.forEach(appenderConfig => {
      if (shouldAttachAppender(appenderConfig, flow, env)) {
        const types = appenderConfig.onlyFor?.types || [];

        types.forEach(type => {
          if (!flow.streams[type]) {
            flow.streams[type] = [];
          }
          flow.streams[type].push(appenderConfig.handler);
        });
      }
    });
  }
}

/**
 * Filter appenders out based on configuration at the time application startup
 * @param {object} appenderConfig appender config 
 * @param {object} flow 
 * @param {string} env 
 * @returns 
 */
function shouldAttachAppender(appenderConfig, flow, env) {
  if ('onlyFor' in appenderConfig) {
    if (appenderConfig.onlyFor.env 
      && !appenderConfig.onlyFor.env.includes(env) 
      && !appenderConfig.onlyFor.env.includes('*')) {
      return false;
    }
    if (appenderConfig.onlyFor.flows 
      && !appenderConfig.onlyFor.flows.includes(flow.name) 
      && !appenderConfig.onlyFor.flows.includes(flow.uName) 
      && !appenderConfig.onlyFor.flows.includes('*')) {
      return false;
    }
  }
  if ('notFor' in appenderConfig) {
    if (appenderConfig.notFor.env 
      && (appenderConfig.notFor.env.includes(env) 
        || appenderConfig.notFor.env.includes('*'))) {
      return false;
    }
    if (appenderConfig.notFor.flows 
      && (appenderConfig.notFor.flows.includes(flow.name) 
        || appenderConfig.notFor.flows.includes(flow.uName) 
        || appenderConfig.notFor.flows.includes('*'))) {
      return false;
    }
  }
  return true;
}