export default class FlowggerError extends Error {
  constructor(message) {
    super(message); // (1)
    this.name = "FlowggerError";
  }
}