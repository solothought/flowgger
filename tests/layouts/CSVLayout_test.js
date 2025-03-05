import CsvLayout from "../../src/CsvLayout.js";
import {stringify} from "../../src/util.js";

describe("CsvLayout", () => {
  let csvLayout;

  beforeEach(() => {
      csvLayout = new CsvLayout();
  });

  it("should format HEAD message correctly", () => {
      const lr = { id: 1, reportTime: 1000, flowName: "testFlow", version: "1.0" };
      expect(csvLayout.info(lr)).toBe("HEAD,1,1000,testFlow,1.0");
  });

  it("should format HEAD message with parentFlowId", () => {
      const lr = { id: 2, reportTime: 2000, flowName: "mainFlow", version: "2.0", parentFlowId: 10, parentStepId: 2 };
      expect(csvLayout.info(lr)).toBe("HEAD,2,2000,mainFlow,2.0,10,2");
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

    const output = csvLayout.info(lr);
    expect(output).toBe('FLOW,3,1000,subFlow,1.1,0:1|1:1,2000,1,,,Error Occurred');
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

    const output = csvLayout.info(lr);
    expect(output).toBe('FLOW,3,1000,subFlow,1.1,0:1|1:1,2000,1,,,');
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

    const output = csvLayout.info(lr);
    expect(output).toBe('FLOW,3,1000,subFlow,1.1,0:1|1:1,2000,1,10,2,');
  });

  it("should format TRACE message correctly", () => {
      const lr = {
          id: 4,
          reportTime: 4000,
          lastStepId: 5,
          msg: "Trace Message",
          data: "Error: issue\n  at line 1\n  at line 2"
      };

      expect(csvLayout.trace(lr)).toBe(
          'TRACE,4,4000,5,Trace Message,"""  at line 1|  at line 2"""'
      );
  });

  it("should format DEBUG message correctly", () => {
      const lr = {
          id: 5,
          reportTime: 5000,
          lastStepId: 6,
          msg: "Debug Message",
          data: { key: "value" }
      };

      expect(csvLayout.debug(lr)).toBe(
          'DEBUG,5,5000,6,Debug Message,"{""key"":""value""}"'
      );
  });

  it("should format ERROR message correctly", () => {
      const lr = {
          id: 6,
          reportTime: 6000,
          lastStepId: 7,
          msg: "Error Message",
          data: { error: "failed" }
      };

      expect(csvLayout.error(lr)).toBe(
          'ERROR,6,6000,7,Error Message,"{""error"":""failed""}"'
      );
  });
});