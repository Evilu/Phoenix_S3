/**
 * Local Lambda invocation helper for debugging.
 * Usage: npx tsx test/helpers/invoke-handler.ts
 *
 * Requires: IS_LOCAL=true, BUCKET_NAME set in env (or VS Code launch config).
 */
import { handler } from '../../src/handlers/create-item.js';
import { createApiEvent } from './api-gateway-event.js';

const event = createApiEvent({
  body: JSON.stringify({ name: 'Debug Item', description: 'Local invoke test' }),
});

const result = await handler(event, {} as never, {} as never);
console.log(JSON.stringify(result, null, 2));
