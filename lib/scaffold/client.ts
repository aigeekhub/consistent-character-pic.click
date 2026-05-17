import { AppErrorCode, Severity } from './types';

export class ScaffoldClient {
  private static instance: ScaffoldClient;
  private sessionId: string;
  private route: string = '';

  private constructor() {
    this.sessionId = Math.random().toString(36).substring(2, 9);
    if (typeof window !== 'undefined') {
      this.route = window.location.pathname;
    }
  }

  public static getInstance(): ScaffoldClient {
    if (!ScaffoldClient.instance) {
      ScaffoldClient.instance = new ScaffoldClient();
    }
    return ScaffoldClient.instance;
  }

  public async log(
    message: string,
    type: string = 'CLIENT_EVENT',
    severity: Severity = 'info',
    metadata?: any,
    module: string = 'CLIENT'
  ) {
    try {
      await fetch('/api/scaffold/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          module,
          message,
          severity,
          metadata,
          route: this.route,
          sessionId: this.sessionId,
        }),
      });
    } catch (e) {
      console.warn('Silent log failure:', e);
    }
  }

  public setRoute(route: string) {
    this.route = route;
  }
}

export const scaffold = ScaffoldClient.getInstance();
