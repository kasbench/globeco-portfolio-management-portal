export async function register() {
  console.log('🔧 INSTRUMENTATION: register() called');
  console.log('🔧 INSTRUMENTATION: NEXT_RUNTIME =', process.env.NEXT_RUNTIME);
  console.log('🔧 INSTRUMENTATION: NODE_ENV =', process.env.NODE_ENV);
  
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🔧 INSTRUMENTATION: Loading telemetry...');
    try {
      await import('./src/lib/telemetry');
      console.log('🔧 INSTRUMENTATION: Telemetry loaded successfully');
    } catch (error) {
      console.error('🔧 INSTRUMENTATION: Error loading telemetry:', error);
    }
  } else {
    console.log('🔧 INSTRUMENTATION: Skipping telemetry (not nodejs runtime)');
  }
}