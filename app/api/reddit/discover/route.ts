// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Reddit Discover Route
// GET /api/reddit/discover?subreddits=r/marketing,r/SaaS
// Always returns requiresHumanApproval: true — no auto-posting ever
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';
import { REDDIT_REQUIRES_HUMAN_APPROVAL } from '../../../../lib/types/index';
import { runAgentCall } from '../../../../lib/ai/client';
import { db, redditThreads } from '../../../../lib/db/client';
import { uid } from '../../../../lib/utils/index';
import { and, desc, eq, isNull } from 'drizzle-orm';

export const runtime = 'nodejs';

type RedditDraft = {
  subreddit: string;
  title: string;
  content: string;
};

const normalizeDraftEntry = (entry: Record<string, unknown>): RedditDraft | null => {
  const content =
    typeof entry['content'] === 'string' ? entry['content'].trim()
    : typeof entry['postDraft'] === 'string' ? entry['postDraft'].trim()
    : typeof entry['draft'] === 'string' ? entry['draft'].trim()
    : typeof entry['body'] === 'string' ? entry['body'].trim()
    : typeof entry['text'] === 'string' ? entry['text'].trim()
    : '';

  if (!content) return null;

  const title =
    typeof entry['title'] === 'string' && entry['title'].trim().length > 0
      ? entry['title'].trim()
      : inferTitleFromDraft(content);

  const subreddit = normalizeSubreddit(
    typeof entry['subreddit'] === 'string'
      ? entry['subreddit']
      : typeof entry['name'] === 'string'
        ? entry['name']
        : 'r/marketing',
  );

  return { subreddit, title, content };
};

const normalizeSubreddit = (value: string): string => {
  const cleaned = value.trim().replace(/^\/+/, '');
  if (!cleaned) return 'r/marketing';
  return cleaned.toLowerCase().startsWith('r/') ? cleaned : `r/${cleaned}`;
};

const inferTitleFromDraft = (content: string): string => {
  const firstLine = content
    .split('\n')
    .map(line => line.trim())
    .find(Boolean) ?? 'AI marketing insights';
  return firstLine.slice(0, 120);
};

const parseRedditDrafts = (rawOutput: string): RedditDraft[] => {
  const cleaned = rawOutput
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const candidates: string[] = [cleaned];
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch && objectMatch[0] !== cleaned) candidates.push(objectMatch[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const sourceBuckets: unknown[] = Array.isArray(parsed)
        ? [parsed]
        : typeof parsed === 'object' && parsed !== null
          ? [
              (parsed as Record<string, unknown>)['drafts'],
              (parsed as Record<string, unknown>)['subreddits'],
              (parsed as Record<string, unknown>)['posts'],
              (parsed as Record<string, unknown>)['threads'],
              (parsed as Record<string, unknown>)['items'],
            ]
          : [];

      const merged = sourceBuckets
        .flatMap(bucket => Array.isArray(bucket) ? bucket : [])
        .map(item => (typeof item === 'object' && item !== null ? normalizeDraftEntry(item as Record<string, unknown>) : null))
        .filter((draft): draft is RedditDraft => Boolean(draft))
        .slice(0, 5);
      if (merged.length > 0) return merged;
    } catch {
      continue;
    }
  }

  if (cleaned.length > 0) {
    const content = cleaned.slice(0, 2000);
    return [{
      subreddit: 'r/marketing',
      title: inferTitleFromDraft(content),
      content,
    }];
  }

  return [];
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await authenticate(req.headers.get('authorization'));
  if (!auth.ok) {
    const [s, b] = authErrorToHttp(auth.error);
    return NextResponse.json(b, { status: s });
  }
  const { tenant } = auth.ctx;

  if (!process.env['DATABASE_URL']?.trim()) {
    return NextResponse.json({
      threads: [],
      tenantId: tenant.id,
      requiresHumanApproval: REDDIT_REQUIRES_HUMAN_APPROVAL,
      message: 'reddit queue database is not configured',
    }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const subs = (searchParams.get('subreddits') ?? 'r/marketing,r/SaaS')
    .split(',')
    .map(normalizeSubreddit)
    .filter(Boolean);

  const shouldGenerate = (searchParams.get('generate') ?? '1') !== '0';

  if (shouldGenerate) {
    const systemPrompt = 'You are a Reddit community manager simulator. Draft 2 posts for provided subreddits. Return JSON only: {"drafts":[{"subreddit":"r/marketing","title":"...","content":"..."}],"status":"pending_human_approval"}';
    const userPrompt = JSON.stringify({
      tenant: tenant.name,
      subreddits: subs,
      rules: [
        'Never publish automatically',
        'Keep it educational and safe',
        'Every draft must require human approval',
      ],
    });

    try {
      const ai = await runAgentCall('reddit_manager', tenant.tier, systemPrompt, userPrompt);
      const drafts = parseRedditDrafts(ai.output).filter(item => subs.length === 0 || subs.includes(item.subreddit));

      if (drafts.length > 0) {
        await Promise.all(drafts.map(draft => db.insert(redditThreads).values({
          id: uid('thread'),
          tenantId: tenant.id,
          subreddit: draft.subreddit,
          title: draft.title,
          draftResponse: draft.content,
          requiresHumanApproval: REDDIT_REQUIRES_HUMAN_APPROVAL,
        })));
      }
    } catch (err) {
      console.warn('[reddit-discover] draft generation failed:', err instanceof Error ? err.message : String(err));
    }
  }

  const rows = await db.select().from(redditThreads)
    .where(and(eq(redditThreads.tenantId, tenant.id), isNull(redditThreads.approvedAt)))
    .orderBy(desc(redditThreads.createdAt));

  const threads = rows
    .filter(row => subs.length === 0 || subs.includes(normalizeSubreddit(row.subreddit)))
    .map(row => ({
      id: row.id,
      subreddit: row.subreddit,
      title: row.title,
      draftResponse: row.draftResponse,
      requiresHumanApproval: row.requiresHumanApproval,
      createdAt: row.createdAt,
    }));

  return NextResponse.json({
    threads,
    subreddits: subs,
    tenantId: tenant.id,
    requiresHumanApproval: REDDIT_REQUIRES_HUMAN_APPROVAL, // always true
    message: 'Discovered threads queued for human review. Use POST /api/reddit/approve to approve.',
  });
}
