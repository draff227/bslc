import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '@/lib/rateLimiter';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/public')) {
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          statusCode: 429
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
    }
    
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    
    return response;
  }
  
  if (request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/api/public')) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    const isAllowedOrigin = origin && allowedOrigins.includes(origin);
    const isAllowedReferer = referer && allowedOrigins.some(allowed => referer.startsWith(allowed));
    
    if (!isAllowedOrigin && !isAllowedReferer) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};