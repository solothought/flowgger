import BaseAppender from "./BaseAppender.js";
import { isValidDir } from "../util.js";
import FlowggerError from "./FlowggerError.js";
import fs from "fs";
import path from "path";

const defaultConfig = {
  fileName: "flogger",
  fileExt: ".log",
  outputDir: "",
  rollOn: "single", // single file, daily (_ddmmyyyy), hourly(_hh), size(KB)
  batchSize: 10, // number of messages to write to stream together
  flushInterval: 5000, // flush buffer every 5s
};

export class FileAppender extends BaseAppender {
  constructor(config = {}) {
    super();
    this.config = Object.assign({}, defaultConfig, config);
    if (!isValidDir(this.config.outputDir)) {
      throw new FlowggerError("FileAppender needs a valid 'outputDir'");
    }
    this.buffer = [];
    // this.priorityBuffer = [];

    this.currentRollTime = new Date();
    // this.currentFileSize = 0; // Track the size of the current log file

    this.stream = this.#createStream();
    this.isWriting = false;   // To track busy stream
    this.pendingRoll = false; // To track deferred rollovers

    // Periodically flush buffer for old entries. If writing is in progress, it'll be skipped.
    this.flushIntervalId = setInterval(() => this.#processQueue(true), this.config.flushInterval);

    // Set initial rollover timer
    if(this.config.rollOn !== "single"){
      const timeUntilNextRoll = this.#nextRollTime();
      this.rolloverTimer = setTimeout(() => this.#updateLogFile(), timeUntilNextRoll);
    }
  }

  #getLogFileName() {
    const { rollOn, outputDir, fileName, fileExt } = this.config;
    let suffix = "";
    switch (rollOn) {
      case "daily":
        suffix = `_${this.currentRollTime.getDate()}${this.currentRollTime.getMonth()}${this.currentRollTime.getFullYear()}`;
        break;
      case "hourly":
        suffix = `_${this.currentRollTime.getDate().toString().padStart(2, '0')}`;
        break;
      default:
        suffix = "";
    }
    return path.join(outputDir, `${fileName}${suffix}${fileExt}`);
  }

  #updateLogFile() {
    if (this.isWriting) { // Wait until finished
      this.pendingRoll = true;
      return;
    } else {
      this.isWriting = true; // This will stop `processQueue` to run
      this.stream.end();
      this.stream = this.#createStream();
      this.currentRollTime = new Date();
      this.isWriting = false;
      this.pendingRoll = false;
    }

    // Reset rollover timer
    const timeUntilNextRoll = this.#nextRollTime();
    clearTimeout(this.rolloverTimer); // Clear previous timer
    this.rolloverTimer = setTimeout(() => this.#updateLogFile(), timeUntilNextRoll);
  }

  #nextRollTime(){ //to set in timer
    let nextRollTime;

    switch (this.config.rollOn) {
      case "daily":
        nextRollTime = new Date(this.currentRollTime); //next mid night
        nextRollTime.setDate(this.currentRollTime.getDate() + 1);
        nextRollTime.setHours(0, 0, 0, 0); // Reset to start of next day
        return nextRollTime - this.currentRollTime.getTime();
      case "hourly":
        nextRollTime = new Date(this.currentRollTime); //next hour
        nextRollTime.setHours(this.currentRollTime.getHours() + 1, 0, 0, 0); // Reset to start of next hour
        return nextRollTime - this.currentRollTime.getTime();
    }
  }

  #createStream(){
    return fs.createWriteStream(this.#getLogFileName(), { flags: "a" });
  }

  /**
   * Write to file stream
   * @param {string} logMsg 
   */
  async append(logMsg) {
    this.buffer.push(logMsg);
    if (!this.isWriting) {
      await this.#processQueue();
    }
  }
  

  async #processQueue(makeEmpty = false) {
    if (this.isWriting) return;

    this.isWriting = true;

    let start = 0;
    while (this.buffer.length - start >= this.config.batchSize) {
      const batch = this.buffer.slice(start, start + this.config.batchSize); // Read batch
      start += this.config.batchSize; // Advance start index
      await this.writeToStream(batch.join(""));
    }

    // Process remaining logs if buffer is non-empty
    if (makeEmpty && this.buffer.length - start > 0) {
      const remainingLogs = this.buffer.splice(start); // Take remaining logs
      await this.writeToStream(remainingLogs.join(""));
    }

    this.buffer = this.buffer.slice(start); // Clean up processed elements

    this.isWriting = false;

    // Handle pending rollovers
    if (this.pendingRoll) {
      this.#updateLogFile();
    }
  }

  /**
 * Write to stream
 * @param {any} data 
 * @returns {Promise}
 */
  async writeToStream(data) {
    return new Promise((resolve, reject) => {
      this.stream.write(data, (err) => {
        if (err) {
          console.error('Error writing to log file:', err);
          reject(err);
        }else resolve();
      });
    });
  }
}