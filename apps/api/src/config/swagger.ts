import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

/**
 * Swagger / OpenAPI Configuration
 *
 * Serves interactive API documentation at /api/docs.
 * Endpoint definitions are written as JSDoc comments in src/docs/openapi.ts
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ForkSquare Distributed API',
      version: '1.0.0',
      description: `
A production-grade distributed food delivery platform demonstrating CS 606 concepts:

- **Week 3:** Data Partitioning & Sharding (PostgreSQL HASH + RANGE)
- **Week 4:** Streaming Replication (Primary + Standby)
- **Week 5:** Consistent Hashing
- **Week 6:** Bloom Filters + Vector Search (pgvector)
- **Week 7:** Vector Clocks
- **Week 8:** Two-Phase Commit (PREPARE TRANSACTION)
- **Week 9:** Three-Phase Commit + Saga Pattern
- **Week 10:** Write-Ahead Logging (WAL)
- **Week 12:** Raft Consensus (etcd)
- **Week 16:** Distributed SQL (CockroachDB)
      `,
      contact: {
        name: 'ForkSquare Team',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste your access token from /api/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            statusCode: { type: 'integer' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication & RBAC' },
      { name: 'Restaurants', description: 'Restaurant browsing' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Flash Sale', description: 'Concurrency control (MVCC + locks)' },
      { name: '2PC', description: 'Real Two-Phase Commit' },
      { name: 'Replication', description: 'Streaming replication inspection' },
      { name: 'Partitions', description: 'Table partitioning inspection' },
      { name: 'Raft', description: 'Raft consensus (etcd)' },
    ],
  },
  // Files to scan for @openapi JSDoc comments
  apis: ['./src/docs/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);