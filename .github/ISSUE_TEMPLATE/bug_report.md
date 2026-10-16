---
name: Bug Report
about: Create a report to help us improve AegisGateway
title: '[BUG] '
labels: ['bug', 'triage']
assignees: ''
---

### Describe the Bug
A clear and concise description of what the bug is.

### Reproduction Steps
1. Send request to endpoint: `POST /api/v1/gateway/completions`
2. With payload: `{ ... }`
3. Observe circuit breaker / router behavior: ...

### Expected Behavior
A clear and concise description of what you expected to happen.

### Trace Hop Logs / Headers
```json
{
  "traceId": "tr_...",
  "status": "failed",
  "hops": []
}
```

### Environment
- OS: Windows / Linux / macOS
- Node version:
- Deployment: Docker / Vercel / Local
