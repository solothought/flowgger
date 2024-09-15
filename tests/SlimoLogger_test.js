const Logger = require("./../src/SlimoLogger");
const path = require("path");

describe("Slimo Logger", function() {
  const logger = new Logger({
    flowDir: path.resolve(__dirname, "./flows")
  })
  it("should parse flow with END", function() {
    const logInstance = logger.init("first flow");
    logInstance.log("this is the sample flow")
    logInstance.log("until the next condition is true")
    logInstance.log("until the next condition is true")
    logInstance.log("until the next condition is true")
    logInstance.log("mark it complete")
    logInstance.end();
  });
});