import parse from "@solothought/text2obj/flow";
import FlowggerError from "./FlowggerError.js";
import fs from "fs";
import path from "path";
import {branchTypes} from "./constants.js";
import {normalizeLinks} from "./LinksSupressor.js"
import {isValidDir} from "./util.js"

export default class FlowsReader{
  constructor(config){
    if(!isValidDir(config.flow.source)) throw new FlowggerError(`Invalid directory path: ${config.flow.source}`);
    if(!config.queuesCount) config.queuesCount = 4;
    this.config = config;
    this.flows = {};
    this.minExecTime = 0;
    this.maxExecTime = 0; //ms
  }

  readFlows(){
    //TODO: support nested directory structure
    fs.readdirSync(this.config.flow.source).forEach(file => {
      if(!file.endsWith(".stflow")) return;
      console.log(`reading ${file}`);
      try{
        const content = fs.readFileSync(path.resolve(this.config.flow.source,file)).toString();
        this.#addFlow(parse(content));
      }catch(e){
        throw new FlowggerError(e);
      }
    });
    // this.#distributeFlowsToQueues();
  }

  #addFlow(moreFlows){
    const dHeader = "version";
    const newFlows = {};
    // const flowNames = Object.keys(this.flows);
    moreFlows.forEach( flow => {
      checkForValidBranches(flow.steps, flow.name);
      normalizeLinks(flow);
      addStreamsProperty(flow);
      //version is mandatory
      if(!flow.headers[dHeader]) flow.headers[dHeader] = "0.0.1";
      flow.uName = `${this.config.storeKeyPrefix}${flow.name}(${flow.headers[dHeader]})`;;
      newFlows[flow.uName] = flow;
      this.#updateExecutionTime(flow);
    });
    this.flows = Object.assign(this.flows,newFlows);
  }

  #updateExecutionTime(flow){
    flow.headers["maxExecTime"] = flow.headers["maxExecTime"] || 10000;
    if(flow.headers["maxExecTime"] === -1) { //no expiry
    } else if(this.minExecTime === -1) {
      this.minExecTime = flow.headers["maxExecTime"];
      this.maxExecTime = flow.headers["maxExecTime"];
    }else{
      // flow.queue = 0; //default queue
      this.minExecTime = this.minExecTime < flow.headers["maxExecTime"] ? this.minExecTime : flow.headers["maxExecTime"];
      this.maxExecTime = this.maxExecTime > flow.headers["maxExecTime"] ? this.maxExecTime : flow.headers["maxExecTime"];
    }
  }

  // #distributeFlowsToQueues(){
  //   const rangeWidth = (this.maxExecTime - this.minExecTime) / this.config.queuesCount;

  //   // Categorize objects into appropriate queues
  //   this.flows.forEach(flow => {
  //     if(flow.maxExecTime === -1) flow.queueNum = -1; //no expiry
  //     else{
  //       const queueIndex = Math.min(
  //         Math.floor((flow.headers["maxExecTime"] - this.minExecTime) / rangeWidth),
  //         this.config.queuesCount - 1 // Ensure objects with maxExecutionTime go into the last queue
  //       );
  //       flow.queueNum = queueIndex;
  //     }
  //   });
  // }
}

/**
 * A branch step should have nested steps
 * @param {{type:string,indent:number}[]} steps 
 * @param {string} flowname 
 */
function checkForValidBranches(steps, flowname){
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if(branchTypes.has(step.type)){
      if(steps.length >= i+1 && step.indent >= steps[i+1].indent){
        // console.debug(step.indent, steps[i+1].indent)
        throw new FlowggerError(`Incomplete branch step(${i}, ${step.type}) in ${flowname}`);
      }
    }
  }
}

function addStreamsProperty(flow){
  flow.streams = {
    "flows": [],
    "head": [],
    "data": [],
    "error": []
  }

}