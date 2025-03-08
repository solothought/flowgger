export default class InMemoryStore {
  constructor() {
    super();
    // this.store = new Map();
    this.store;
  }

  /**
   * @param {string} flowId 
   * @param {LogRecord} logRecord 
   */
  set(flowId, logRecord) {
    this.store.set(flowId,logRecord);
  }

  /**
   * @param {string} flowId 
   * @returns {LogRecord} 
   */
  get(flowId){
    return this.store.get(flowId);
  }
  
  /**
   * @param {string} flowId 
   */
  has(flowId){
    return this.store.has(flowId);
  }

  init() {
    this.store = new Map();
  }

  /**
   * @param {string} flowId 
   */
  delete(flowId) {
    delete this.store.delete(flowId);
  }
  
  keys(){
    return this.store.keys();
  }

  clear(){
    this.store = new Map();
    // this.store.clear();
  }
}