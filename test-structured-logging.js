#!/usr/bin/env node

// Simple test script to verify structured logging functionality
const { logger } = require('./src/lib/logger.ts');

// console.log('Testing structured logging...\n');

// Test basic logging
logger.info('Test message', { test_field: 'test_value' });

// Test error logging
try {
  throw new Error('Test error');
} catch (error) {
  logger.logError('Test error occurred', error, undefined, { test_context: 'error_test' });
}

// Test different log levels
logger.debug('Debug message', { debug_info: 'debug_value' });
logger.warn('Warning message', { warning_type: 'test_warning' });
logger.error('Error message', { error_type: 'test_error' });

// console.log('\nStructured logging test completed. Check the JSON output above.');