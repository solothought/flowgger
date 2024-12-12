// TODO: what if log file is already created
// TODO: flush buffer if current buffer size exceed max memory usage

import BaseAppender from "./BaseAppender.js";
import {isValidDir} from "../util.js"
import FlowggerError from "./FlowggerError.js";
import fs from "fs";
import path from "path";

const defaultConfig = {
  fileName: "flogger",
  fileExt: ".log",
  outputDir: "",
  rollOn: "single", //single file, daily (_ddmmyyyy), hourly(_hh), size(KB)
  maxLogSize: 1024, //used only if rollOn: "size"
  chunkSize: 8 * 1024, // 8KB
  batchSize: 10, //number of messages to write to stream together
  flushInterval: 5000 // flush buffer every 5s
}

export class FileAppender extends BaseAppender{
  constructor(config = {}){
    this.config = Object.assign({},defaultConfig,config);    
    if(!isValidDir(config.outputDir)){
      throw new FlowggerError("FileAppender needs a valid 'outputDir'");
    }
    this.buffer = [];
    // this.priorityBuffer = [];

    this.currentRollTime = new Date();
    this.stream = this.createStream();
    this.isWriting = false;   // To track busy stream
    this.pendingRoll = false; // To track deferred rollovers

    //periodically flush buffer for old entries. If writing is in progress, it'll be skipped.
    this.flushIntervalId = setInterval(() => this.processQueue(true), this.config.flushInterval);

    // Set initial rollover timer
    const timeUntilNextRoll = this.nextRollTime();
    this.rolloverTimer = setTimeout(() => this.#updateLogFile(), timeUntilNextRoll);
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
        suffix = '';
    }
    return path.join(outputDir, `${fileName}${suffix}${fileExt}`);
  }
  #updateLogFile(){
    if(this.isWriting){//wait until finished 
      this.pendingRoll = true;
      return;
    }else{
      this.isWriting = true; //this will stop `processQueue` to run
      this.stream.end();
      this.stream = this.createStream();
      this.currentRollTime = new Date();
      this.isWriting = false;
      this.pendingRoll = false; 
    }

    // Reset rollover timer
    const timeUntilNextRoll = this.nextRollTime();
    clearTimeout(this.rolloverTimer); // Clear previous timer
    this.rolloverTimer = setTimeout(() => this.#updateLogFile(), timeUntilNextRoll);

  }
  nextRollTime(){ //to set in timer
    switch (this.config.rollOn) {
      case "daily":
        const nextMidnight = new Date(this.currentRollTime);
        nextMidnight.setDate(this.currentRollTime.getDate() + 1);
        nextMidnight.setHours(0, 0, 0, 0); // Reset to start of next day
        return nextMidnight - this.currentRollTime.getTime();
      case "hourly":
        const nextHour = new Date(this.currentRollTime);
        nextHour.setHours(this.currentRollTime.getHours() + 1, 0, 0, 0); // Reset to start of next hour
        return nextHour - this.currentRollTime.getTime();
    }
  }
  createStream(){
    return fs.createWriteStream(this.#getLogFileName(), { flags: "a" });
  }

  /**
   * Write to file stream
   * @param {any} logMsg 
   * @param {string} before 
   * @param {string} after 
   * @param {boolean} immediateWrite
   */
  async write(logMsg, before = "", after = "", immediateWrite = false) {
    const logEntry = `${before}${stringify(logMsg)}${after}\n`;
    // TODO: size implementation
    // this.logSize += logEntry.length; //TODO: flush buffer once reach to a limit
    // IF this.logSize > this.maxLogSize
    //    write current logs to current stream
    //    create new logfile with increasing index.

    if(immediateWrite){
      await this.writeToStream(logEntry);
    }else{
      this.buffer.push(logEntry);
      if ( !this.isWriting) {
        await this.processQueue();
      }
    }
  }
  

  async processQueue(makeEmpty = false) {
    if (this.isWriting) return;

    this.isWriting = true;

    let start = 0;
    while (this.buffer.length - start >= this.config.batchSize) {
      //TODO: chunking: writing very short or very long string may impact IO operation
      // preparing chunks of desire size may improve it but creating 
      // multiple string and their concatenation will impact too
      // chunking will also help for "size" rollOn strategy.
      const batch = this.buffer.slice(start, start + this.config.batchSize); // Read batch
      start += this.config.batchSize; // Advance start index
      await this.writeToStream(batch.join(""));
    }

    // Process remaining logs if buffer is non-empty
    if (makeEmpty && this.buffer.length - start > 0) {
      const remainingLogs = this.buffer.splice(0); // Take all remaining logs
      start += remainingLogs.length;
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
 * @param {string} before 
 * @param {string} after
 * @returns 
 */
  writeToStream(data) {
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

function stringify(data){
  try {
    return typeof data === "object" ? JSON.stringify(data) : String(data);
  } catch {
    return "[Unserializable Object]";
  }
}