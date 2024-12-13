export class BaseAppender {
  append(message, before = "", after = "") {
    throw new Error("writeLog() must be implemented by subclasses");
  }
}
