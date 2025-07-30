#!/usr/bin/env node

// Custom start script that suppresses Next.js startup messages
// while preserving structured application logs

const { spawn } = require('child_process');
const path = require('path');

// Patterns to filter from startup output
const STARTUP_FILTER_PATTERNS = [
  /> globeco-portfolio-management-portal@/,
  /> next start/,
  /▲ Next\.js/,
  /- Local:\s+http:\/\/localhost/,
  /- Network:\s+http:\/\//,
  /✓ Starting\.\.\./,
  /✓ Ready in \d+ms/,
  /npm start/,
  /Attention: Next\.js/,
  /warn.*deprecated/i,
];

function shouldFilterStartupMessage(message) {
  return STARTUP_FILTER_PATTERNS.some(pattern => pattern.test(message));
}

// Start Next.js with suppressed startup output
const nextProcess = spawn('npx', ['next', 'start'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  cwd: process.cwd()
});

// Filter stdout (startup messages)
nextProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim() && !shouldFilterStartupMessage(line)) {
      console.log(line);
    }
  });
});

// Pass through stderr (errors and structured logs)
nextProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Handle process exit
nextProcess.on('close', (code) => {
  process.exit(code);
});

// Handle signals
process.on('SIGINT', () => {
  nextProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  nextProcess.kill('SIGTERM');
});