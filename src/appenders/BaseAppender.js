export class BaseAppender {
  append(logRecord, level) {
    throw new Error("append() must be implemented by subclasses");
  }
}
