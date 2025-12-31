import { env } from '../config/env';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private logLevels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  private currentLevel: number;

  constructor() {
    this.currentLevel = this.logLevels[env.LOG_LEVEL as LogLevel] || this.logLevels.info;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] <= this.currentLevel;
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      const meta = error instanceof Error ? { message: error.message, stack: error.stack } : error;
      console.error(this.formatMessage('error', message, meta));
    }
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

export const logger = new Logger();
