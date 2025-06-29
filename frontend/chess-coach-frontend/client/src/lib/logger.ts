// Custom logger to avoid external logging service interception
export const logger = {
  log: (message: string, ...args: any[]) => {
    // Only log in development mode
    if (import.meta.env.DEV) {
      // Using a different console method to avoid interception
      console.debug(`[APP] ${message}`, ...args);
    }
  },
  
  error: (message: string, error?: any) => {
    // Only log in development mode
    if (import.meta.env.DEV) {
      // Using a different console method to avoid interception
      console.debug(`[ERROR] ${message}`, error);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.debug(`[WARN] ${message}`, ...args);
    }
  }
}; 