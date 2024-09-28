const Logger = require("./../src/SlimoLogger");
const path = require("path");
const {formatDate} = require("./../src/util");

let streamData = [];
class MyStream {
  constructor() {
  }

  write(chunk, encoding, callback) {
    // console.log(chunk)
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
    logInstance.info("this is the sample flow")
    logInstance.info("until the next condition is true")
    logInstance.info("until the next condition is true")
    logInstance.info("mark it complete")
    //assert mystream
    // console.log(streamData);
    
    expect(streamData[0].endsWith(`${logInstance.flowId},${formatDate(logInstance.flowId)},first flow\n`)).toBeTrue();
    expect(streamData[1]).toEqual(`${logInstance.flowId},${formatDate(logInstance.flowId)},first flow,0,2,2,4,✅\n`);
  });

  it("should not error when `end` is called but flow is already ended", function() {
    streamData = [];
    const logInstance = logger.init("first flow");
    logInstance.info("this is the sample flow")
    logInstance.info("until the next condition is true")
    logInstance.info("until the next condition is true")
    logInstance.info("until the next condition is true")
    logInstance.info("mark it complete")
    logInstance.end();
    //assert mystream

    expect(streamData[0].endsWith(`${logInstance.flowId},${formatDate(logInstance.flowId)},first flow\n`)).toBeTrue();
    expect(streamData[1]).toEqual(`${logInstance.flowId},${formatDate(logInstance.flowId)},first flow,0,2,2,2,4,✅\n`);
  });

  it("should end flow on `end` when optional steps are in flow", function() {
    streamData = [];
    const logInstance = logger.init("first flow");
    logInstance.info("this is the sample flow")
    logInstance.end();
    //assert mystream

    expect(streamData[0].endsWith(`${logInstance.flowId},${formatDate(logInstance.flowId)},first flow\n`)).toBeTrue();
    expect(streamData[1]).toEqual(`${logInstance.flowId},${formatDate(logInstance.flowId)},first flow,0,✅\n`);
  });

  it("should end flow on `end` when optional steps are in flow", function() {
    streamData = [];
    const logInstance = logger.init("first flow");
    logInstance.info("this is the sample flow")
    logInstance.info("until the next condition is true")
    logInstance.end();
    //assert mystream

    expect(streamData[0].endsWith(`${logInstance.flowId},${formatDate(logInstance.flowId)},first flow\n`)).toBeTrue();
    expect(streamData[1]).toEqual(`${logInstance.flowId},${formatDate(logInstance.flowId)},first flow,0,2,✅\n`);
  });
  it("should end flow on expiry when optional steps are in flow", function(done) {
    streamData = [];
    const logInstance = logger.init("first flow");
    logInstance.info("this is the sample flow")
    logInstance.info("until the next condition is true")
    //assert mystream
    setTimeout(() => {
      expect(streamData[0].endsWith(`${logInstance.flowId},${formatDate(logInstance.flowId)},first flow\n`)).toBeTrue();

      expect(streamData[1].startsWith(`${logInstance.flowId},${formatDate(logInstance.flowId)},first flow,0,2`)).toBeTrue();
      expect(streamData[1].endsWith(`,✅\n`)).toBeTrue();
      done();
    }, 500);
  });
});