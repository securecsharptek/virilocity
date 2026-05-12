import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../lib/auth/middleware';
import { buildMcpMetadata, handleMcpRpc, type McpRpcRequest } from '../../lib/mcp/server';

export const runtime = 'nodejs';

const resolveAuth = async (req: NextRequest): Promise<{ ok: true; tenant: Awaited<ReturnType<typeof authenticate>> extends { ok: true; ctx: infer T } ? T['tenant'] : never } | { ok: false; response: NextResponse }> => {
  const authResult = await authenticate(req.headers.get('authorization'));
  if (!authResult.ok) {
    const [status, body] = authErrorToHttp(authResult.error);
    return { ok: false, response: NextResponse.json(body, { status }) };
  }

  return { ok: true, tenant: authResult.ctx.tenant };
};

const createSseResponse = () => {
  let keepAlive: ReturnType<typeof setInterval> | null = null;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      emit('metadata', buildMcpMetadata());
      emit('ready', { ok: true, timestamp: new Date().toISOString() });

      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`));
      }, 15000);
    },
    cancel() {
      if (keepAlive) clearInterval(keepAlive);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authResult = await resolveAuth(req);
  if (!authResult.ok) return authResult.response;

  const acceptsSse = req.headers.get('accept')?.includes('text/event-stream')
    || req.nextUrl.searchParams.get('transport') === 'sse';

  if (acceptsSse) {
    return createSseResponse();
  }

  return NextResponse.json(buildMcpMetadata());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authResult = await resolveAuth(req);
  if (!authResult.ok) return authResult.response;

  const body = await req.json().catch(() => null) as McpRpcRequest | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error',
      },
    }, { status: 400 });
  }

  const response = await handleMcpRpc(body, authResult.tenant);
  return NextResponse.json(response);
}