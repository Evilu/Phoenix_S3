import { beforeEach } from 'vitest';

beforeEach(() => {
  delete process.env.IS_LOCAL;
  delete process.env.LOCALSTACK_HOSTNAME;
});
