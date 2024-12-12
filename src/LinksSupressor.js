import {branchTypes} from "./constants.js";

function findStartSteps(flow){
  let start = new Set();
  const stack = [0];
  const visited = new Set();
  while(true){
    const link = stack.pop();

    if (visited.has(link)) continue; // Skip already processed steps
    visited.add(link);
      
    if(branchTypes.has(flow.steps[link].type)){
      flow.links[link].forEach( stepId => {
        stack.push(stepId);
      });
    }else{
      start.add(link);
    }
    if(stack.length === 0) break;
  }
  return start;
}

/**
 * Remove branch steps to reduce total number of steps
 * Add step index for direct access
 * add startSteps
 * @param {{steps:object[],links:object} flow 
 * @returns {{steps:object[],links:object,startSteps:Set,stepsIndex:object}}
 */
export function normalizeLinks(flow) {
  flow.startSteps = Array.from(findStartSteps(flow));
  const { steps, links } = flow;
  const stepsIndex = {};
  const suppressedLinks= {};//links for non-branch steps only
  
  steps.forEach((step, index) => {
    if(!branchTypes.has(step.type) && links[index]){
      stepsIndex[step.msg] = index;
      suppressedLinks[index] = [];
    }
  });

  function findNonBranchStep(id) {
    if (id === -1 || !branchTypes.has(steps[id].type)) {
      return [id];
    }

    // Resolve branch links recursively
    let resolved = [];
    links[id].forEach((target) => {
      const resolvedTargets = findNonBranchStep(target);
      // console.log(resolvedTargets)
      resolved = resolved.concat(resolvedTargets);
    });

    return resolved;
  }

  for(let link in suppressedLinks){
    let resolved = [];
    links[link].forEach((target) => {
        const resolvedTargets = findNonBranchStep(target);
        // console.log(resolvedTargets)
        resolved = resolved.concat(resolvedTargets);
    });
    suppressedLinks[link] = resolved;
  }

  flow.stepsIndex = stepsIndex;
  flow.links = suppressedLinks;
}