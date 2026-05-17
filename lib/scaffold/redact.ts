const SENSITIVE_KEYS = [
  'apiKey',
  'secret',
  'token',
  'password',
  'authorization',
  'bearer',
  'cookie',
  'session',
  'privateKey',
  'prompt',
  'systemPrompt',
  'env',
  'credentials',
  'accessToken',
  'refreshToken',
];

export function redact(data: any): any {
  if (!data) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(redact);
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      redacted[key] = redact(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}
