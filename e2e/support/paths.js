// Shared path helpers used by step definitions.

import { resolve } from 'node:path';

export function fixturePath(name) {
  return resolve(process.cwd(), 'e2e/support/fixtures', name);
}
