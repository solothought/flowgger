const Logger = require("./../src/SlimoLogger");
const path = require("path");


let streamData = [];
class MyStream {
  constructor() {
  }

  write(chunk, encoding, callback) {
    streamData.push(chunk);
    // callback();
  }
}

describe("Slimo Logger", function() {
  const mystream = new MyStream();
  const logger = new Logger({
    flowDir: path.resolve(__dirname, "./flows"),
    mainStream: [mystream],
    errStream:  [mystream],
    headStream: [mystream],
    dataStream:  [mystream],
  })
  it("should not wait for `end` when a non-branch step points to END", function() {
    streamData = [];
    const logInstance = logger.init("first flow");
    logInstance.log("this is the sample flow")
    logInstance.log("until the next condition is true")
    logInstance.log("until the next condition is true")
    logInstance.log("mark it complete")
    //assert mystream

    expect(streamData[0].endsWith(`${logInstance.flowId}:first flow`)).toBeTrue();
    expect(streamData[1]).toEqual(`${logInstance.flowId}:first flow>0>2>2>4>✅`);
  });

  it("should not error when `end` is called but flow is already ended", function() {
    streamData = [];
    const logInstance = logger.init("first flow");
    logInstance.log("this is the sample flow")
    logInstance.log("until the next condition is true")
    logInstance.log("until the next condition is true")
    logInstance.log("until the next condition is true")
    logInstance.log("mark it complete")
    logInstance.end();
    //assert mystream

    expect(streamData[0].endsWith(`${logInstance.flowId}:first flow`)).toBeTrue();
    expect(streamData[1]).toEqual(`${logInstance.flowId}:first flow>0>2>2>2>4>✅`);
  });

  it("should end flow on `end` when optional steps are in flow", function() {
    streamData = [];
    const logInstance = logger.init("first flow");
    logInstance.log("this is the sample flow")
    logInstance.end();
    //assert mystream

    expect(streamData[0].endsWith(`${logInstance.flowId}:first flow`)).toBeTrue();
    expect(streamData[1]).toEqual(`${logInstance.flowId}:first flow>0>✅`);
  });

  it("should end flow on `end` when optional steps are in flow", function() {
    streamData = [];
    const logInstance = logger.init("first flow");
    logInstance.log("this is the sample flow")
    logInstance.log("until the next condition is true")
    logInstance.end();
    //assert mystream

    expect(streamData[0].endsWith(`${logInstance.flowId}:first flow`)).toBeTrue();
    expect(streamData[1]).toEqual(`${logInstance.flowId}:first flow>0>2>✅`);
  });
  it("should end flow on expiry when optional steps are in flow", function(done) {
    streamData = [];
    const logInstance = logger.init("first flow");
    logInstance.log("this is the sample flow")
    logInstance.log("until the next condition is true")
    //assert mystream
    setTimeout(() => {
      expect(streamData[0].endsWith(`${logInstance.flowId}:first flow`)).toBeTrue();
      expect(streamData[1]).toEqual(`${logInstance.flowId}:first flow>0>2>✅`);
      done();
    }, 500);
  });



});