// index.js - Entry point of the Task Manager API
import express from "express";
import taskController from "./taskController.js";
import log4js from 'log4js';

const app = express();
app.use(express.json());

log4js.configure({
  appenders: {
    fileAppender: { 
      type: 'file', 
      filename: 'flowgger.log', // Name of the log file
      // maxLogSize: 10485760, // Optional: Max size in bytes (e.g., 10MB)
      // backups: 3, // Optional: Number of backup files to keep
      layout: {
        type: 'pattern',
        pattern: '[%d] [%p] %c [%X{requestId}] - %m' // Include the request ID from the context
      }
    },
  },
  categories: {
    default: { 
      appenders: ['fileAppender'], // Use both file
      level: 'trace' // Log level (e.g., trace, debug, info, warn, error, fatal)
    }
  }
});

const logger = log4js.getLogger();

// Middleware to attach Flowgger instance to requests
app.use((req, res, next) => {
  req.logger = logger;
  const requestId = logId();
  req.logger.addContext('requestId', requestId); // Correct usage of addContext()
  next();
});

// Define Routes
app.post("/tasks", taskController.createTask);
app.get("/tasks", taskController.getAllTasks);
app.get("/tasks/:id", taskController.getTaskById);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

function logId(){
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
