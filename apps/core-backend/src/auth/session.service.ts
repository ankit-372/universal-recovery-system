import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class SessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionService.name);
  private redis: Redis | null = null;
  // In-memory fallback if Redis is not yet reachable during local development/tests
  private readonly memoryStore = new Map<string, { sessionId: string; expiresAt: number }>();

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    try {
      this.redis = new Redis(redisUrl, {
        retryStrategy(times) {
          // Retry with exponential backoff up to 3000ms
          return Math.min(times * 100, 3000);
        },
        maxRetriesPerRequest: 3,
        lazyConnect: false,
      });

      this.redis.on('connect', () => {
        this.logger.log('✅ Connected to Redis for session management');
      });

      this.redis.on('error', (err) => {
        this.logger.warn(`⚠️ Redis session store warning: ${err.message}. Using memory fallback.`);
      });
    } catch (err: any) {
      this.logger.warn(`Failed to initialize Redis: ${err.message}. Using memory fallback.`);
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit().catch(() => {});
    }
  }

  /**
   * Create a new session for a user.
   * Invalidates any previous session (single-device login enforcement).
   */
  async createSession(userId: string): Promise<string> {
    const sessionId = crypto.randomUUID();
    const key = `session:${userId}`;

    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.set(key, sessionId, 'EX', 3600); // 1 hour TTL
        return sessionId;
      } catch (err: any) {
        this.logger.error(`Error saving session to Redis: ${err.message}`);
      }
    }

    // Fallback in-memory
    this.memoryStore.set(userId, {
      sessionId,
      expiresAt: Date.now() + 3600 * 1000,
    });
    return sessionId;
  }

  /**
   * Validate that the user's session is still active and matches.
   */
  async validateSession(userId: string, sessionId: string): Promise<boolean> {
    if (!userId || !sessionId) return false;

    if (this.redis && this.redis.status === 'ready') {
      try {
        const stored = await this.redis.get(`session:${userId}`);
        return stored === sessionId;
      } catch (err: any) {
        this.logger.error(`Error reading session from Redis: ${err.message}`);
      }
    }

    // Fallback in-memory
    const memorySession = this.memoryStore.get(userId);
    if (!memorySession) return false;
    if (Date.now() > memorySession.expiresAt) {
      this.memoryStore.delete(userId);
      return false;
    }
    return memorySession.sessionId === sessionId;
  }

  /**
   * Revoke session on logout or password change.
   */
  async revokeSession(userId: string): Promise<void> {
    if (!userId) return;

    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.del(`session:${userId}`);
      } catch (err: any) {
        this.logger.error(`Error deleting session from Redis: ${err.message}`);
      }
    }

    this.memoryStore.delete(userId);
  }
}
