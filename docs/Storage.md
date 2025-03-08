**Understanding Flowgger's In-Memory Logging**

Flowgger offers numerous benefits, but it's important to understand its in-memory logging mechanism. Imagine your application has an API that takes 10 seconds to respond. During this time, Flowgger keeps the flow log in memory. If the application crashes within these 10 seconds, the flow logs will be lost. However, the head and data logs are still preserved.

**Safe Application Shutdown**

Before shutting down your application, ensure there are no active requests. If you shut down while a request is being processed, the corresponding flow log will be lost.

**Flowgger's Solutions to Mitigate Log Loss**

Flowgger provides several features to help prevent log loss:

1. **Head Log Message**: Head and data logs are written immediately. When creating a logger instance for a particular flow, include a unique identifier, such as a user ID, to help trace logs.
```js
flog = flowgger.init(flowName, version, headMsg);
```
2. **Flush Method**: Before shutting down your application, you can flush all logs from memory to their respective streams.
```js
flogger.flush(reasonMsg);
```

3. **Other Log Levels**: Use different log levels to log additional information. These logs are streamed immediately, providing real-time insights into your application's behavior. We prefer to avoid them as they take extra space but you can create a **Backup Appender** to log extra information to a backup file that is automatically deleted after a certain period. If the application crashes, you can retrieve logs of active flows; otherwise, they are removed to save space.
    
4. **Redis Sync**: Instead of storing active flows in application memory, set up Flowgger to store logs directly on Redis. You would have to setup a store proerty with your redis store. This is how you can implement a store class

```js
import { createClient } from "redis";
import LogRecord from "@solothought/flowgger/LogRecord"

export default class RedisPersistence {
  constructor(redisUrl) {
    super();
    this.client = createClient({ url: redisUrl });
  }

  /**
   * @param {string} flowId 
   * @param {LogRecord} logRecord 
   */
  async set(flowId, logRecord) {
    try {
      await this.client.set(`${flowId}`, JSON.stringify(logRecord));
    } catch (error) {
      console.error(`Failed to set key ${flowId} in Redis:`, error);
      throw error;
    }
  }
  
  /**
   * @param {string} flowId 
   * @returns {LogRecord} 
   */
  async get(flowId) {
    try {
      const logData = await this.client.get(`${flowId}`);
      if (!logData) return null; // Key does not exist
      return LogRecord.convert(JSON.parse(logData)); // Deserialize and convert
    } catch (error) {
      console.error(`Failed to get key ${flowId} from Redis:`, error);
      throw error;
    }
  }
  
  /**
   * @param {string} flowId 
   */
  async has(flowId) {
    const exists = await this.client.exists(`{flowId}`);
    return exists === 1; // EXISTS returns 1 if the key exists, 0 otherwise
  }

  async init(storeKeyPrefix) {
    this.storeKeyPrefix = storeKeyPrefix;
    this.client.connect();
  }

  /**
   * @param {string} flowId 
   */
  async delete(flowId) {
    try {
      await this.client.del(`${flowId}`);
    } catch (error) {
      console.error(`Failed to delete key ${flowId} from Redis:`, error);
      throw error;
    }
  }

  async keys(){
    return await this.client.keys(`${this.storeKeyPrefix}*`);
  }

  async clear() {
    try {
      const keys = await this.keys();
      if (keys.length > 0) {
        await this.client.del(keys); // Delete all keys in one operation
      }
    } catch (error) {
      console.error("Failed to clear Redis store:", error);
      throw error;
    }
  }
}
```