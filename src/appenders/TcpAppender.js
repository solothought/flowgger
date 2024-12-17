const net = require('net');

export default class TCPAppender {
    /**
     * Create a TCP appender instance.
     * @param {Object} options - Configuration options.
     * @param {string} options.host - The remote server host.
     * @param {number} options.port - The remote server port.
     */
    constructor({ host, port }) {
        this.host = host;
        this.port = port;
        this.socket = null;       // Socket connection
        this.reconnectInterval = 3000; // Reconnection interval in milliseconds
        this.queue = [];          // Queue for pending logs
        this.isConnecting = false; // Avoid duplicate connection attempts
    }

    /**
     * Lazy connect to the TCP server.
     * Ensures the connection is established only once.
     */
    lazyConnect() {
        if (this.socket && !this.socket.destroyed) {
            return; // Already connected
        }

        if (this.isConnecting) {
            return; // Prevent duplicate connection attempts
        }

        this.isConnecting = true;

        // Create a new socket connection
        this.socket = new net.Socket();

        this.socket.connect(this.port, this.host, () => {
            // console.log(`TCPAppender: Connected to ${this.host}:${this.port}`);
            this.isConnecting = false;
            this.flushQueue();
        });

        // Handle connection errors
        this.socket.on('error', (err) => {
            // console.error(`TCPAppender: Connection error - ${err.message}`);
            this.isConnecting = false;
            this.handleReconnect();
        });

        // Handle connection closure
        this.socket.on('close', () => {
            console.warn('TCPAppender: Connection closed.');
            this.isConnecting = false;
            this.handleReconnect();
        });
    }

    /**
     * Append method to send logs to the remote server.
     * @param {Object} logRecord - The log data.
     * @param {string} logLevel - The log level (e.g., INFO, DEBUG, ERROR).
     */
    append(logRecord, logLevel) {
      let logMsg;
      if(typeof this.layout === "function"){
        logMsg = this.layout(logRecord, logLevel);
      }else if(typeof this.layout === "object"){
        logMsg = this.layout[logLevel](logRecord);
      }
      const message = JSON.stringify({
          level: logLevel,
          message: logMsg
      });

      this.lazyConnect(); // Establish connection if not connected yet

      if (this.socket && !this.socket.destroyed) {
          this.socket.write(message + '\n'); // Send log
      } else {
          // console.warn('TCPAppender: Socket unavailable, queuing log message.');
          this.queue.push(message); // Queue the log message
      }
    }

    /**
     * Handle reconnection attempts.
     */
    handleReconnect() {
        setTimeout(() => {
            this.lazyConnect();
        }, this.reconnectInterval);
    }

    /**
     * Flush any queued log messages to the socket.
     */
    flushQueue() {
        while (this.queue.length > 0 && this.socket && !this.socket.destroyed) {
            const log = this.queue.shift();
            this.socket.write(log + '\n');
        }
    }
}
