---
name: project-flowform-no-redis-constraint
description: FlowForm has a hard no-Redis constraint — affects session, rate limiting, job queue, and caching decisions across all layers
metadata:
  type: project
---

FlowForm explicitly excludes Redis from the stack. This is a hard constraint, not a preference.

**Replacements:**
- Sessions: Better Auth with database sessions (PostgreSQL)
- Job queue: pg-boss (PostgreSQL-backed)
- Rate limiting: NestJS Throttler with MemoryStorage (resets on restart — known trade-off)
- Caching: TanStack Query on frontend; no server-side cache

**Why:** Free tier infrastructure. Render.com free tier + Neon PostgreSQL already covers all these concerns. Adding Redis would require another paid service.

**How to apply:** Never suggest Redis, BullMQ, ioredis, or any Redis-based solution for FlowForm. If a use case seems to need Redis (cache, rate limit, pub/sub), find the PostgreSQL or in-memory alternative first.

Related: [[project-api-architecture-decisions]]
