# Startup Logging Suppression Guide

## Issue
Next.js and npm produce startup messages that appear before structured application logs:

```
> globeco-portfolio-management-portal@0.1.0 start
> next start
▲ Next.js 15.1.6
- Local:        http://localhost:3000
- Network:      http://10.1.7.15:3000
✓ Starting...
✓ Ready in 1019ms
```

These messages are printed by the Next.js CLI and npm before our application code loads, so they cannot be filtered by our application-level log filter.

## Solutions Implemented

### 1. Environment Variable Configuration

Added to `.env.local`:
```bash
NEXT_TELEMETRY_DISABLED=1
```

This disables Next.js telemetry messages but doesn't suppress all startup output.

### 2. Custom Quiet Start Script (`start-quiet.js`)

Created a Node.js script that:
- Spawns the Next.js process
- Filters startup messages from stdout
- Preserves structured application logs
- Passes through stderr (errors and structured logs)

**Usage:**
```bash
npm run start:quiet
```

**Filtered patterns:**
- `> globeco-portfolio-management-portal@`
- `> next start`
- `▲ Next.js`
- `- Local: http://localhost`
- `- Network: http://`
- `✓ Starting...`
- `✓ Ready in Xms`
- npm and Next.js warnings

### 3. Silent Start Option

Added to package.json:
```bash
npm run start:silent
```

This completely suppresses all output and runs in background.

### 4. Enhanced Log Filter

Updated `src/lib/logFilter.ts` to catch any startup messages that might leak through:

```typescript
// Next.js startup and npm messages
/> globeco-portfolio-management-portal@/,
/> next start/,
/▲ Next\.js/,
/- Local:\s+http:\/\/localhost/,
/- Network:\s+http:\/\//,
/✓ Starting\.\.\./,
/✓ Ready in \d+ms/,
```

### 5. Docker/Production Configuration

Updated `Dockerfile`:
- Fixed typo in `NEXT_TELEMETRY_DISABLED=1`
- Copied `start-quiet.js` to production image
- Can use quiet start in production

## Usage Options

### Development
```bash
# Standard start (with startup messages)
npm start

# Quiet start (filtered startup messages)
npm run start:quiet

# Silent start (no output, background)
npm run start:silent
```

### Production/Docker
```bash
# Standard
docker run -p 3000:3000 your-image

# Quiet (modify CMD in Dockerfile)
CMD ["node", "start-quiet.js"]
```

### Kubernetes
Update deployment.yaml:
```yaml
spec:
  containers:
  - name: app
    command: ["node", "start-quiet.js"]
```

## Results

### Before (Standard Start)
```
> globeco-portfolio-management-portal@0.1.0 start
> next start
▲ Next.js 15.1.6
- Local:        http://localhost:3000
- Network:      http://10.1.7.15:3000
✓ Starting...
✓ Ready in 1019ms
{"timestamp":"2025-07-30T16:03:20.907Z","level":"info","msg":"Incoming GET request..."}
```

### After (Quiet Start)
```
{"timestamp":"2025-07-30T16:03:20.907Z","level":"info","msg":"Incoming GET request to /api/portfolios","application":"globeco-portfolio-management-portal","server":"globeco-portfolio-management-portal-9bc66f767-g2d6t","location":"app:None:0","request_id":"adda911c-9464-4bf5-92ab-232a8a95dd90","correlation_id":"232f335b-72e5-44ea-85ec-4e17c022f64e","method":"GET","path":"/api/portfolios","query_params":"","ip_address":"10.1.3.0","remote_addr":"10.1.3.0","user_agent":"python-requests/2.32.4"}
```

## Limitations

1. **CLI Messages**: Some messages are printed by npm/Next.js CLI before Node.js starts
2. **Build Messages**: Build-time messages cannot be suppressed by runtime filters
3. **Error Messages**: Critical startup errors should still be visible

## Recommendations

### For Development
Use `npm run start:quiet` to get clean logs while preserving error visibility.

### For Production
- Use `npm run start:quiet` or modify Docker CMD
- Ensure log aggregation systems can handle the clean JSON format
- Monitor for any critical startup errors that might be suppressed

### For Log Aggregation
The quiet start ensures only structured JSON logs reach your log aggregation system:
- Elasticsearch/Kibana
- Splunk
- Datadog
- CloudWatch Logs

## Files Modified

- `.env.local` - Added `NEXT_TELEMETRY_DISABLED=1`
- `start-quiet.js` - **NEW** - Custom quiet start script
- `package.json` - Added `start:quiet` and `start:silent` scripts
- `Dockerfile` - Fixed typo, added quiet script support
- `src/lib/logFilter.ts` - Added startup message patterns

## Testing

Test the different start options:

```bash
# Test standard start
npm start

# Test quiet start
npm run start:quiet

# Test silent start
npm run start:silent

# Test in Docker
docker build -t test-app .
docker run -p 3000:3000 test-app
```

The quiet start option provides the cleanest log output while maintaining all application functionality and error visibility.