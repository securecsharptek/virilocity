// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Agent Chat Route
// POST /api/agent/chat  —  streaming intent-routed conversational AI
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { routeModel } from '../../../../lib/ai/client';
import Anthropic from '@anthropic-ai/sdk';
import type { AgentType } from '../../../../lib/types/index';

export const runtime = 'nodejs';
const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

const INTENT_PATTERNS: Array<{ pattern: RegExp; agent: AgentType }> = [
  { pattern: /keyword|seo|rank/i,           agent: 'keyword_researcher' },
  { pattern: /content|article|blog|write/i, agent: 'geo_content_generator' },
  { pattern: /social|mention|sentiment/i,   agent: 'social_listener' },
  { pattern: /churn|retention|at.risk/i,    agent: 'churn_predictor' },
  { pattern: /lead|mql|sql|contact/i,       agent: 'hs_contact_enricher' },
  { pattern: /revenue|forecast|mrr/i,       agent: 'revenue_forecaster' },
  { pattern: /ad|campaign|roas|bid/i,       agent: 'bid_optimizer' },
  { pattern: /visibility|ai.search|citation/i, agent: 'ai_visibility_tracker' },
];

const routeIntent = (message: string): AgentType => {
  for (const { pattern, agent } of INTENT_PATTERNS) {
    if (pattern.test(message)) return agent;
  }
  return 'workspace_reporter'; // default: general Q&A
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [status, body] = authErrorToHttp(auth.error);
    return NextResponse.json(body, { status });
  }
  const { tenant } = auth.ctx;

  const { message, history = [] } = await req.json() as {
    message?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

  const intent = routeIntent(message);
  const model  = routeModel(intent, tenant.tier);

  const system = `You are Virilocity's AI marketing assistant for ${tenant.name} (${tenant.tier} tier).
You help with marketing strategy, content, SEO, lead generation, and analytics.
Current agent context: ${intent}. Be concise, actionable, and data-driven.`;

  const response = await anthropic.messages.create({
    model, system,
    messages: [...history, { role: 'user', content: message }],
    max_tokens: 600,
  });

  const reply = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');

  return NextResponse.json({ reply, intent, model, tenantId: tenant.id });
}
