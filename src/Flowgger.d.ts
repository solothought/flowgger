export interface LogRecord {
  //head log, flow log, data log
  id: string;
  reportTime: number;
  flowName: string;
  version: string;

  //only for head log, flow log
  headMsg?: string;

  //only for flow log
  success?: boolean;
  steps?: [[number,number]];
  errMsg?: string // when success is false
  parentFlowId?: string;
  parentStepId?: number;

  //only for data log
  lastStepId?: number
  msg?: string
  data?: any
}

type Layout = ((logRecord: LogRecord, level?: string) => string) | Record<string, (logRecord: LogRecord) => string>;

interface Appender {
  append(logRecord: LogRecord, level: string): void;
}

interface AppenderConfig {
  handler: Appender;
  layout?: Layout;
  onlyFor: {
    types: Array<'flows' | 'head' | 'data' | 'error'>;
    flows?: string[];
  };
  notFor?: {
    types: Array<'flows' | 'head' | 'data' | 'error'>;
    flows?: string[];
  };
}

interface FlowggerConfig {
  appenders: AppenderConfig[];
  flow: {
    source: string; // Path to .stflow files
  };
}

interface PlayPauseConfig{
  type: [string], //data: debug, warn
  flows: [string], //flow name present in .stflow files
  keys: [string]  // passed to debug,error,warn methods
}
export class Flowgger {
  constructor(config: FlowggerConfig);
  init(flowName: string): FlowInstance;
  play(playconfig: PlayPauseConfig): void;
  pause(pauseconfig: PlayPauseConfig): void;
  flush(msg: string): void;
}

// Flow instance methods
export interface FlowInstance {
  info(message: string): void;
  debug(message: string, data?: Record<string, any>, key?: string): void;
  warn(message: string, data?: Record<string, any>, key?: string): void;
  error(message: string, data?: Record<string, any>, key?: string): void;
  end(): void;
}

export class ConsoleAppender implements Appender {
  append(logRecord: LogRecord, level: string): void;
}
export class FileAppender implements Appender {
  append(logRecord: LogRecord, level: string): void;
}
export class Log4jsAdapter implements Appender{
  append(logRecord: LogRecord, level: string): void;
}

