
// services/taskService.js - Task Service
const tasks = new Map(); // In-memory storage

const taskService = {
    createTask: (task, flog) => {
        const id = Date.now().toString();
        tasks.set(id, task);
        flog.info("stored task in database");
        // console.log(tasks);
        return { id, ...task };
    },
    
    getTaskById: (id, flog) => {
        flog.info("fetched task from database");
        return { id, ...tasks.get(id) };
    },
    
    getAllTasks: (flog) => {
        flog.info("retrieving all tasks");
        return tasks;
    },
    
    updateTask: (id, updatedTask, flog) => {
        if (!tasks.has(id)) {
            flog.error("task not found");
            return null;
        }
        tasks.set(id, updatedTask);
        flog.info("updated task in database");
        return { id, ...updatedTask };
    },
    
    deleteTask: (id, flog) => {
        if (!tasks.has(id)) {
            flog.error("task not found");
            return;
        }
        tasks.delete(id);
        flog.info("removed task from database");
    }
};

export default taskService;
