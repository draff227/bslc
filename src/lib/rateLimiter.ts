interface RateLimitEntry {
  requests: number[];
  lastCleanup: number;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly cleanupInterval: number = 60000; // 1 minute
  private lastGlobalCleanup: number = Date.now();

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  private cleanup() {
    const now = Date.now();
    if (now - this.lastGlobalCleanup < this.cleanupInterval) {
      return;
    }

    for (const [key, entry] of this.store.entries()) {
      const validRequests = entry.requests.filter(timestamp => 
        now - timestamp < this.windowMs
      );
      
      if (validRequests.length === 0) {
        this.store.delete(key);
      } else {
        entry.requests = validRequests;
        entry.lastCleanup = now;
      }
    }
    
    this.lastGlobalCleanup = now;
  }

  checkRateLimit(identifier: string): RateLimitResult {
    this.cleanup();
    
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let entry = this.store.get(identifier);
    if (!entry) {
      entry = { requests: [], lastCleanup: now };
      this.store.set(identifier, entry);
    }

    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);
    
    const remaining = Math.max(0, this.maxRequests - entry.requests.length);
    const allowed = entry.requests.length < this.maxRequests;
    
    if (allowed) {
      entry.requests.push(now);
    }
    
    const oldestRequest = entry.requests.length > 0 ? entry.requests[0]! : now;
    const resetTime = oldestRequest + this.windowMs;

    return {
      allowed,
      limit: this.maxRequests,
      remaining: allowed ? remaining - 1 : remaining,
      resetTime
    };
  }

  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  getStats(): { totalKeys: number; totalRequests: number } {
    let totalRequests = 0;
    for (const entry of this.store.values()) {
      totalRequests += entry.requests.length;
    }
    
    return {
      totalKeys: this.store.size,
      totalRequests
    };
  }
}

const rateLimiter = new RateLimiter(60000, 10);

export function checkRateLimit(ip: string): RateLimitResult {
  const noRateLimitIps = process.env.NO_RATE_LIMIT_IPS?.split(',').map(ip => ip.trim()) || [];
  
  if (noRateLimitIps.includes(ip)) {
    return {
      allowed: true,
      limit: 10,
      remaining: 9,
      resetTime: Date.now() + 60000
    };
  }

  return rateLimiter.checkRateLimit(ip);
}

export function getClientIP(request: Request): string {
  const headers = request.headers;
  
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]!.trim();
  }
  
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  return '127.0.0.1';
}

export { rateLimiter };