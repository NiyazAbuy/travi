import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Один tsconfig для всех тестов: app/tsconfig.json наследует `expo/tsconfig.base`, который преобразователь не находит.
  tsconfig: 'tsconfig.base.json',
  test: {
    include: ['shared/test/**/*.test.ts', 'tools/test/**/*.test.ts', 'app/src/**/*.test.ts'],
    testTimeout: 20000,
  },
});
