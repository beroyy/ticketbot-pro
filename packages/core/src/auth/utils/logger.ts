export type LogLevel = "error" | "warn" | "info" | "debug";

const logLevels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class AuthLogger {
  private level: LogLevel;

  constructor() {
    const defaultLevel = process.env.NODE_ENV === "production" ? "info" : "debug";
    this.level = (process.env.LOG_LEVEL as LogLevel) || defaultLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    // Don't log during Next.js build phase
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return false;
    }
    return logLevels[level] <= logLevels[this.level];
  }

  error(message: string, error?: Error | unknown, metadata?: any): void {
    if (this.shouldLog("error")) {
      console.error(
        `[Auth] ${message}`,
        ...(error !== undefined && error !== null ? [error] : []),
        ...(metadata !== undefined ? [metadata] : [])
      );
    }
  }

  warn(message: string, metadata?: any): void {
    if (this.shouldLog("warn")) {
      if (metadata !== undefined) {
        console.warn(`[Auth] ${message}`, metadata);
      } else {
        console.warn(`[Auth] ${message}`);
      }
    }
  }

  info(message: string, metadata?: any): void {
    if (this.shouldLog("info")) {
      if (metadata !== undefined) {
        console.log(`[Auth] ${message}`, metadata);
      } else {
        console.log(`[Auth] ${message}`);
      }
    }
  }

  debug(message: string, metadata?: any): void {
    if (this.shouldLog("debug")) {
      if (metadata !== undefined) {
        console.log(`[Auth] ${message}`, metadata);
      } else {
        console.log(`[Auth] ${message}`);
      }
    }
  }
}

export const logger = new AuthLogger();
