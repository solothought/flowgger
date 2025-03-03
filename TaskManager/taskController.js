import taskService from "./services/taskService.js";

const createTask = (req, res) => {
  const flog = req.flowgger.init("Create Task");
  flog.info("received request");
  try {
    const task = taskService.createTask(req.body, flog);
    flog.info("task created");
    flog.end();
    res.status(201).json(task);
  } catch (error) {
    flog.error("error creating task", error);
    flog.end();
    res.status(500).json({ error: "Task creation failed" });
  }
};

const getAllTasks = (req, res) => {
  const flog = req.flowgger.init("Get All Tasks");
  flog.info("fetching tasks");
  const tasks = taskService.getAllTasks(flog);
  res.json(Object.fromEntries(tasks));
  flog.info("tasks fetched");
  flog.end();
};

const getTaskById = (req, res) => {
  const flog = req.flowgger.init("Get Task By ID");
  flog.info("received request");
  const task = taskService.getTaskById(req.params.id, flog);
  if (!task) {
    flog.error("task not found");
    flog.end();
    return res.status(404).json({ error: "Task not found" });
  }
  flog.info("task retrieved");
  res.json(task);
  flog.end();
};

export default { createTask, getAllTasks, getTaskById };
