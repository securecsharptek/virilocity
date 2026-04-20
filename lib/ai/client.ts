// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — AI Client
// Model routing: Opus (Enterprise) · Sonnet (default) · Haiku (high-freq)
// Fairness pipeline: ContentFairnessFilter on CONTENT_AGENTS
// ─────────────────────────────────────────────────────────────────────────────
import Anthropic from '@anthropic-ai/sdk';
import { MODELS, HAIKU_AGENTS } from '../types/index';
import { applyFairnessFilter, type FairnessResult } from './fairness.js';
import { withRetry, trunc } from '../utils/index';
import type { AgentType, Tier } from '../types/index';

const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

// Agents whose output must pass through the fairness filter
export const CONTENT_AGENTS = new Set<AgentType>([
  'geo_content_generator', 'ad_creative_generator', 'email_sequencer',
  'brand_voice_enforcer',  'content_repurposer',    'landing_page_optimizer',
]);

// ── Model routing (WAF Cost optimisation) ─────────────────────────────────────
export const routeModel = (agent: AgentType, tier: Tier): string => {
  if (tier === 'enterprise')       return MODELS.opus;
  if (HAIKU_AGENTS.has(agent))     return MODELS.haiku;
  return MODELS.sonnet;
};

// ── Core Claude call ──────────────────────────────────────────────────────────
export interface ClaudeCallOptions {
  model:     string;
  system:    string;
  messages:  Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
}

export const callClaude = async (opts: ClaudeCallOptions): Promise<string> => {
  const response = await anthropic.messages.create({
    model:      opts.model,
    system:     opts.system,
    messages:   opts.messages,
    max_tokens: opts.maxTokens ?? 800,
  });
  return response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('');
};

// ── Agent runner with fairness pipeline ──────────────────────────────────────
export interface AgentRunResult {
  output:         string;
  model:          string;
  durationMs:     number;
  fairness:       FairnessResult | null;
}

export const runAgentCall = async (
  agent:    AgentType,
  tier:     Tier,
  system:   string,
  userMsg:  string,
): Promise<AgentRunResult> => {
  const model   = routeModel(agent, tier);
  const start   = Date.now();

  const rawOutput = await withRetry(
    () => callClaude({ model, system, messages: [{ role: 'user', content: userMsg }] }),
    3, 200,
  );

  let output  = rawOutput;
  let fairness: FairnessResult | null = null;

  if (CONTENT_AGENTS.has(agent)) {
    fairness = applyFairnessFilter(rawOutput);
    output   = fairness.sanitized;
  }

  return { output: trunc(output, 2000), model, durationMs: Date.now() - start, fairness };
};

// ── MCP server registry (Claude API tool use) ─────────────────────────────────
export const MCP_SERVERS = {
  hubspot:   { name: 'hubspot-mcp',   url: process.env['HUBSPOT_MCP_URL']   ?? '' },
  m365:      { name: 'm365-mcp',      url: process.env['M365_MCP_URL']      ?? '' },
  neon:      { name: 'neon-mcp',      url: process.env['NEON_MCP_URL']      ?? '' },
} as const;
