import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Coverage targets the core distributed systems algorithms.
    // These are pure-logic services (no DB required), so tests are fast and reliable.
    // Database-dependent services are covered by integration tests run with Docker.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'src/services/vectorClock.ts',
        'src/services/consistentHash.ts',
        'src/services/embedding.ts',
        'src/services/saga.ts',
        'src/services/twoPhaseCommit.ts',
        'src/services/threePhaseCommit.ts',
        'src/services/writeAheadLog.ts',
        'src/services/raft.ts',
        'src/services/shardRouter.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});