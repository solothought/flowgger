//TODO : 
// 1) queue message
// 2) stringify objects to stream directly

class StreamHandler{
  constructor(streams){
    this.streams = {};
    this.queues = {};
    this.isWriting = {};
  }

  addStream(streamName, stream) {
    // this.streams[streamName] = stream;
    this.queues[streamName] = [];
    this.isWriting[streamName] = false;
    if(Array.isArray(stream)) {
      this.streams[streamName] = stream;
      pipeStream(stream);
    } else this.streams[streamName] = [stream]
  }

  async log(streamName, message) {
    if (!this.streams[streamName]) {
      throw new Error(`Stream ${streamName} not found`);
    }

    // Push the message to the queue
    this.queues[streamName].push(message);

    // If not currently writing, process the queue
    if (!this.isWriting[streamName]) {
      await this.processQueue(streamName);
    }
  }

  async processQueue(streamName) {
    this.isWriting[streamName] = true;

    while (this.queues[streamName].length > 0) {
      const message = this.queues[streamName].shift();
      await this.writeToStream(streamName, message);
    }

    this.isWriting[streamName] = false;
  }

  writeToStream(streamName, data) {
    return new Promise((resolve, reject) => {
      if(typeof data === "string") this.streams[streamName][0].write(`${data}\n`);
      else{
        writeData(data, this.streams[streamName][0]);
        this.streams[streamName][0].write('\n');
      }
      resolve();
    });
  }

}

function pipeStream(arr){
  let mainStream = arr[0];
  for (let i = 1; i < arr.length; i++) {
    mainStream = mainStream.pipe(arr[i]);
  }
  arr[0] = mainStream;
}


function writeData(d, stream) {
  if (typeof d === 'object' && d !== null) {
    if (Array.isArray(d)) {
      stream.write('[');
      d.forEach((item, index) => {
        if (index > 0) stream.write(',');
        writeData(item, stream);
      });
      stream.write(']');
    } else {
      stream.write('{');
      const keys = Object.keys(d);
      keys.forEach((key, index) => {
        if (index > 0) stream.write(`,"${key}":`);
        else stream.write(`"${key}":`);
        writeData(d[key], stream);
      });
      stream.write('}');
    }
  } else if (typeof d === 'string') {
    stream.write(`"${d}"`);
  } else {
    stream.write(String(d));
  }
}

module.exports = StreamHandler;