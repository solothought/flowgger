export interface LogRecord {
  id: string;
  reportTime: number;
  flowName: string;
  version: string;
  steps?: string[];
  status?: string;
  parentFlowId?: string;
  parentStepId?: string;
  msg?: string;
  errMsg?: string;
  data?: any;
}

export interface MaskRule {
  regex: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
}

export default class PatternLayout {
  private pattern: {
    head: string;
    flow: string;
    data: string;
  };

  private maskRules: MaskRule[];
  private replaceData: boolean;
  private dateFormat: string;
  private traceLines: number;
  private newLine: string;

  constructor(pattern?: string | Partial<{ head: string; flow: string; data: string }>);

  setHeadPattern(customPattern: string): void;
  setFlowPattern(customPattern: string): void;
  setDataPattern(customPattern: string): void;
  setDateFormat(customFormat: string): void;
  setMaskingRules(maskRules: MaskRule[]): void;

  info(lr: LogRecord): string;
  head(lr: LogRecord): string;
  flow(lr: LogRecord): string;
  debug(lr: LogRecord): string;
  warn(lr: LogRecord): string;
  trace(lr: LogRecord): string;
  error(lr: LogRecord): string;
  fatal(lr: LogRecord): string;

}
