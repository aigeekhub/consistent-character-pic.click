export type Severity = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  module: string;
  message: string;
  severity: Severity;
  metadata?: any;
  route?: string;
  sessionId?: string;
}

export enum AppErrorCode {
  AUTH_001 = 'AUTH_001', // User is not authenticated
  AUTH_002 = 'AUTH_002', // User lacks required permission
  API_001 = 'API_001', // Invalid API request payload
  API_002 = 'API_002', // External provider request failed
  DB_001 = 'DB_001', // Database query failed
  FLAG_001 = 'FLAG_001', // Missing or invalid feature flag
  SETTINGS_001 = 'SETTINGS_001', // Invalid app setting
  DEBUG_001 = 'DEBUG_001', // Debug recorder failure
  FILE_001 = 'FILE_001', // File upload or file handling failure
  AI_001 = 'AI_001', // AI provider timeout
  AI_002 = 'AI_002', // Invalid AI provider response
  SYS_001 = 'SYS_001', // Unknown system error
}

export interface StructuredError {
  code: AppErrorCode;
  message: string;
  details?: any;
  module: string;
  severity: Severity;
  timestamp: string;
  nextAction?: string;
  sessionId?: string;
}

export interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  fallbackValue: any;
}

export interface AppSetting {
  key: string;
  label: string;
  description: string;
  value: any;
  category: string;
  type: 'string' | 'number' | 'boolean' | 'json';
}
