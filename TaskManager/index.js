// index.js - Entry point of the Task Manager API
import express from "express";
import Flowgger from "@solothought/flowgger";
// import ConsoleAppender from "@solothought/flowgger/ConsoleAppender";
import PatternLayout from "@solothought/flowgger/PatternLayout";
import taskController from "./taskController.js";
import path from "path";
import log4js from 'log4js';
import Log4jsAdapter from '@solothought/flowgger/Log4jsAdapter';

// const isProduction = process.env.NODE_ENV === 'production';

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
        pattern: '%m' // Only include the log message
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

const log4jsFileAppender = new Log4jsAdapter(log4js.getLogger());

// Flowgger Configuration
const config = {
  appenders: [
    {
      handler: log4jsFileAppender,
      layout: new PatternLayout(),
      onlyFor: {
        types: ["head", "flows", "data", "error"],
      }
    },
  ],
  flow: { source: path.resolve("./flows") },
};
const flowgger = new Flowgger(config);

// Middleware to attach Flowgger instance to requests
app.use((req, res, next) => {
  req.flowgger = flowgger;
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