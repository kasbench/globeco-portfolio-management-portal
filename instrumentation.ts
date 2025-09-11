export async function register() {
  console.log('🔧 INSTRUMENTATION: Starting Next.js instrumentation...');
  console.log(`🔧 INSTRUMENTATION: NEXT_RUNTIME = ${process.env.NEXT_RUNTIME}`);
  console.log(`🔧 INSTRUMENTATION: NODE_ENV = ${process.env.NODE_ENV}`);
  
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🔧 INSTRUMENTATION: Loading telemetry for Node.js runtime...');
    try {
      // Import and initialize telemetry directly
      await import('./src/lib/telemetry');
      console.log('✅ INSTRUMENTATION: Telemetry module loaded');
    } catch (error) {
      console.error('❌ INSTRUMENTATION: Failed to load telemetry:', error);
      console.error('❌ INSTRUMENTATION: Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    console.log('🔧 INSTRUMENTATION: Skipping telemetry (not Node.js runtime)');
  }
}