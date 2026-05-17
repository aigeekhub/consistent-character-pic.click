import { AppErrorCode, StructuredError, Severity } from './types';
import { logger } from './logger';

export class AppError extends Error {
  public code: AppErrorCode;
  public details?: any;
  public module: string;
  public severity: Severity;
  public nextAction?: string;
  public timestamp: string;

  constructor(
    code: AppErrorCode,
    message: string,
    module: string,
    severity: Severity = 'error',
    details?: any,
    nextAction?: string
  ) {
    super(message);
    this.code = code;
    this.module = module;
    this.severity = severity;
    this.details = details;
    this.nextAction = nextAction;
    this.timestamp = new Date().toISOString();

    // Log the error automatically
    logger.log('ERROR', module, message, severity, { code, details });
  }

  public toJSON(): StructuredError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      module: this.module,
      severity: this.severity,
      timestamp: this.timestamp,
      nextAction: this.nextAction,
    };
  }
}
