import { normalizeLinks } from "../src/LinksSupressor.js";

describe("LinkSuppressor", function() {
  it("should remove non-branch steps and create step index", function() {
    const flow = {
      name: 'Sample flow 1',
      headers: { version: '1.0', threshold: '5000' },
      steps: [
        {
          msg: 'condition 1',
          rawMsg: 'condition 1',
          type: 'LOOP',
          indent: 0
        },
        { msg: 'DO A', rawMsg: 'DO A', type: '', indent: 1 },
        {
          msg: 'condition 2',
          rawMsg: 'condition 2',
          type: 'IF',
          indent: 1
        },
        { msg: 'DO D', rawMsg: 'DO D', type: '', indent: 2 },
        { msg: '', rawMsg: '', type: 'STOP', indent: 2 },
        { msg: 'DO B', rawMsg: 'DO B', type: '', indent: 1 },
        { msg: 'DO C', rawMsg: 'DO C', type: '', indent: 0 }
      ],
      links: {
        '0': [ 1, 6 ],
        '1': [ 2 ],
        '2': [ 3, 5 ],
        '3': [ 6 ],
        '5': [ 0 ],
        '6': [ -1 ]
      },
    }
    normalizeLinks(flow);

    const expectedLinks = { 
      '1': [ 3, 5 ], 
      '3': [ 6 ], 
      '5': [ 1, 6 ], 
      '6': [ -1 ] 
    }
    const expectedStepsIndex = { 
      'DO A': 1, 
      'DO D': 3, 
      'DO B': 5, 
      'DO C': 6 
    } 
    // console.log(flow.startSteps);
    // console.log(flow.links);
    // console.log(flow.stepsIndex);

    expect(flow.startSteps.size).toEqual(2);
    expect(flow.startSteps.has(1)).toBeTrue();
    expect(flow.startSteps.has(6)).toBeTrue();
    expect(flow.stepsIndex).toEqual(expectedStepsIndex);
    expect(flow.links).toEqual(expectedLinks);
  });
});