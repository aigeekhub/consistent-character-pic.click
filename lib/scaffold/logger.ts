import { LogEntry, Severity } from './types';
import { redact } from './redact';

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;
  private isDebugEnabled = false;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setDebugEnabled(enabled: boolean) {
    this.isDebugEnabled = enabled;
  }

  public log(
    type: string,
    module: string,
    message: string,
    severity: Severity = 'info',
    metadata?: any,
    route?: string
  ) {
    if (severity === 'debug' && !this.isDebugEnabled) return;

    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      type,
      module,
      message,
      severity,
      metadata: redact(metadata),
      route,
    };

    console.log(`[${entry.severity.toUpperCase()}] [${entry.module}] ${entry.message}`, entry.metadata || '');

    this.logs.unshift(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }

  public clearLogs() {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();
