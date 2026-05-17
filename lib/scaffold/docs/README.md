# App Foundation Scaffold Documentation

## Structure
- `/admin`: Admin dashboard for settings, flags, and logs.
- `/lib/scaffold/logger.ts`: Central logger for server and client.
- `/lib/scaffold/errors.ts`: Structured error system with codes.
- `/lib/scaffold/feature-flags.ts`: Toggle features without code changes.
- `/lib/scaffold/settings.ts`: Configure app behavior dynamically.
- `/lib/scaffold/redact.ts`: Sensitive data redaction for logs.

## Error Codes
- `AUTH_001`: Unauthenticated
- `API_001`: Invalid Payload
- `AI_001`: AI Timeout
- `SYS_001`: General Error

## Usage
### Logging
```ts
import { logger } from "@/lib/scaffold/logger";
logger.log("MODULE", "ACTION", "Message", "info", { metadata });
```

### Feature Flags
```ts
import { isFeatureEnabled } from "@/lib/scaffold/feature-flags";
if (isFeatureEnabled("MY_FLAG")) { ... }
```

### Error Handling
```ts
throw new AppError(AppErrorCode.API_001, "Error message", "MODULE");
```
