import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Explicit cleanup (vitest runs with globals disabled).
afterEach(() => {
  cleanup();
});