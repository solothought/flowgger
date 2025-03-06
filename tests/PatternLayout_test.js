import PatternLayout from '../src/PatternLayout.js';

describe("PatternLayout", function() {
  let layout;

  beforeEach(function() {
    layout = new PatternLayout();
    layout.setMaskingRules([
      { regex: /\b\d{16}\b/g, replacement: "****-****-****-****" }, // Credit card masking
      { regex: /secret=([a-zA-Z0-9]+)/g, replacement: (match, key) => `secret=***${key.slice(-3)}` } // API key masking
    ]);
  });

  it("should format FLOW message correctly with error message", () => {
    spyOn(Date, "now").and.returnValue(3000); // Mock only Date.now()

    const lr = {
        id: 3,
        reportTime: 1000,
        flowName: "subFlow",
        version: "1.1",
        steps: [[0,1],[1,1]],
        success: true,
        errMsg: "Error Occurred"
    };
    const expected = `FLOW [1970-01-01T00:00:01.000Z] 3 [subFlow] 1.1 0:1>1:1 2000 1   [Error Occurred]`;
    const output = layout.info(lr);

    // console.log(output);
    expect(output).toBe(expected);
  });
  it("should format FLOW message correctly", () => {
      spyOn(Date, "now").and.returnValue(3000); // Mock only Date.now()

      const lr = {
          id: 3,
          reportTime: 1000,
          flowName: "subFlow",
          version: "1.1",
          steps: [[0,1],[1,1]],
          success: true
      };

    const expected = `FLOW [1970-01-01T00:00:01.000Z] 3 [subFlow] 1.1 0:1>1:1 2000 1   `;
    const output = layout.info(lr);
    expect(output).toBe(expected);
  });
  it("should format FLOW message correctly with parent flow", () => {
      spyOn(Date, "now").and.returnValue(3000); // Mock only Date.now()

      const lr = {
          id: 3,
          reportTime: 1000,
          flowName: "subFlow",
          version: "1.1",
          steps: [[0,1],[1,1]],
          success: true,
          parentFlowId: 10,
          parentStepId: 2
      };
      
    const expected = `FLOW [1970-01-01T00:00:01.000Z] 3 [subFlow] 1.1 0:1>1:1 2000 1 10 2 `;
    const output = layout.info(lr);
    expect(output).toBe(expected);
  });

  it("should format TRACE message correctly", () => {
    // spyOn(Date, "now").and.returnValue(3000); // Mock only Date.now()

    const lr = {
        id: 4,
        reportTime: 1000,
        lastStepId: 5,
        msg: "Trace Message",
        data: "Error: issue\n  at line 1\n  at line 2"
    };

    const expected = `TRACE [1970-01-01T00:00:01.000Z] 4 5 [Trace Message] [  at line 1|  at line 2]`;
    const output = layout.trace(lr);
    expect(output).toBe(expected);
  });

  it("should format DEBUG message correctly", () => {
      const lr = {
          id: 5,
          reportTime: 1000,
          lastStepId: 6,
          msg: "Debug Message",
          data: { key: "value" }
      };

      const expected = `DEBUG [1970-01-01T00:00:01.000Z] 5 6 [Debug Message] [{"key":"value"}]`;
      const output = layout.debug(lr);
      expect(output).toBe(expected);
  });

  it("should format DEBUG message correctly with function based masking", () => {
      const lr = {
          id: 5,
          reportTime: 1000,
          lastStepId: 6,
          msg: "Debug Message",
          data: " secret=abcd1234xyz is used to decypher"
      };

      const expected = `DEBUG [1970-01-01T00:00:01.000Z] 5 6 [Debug Message] [ secret=***xyz is used to decypher]`;
      const output = layout.debug(lr);
      expect(output).toBe(expected);
  });
  
  it("should format DEBUG message correctly with string based masking", () => {
      const lr = {
          id: 5,
          reportTime: 1000,
          lastStepId: 6,
          msg: "Debug Message",
          data: "My card is 1234123412341234"
      };

      const expected = `DEBUG [1970-01-01T00:00:01.000Z] 5 6 [Debug Message] [My card is ****-****-****-****]`;
      const output = layout.debug(lr);
      expect(output).toBe(expected);
  });

  it("should format ERROR message correctly", () => {
      const lr = {
          id: 6,
          reportTime: 6000,
          lastStepId: 7,
          msg: "Error Message",
          data: { error: "failed" }
      };

      const expected = `ERROR [1970-01-01T00:00:06.000Z] 6 7 [Error Message] [{"error":"failed"}]`;
      const output = layout.error(lr);
      expect(output).toBe(expected);
  });
  
  it("should format as per custom pattern", () => {
    const layout = new PatternLayout();
    layout.setFlowPattern(`%TIME% %TYPE% %ID% %NAME% %VERSION%`);
    const lr = {
      id: 3,
      reportTime: 1000,
      flowName: "subFlow",
      version: "1.1",
      steps: [[0,1],[1,1]],
      success: true
    };

      const expected = `[1970-01-01T00:00:01.000Z] FLOW 3 [subFlow] 1.1`;
      const output = layout.info(lr);
      expect(output).toBe(expected);
  });
});
