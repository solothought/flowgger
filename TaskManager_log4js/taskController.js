import taskService from "./services/taskService.js";

const createTask = (req, res) => {
  req.logger.info("Create Task,0.0.1");
  req.logger.info("received request");
  try {
    const task = taskService.createTask(req.body, req.logger);
    req.logger.info("task created");
    
    res.status(201).json(task);
  } catch (error) {
    req.logger.error("error creating task", error);
    
    res.status(500).json({ error: "Task creation failed" });
  }
};

const getAllTasks = (req, res) => {
  req.logger.info("Get All Tasks,0.0.1");
  req.logger.info("fetching tasks");
  const tasks = taskService.getAllTasks(req.logger);
  res.json(Object.fromEntries(tasks));
  req.logger.info("tasks fetched");
  
};

const getTaskById = (req, res) => {
  req.logger.info("Get Task By Id,0.0.1");
  req.logger.info("received request");
  const task = taskService.getTaskById(req.params.id, req.logger);
  if (!task) {
    req.logger.error("task not found");
    
    return res.status(404).json({ error: "Task not found" });
  }
  req.logger.info("task retrieved");
  
  res.json(task);
};

export default { createTask, getAllTasks, getTaskById };
