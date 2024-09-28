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
    flowKey: "v"
  })
  it("should throw error when flow key is expected but not given", function() {
    expect( () => logger.init("second flow") ).toThrow(new Error("Slimo Logger expects a flow key"));
  });
  it("should throw error when flow key is expected but invalid value is given", function() {
    expect( () => logger.init("second flow", 3) ).toThrow(new Error("Slimo Logger: Invalid Flow name: second flow(3)"));
  });
  it("should not wait for `end` when a non-branch step points to END", function() {
    streamData = [];
    const logInstance = logger.init("second flow",2);
    logInstance.info("this is the another flow")
    logInstance.info("until the next condition is true")
    logInstance.info("until the next condition is true")
    logInstance.info("mark it complete")
    //assert mystream
    // console.log(streamData);
    expect(streamData[0].endsWith(`${logInstance.flowId},${formatDate(logInstance.flowId)},second flow(2)\n`)).toBeTrue();
    expect(streamData[1]).toEqual(`${logInstance.flowId},${formatDate(logInstance.flowId)},second flow(2),0,2,2,4,✅\n`);
  });
});