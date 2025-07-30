// Log filter to suppress verbose OpenTelemetry output
// This should be imported early in the application lifecycle

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Patterns to filter out
const FILTERED_PATTERNS = [
  /OTLPExportDelegate items to be sent/,
  /found resource\. l \{/,
  /Unsupported OTLP.*protocol/,
  /_rawAttributes:/,
  /_asyncAttributesPending:/,
  /_memoizedAttributes:/,
  /scopeMetrics:/,
  /traceId:/,
  /spanId:/,
  /traceFlags:/,
  /instrumentationScope:/,
  /_spanContext:/,
  /_droppedAttributesCount:/,
  /_performanceStartTime:/,
  /next\.span_name/,
  /next\.span_type/,
  /BaseServer\.handleRequest/,
  /AppRouteRouteHandlers\.runHandler/,
  /NextNodeServer\./,
  // Telemetry operation patterns with emojis
  /🚀 Starting operation:/,
  /🔍 Starting HTTP span:/,
  /📡 Active span found/,
  /✅ Trace context headers injected:/,
  /✅ HTTP span completed:/,
  /✅ Operation completed:/,
  /🌐 Starting fetch operation:/,
  /✅ Fetch operation completed:/,
  /✅ Fetch completed:/,
  /⚠️ No active span found/,
  /❌ HTTP span failed:/,
  /❌ Fetch operation failed:/,
  /❌ Fetch failed:/,
  /❌ Error injecting trace context/,
  /❌ HTTP request error/,
  // Additional OpenTelemetry patterns
  /traceparent:/,
  /b3:/,
  /Trace context headers/,
  // Next.js startup and npm messages
  /> globeco-portfolio-management-portal@/,
  /> next start/,
  /▲ Next\.js/,
  /- Local:\s+http:\/\/localhost/,
  /- Network:\s+http:\/\//,
  /✓ Starting\.\.\./,
  /✓ Ready in \d+ms/,
  /npm start/,
  /next dev/,
  /next build/,
  // Additional Next.js patterns
  /Attention: Next\.js/,
  /warn.*deprecated/i,
  /info.*compiled/i,
  /event.*compiled/i,
];

// Function to check if a message should be filtered
function shouldFilter(message: string): boolean {
  return FILTERED_PATTERNS.some(pattern => pattern.test(message));
}

// Override console.log
console.log = (...args: any[]) => {
  const message = args.join(' ');
  if (!shouldFilter(message)) {
    originalConsoleLog.apply(console, args);
  }
};

// Override console.error
console.error = (...args: any[]) => {
  const message = args.join(' ');
  if (!shouldFilter(message)) {
    originalConsoleError.apply(console, args);
  }
};

// Override console.warn
console.warn = (...args: any[]) => {
  const message = args.join(' ');
  if (!shouldFilter(message)) {
    originalConsoleWarn.apply(console, args);
  }
};

// Export original methods in case they're needed
export { originalConsoleLog, originalConsoleError, originalConsoleWarn };