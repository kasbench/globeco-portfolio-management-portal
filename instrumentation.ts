export async function register() {
  console.log('🔧 INSTRUMENTATION: Starting Next.js instrumentation...');
  console.log(`🔧 INSTRUMENTATION: NEXT_RUNTIME = ${process.env.NEXT_RUNTIME}`);
  console.log(`🔧 INSTRUMENTATION: NODE_ENV = ${process.env.NODE_ENV}`);
  
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🔧 INSTRUMENTATION: Loading simple telemetry for Node.js runtime...');
    try {
      // Import our simple all-in-one telemetry
      await import('./src/lib/simple-telemetry');
      console.log('✅ INSTRUMENTATION: Simple telemetry loaded successfully');
    } catch (error) {
      console.error('❌ INSTRUMENTATION: Failed to load simple telemetry:', error);
      console.error('❌ INSTRUMENTATION: Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    console.log('🔧 INSTRUMENTATION: Skipping telemetry (not Node.js runtime)');
  }
}