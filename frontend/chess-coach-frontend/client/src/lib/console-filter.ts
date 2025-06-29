// Block HTTP requests to port 4444 logging service
const originalFetch = window.fetch;

// Override fetch to block requests to port 4444
window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  // Block requests to port 4444 (logging service)
  if (url.includes(':4444') || url.includes('localhost:4444')) {
    console.debug('Blocked logging service request to:', url);
    // Return a fake successful response
    return Promise.resolve(new Response('{}', { 
      status: 200, 
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' }
    }));
  }
  
  // Allow all other requests
  return originalFetch(input, init);
};

// Also completely disable console methods that trigger external logging
const noop = () => {};

// Store originals for debugging if needed
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info
};

// Completely disable problematic console methods
console.log = noop;
console.error = noop;
console.warn = noop;
console.info = noop;

// Keep console.debug for our own debugging
// console.debug is less likely to be intercepted
console.debug('Console filter loaded - external logging blocked');

export { originalConsole, originalFetch }; 