// app/api/health/ready/route.ts
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = { api: 'ok' };
  try {
    const { Redis } = await import('@upstash/redis');
    const url   = process.env['UPSTASH_REDIS_REST_URL'];
    const token = process.env['UPSTASH_REDIS_REST_TOKEN'];
    if (url && token) {
      const redis = new Redis({ url, token });
      await redis.ping();
      checks['redis'] = 'ok';
    } else {
      checks['redis'] = 'ok'; // in-memory fallback active
    }
  } catch { checks['redis'] = 'error'; }
  const allOk  = Object.values(checks).every(v => v === 'ok');
  return NextResponse.json({
    status: allOk ? 'healthy' : 'degraded',
    version: '16.4.0',
    platform: 'vercel-multicloud',
    checks,
    uptime: process.uptime(),
  }, { status: allOk ? 200 : 503 });
}
