// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — AI Client
// Model routing: Opus (Enterprise) · Sonnet (default) · Haiku (high-freq)
// Fairness pipeline: ContentFairnessFilter on CONTENT_AGENTS
// ─────────────────────────────────────────────────────────────────────────────
import Anthropic from '@anthropic-ai/sdk';
import { MODELS, HAIKU_AGENTS } from '../types/index';
import { applyFairnessFilter, type FairnessResult } from './fairness';
import { withRetry } from '../utils/index';
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

export const MCP_BETA_FLAG = 'mcp-client-2025-04-04' as const;

export const callClaude = async (opts: ClaudeCallOptions): Promise<string> => {
  const mcpServers = getConfiguredMcpServers();
  type ClaudeMessageCreateRequest = Parameters<typeof anthropic.messages.create>[0] & {
    betas?: string[];
    mcp_servers?: Array<{ name: string; url: string }>;
  };

  const request: ClaudeMessageCreateRequest = {
    model:      opts.model,
    system:     opts.system,
    messages:   opts.messages,
    max_tokens: opts.maxTokens ?? 2048,
  };

  if (mcpServers.length > 0) {
    request.betas = [MCP_BETA_FLAG];
    request.mcp_servers = mcpServers;
  }

  const response = await (anthropic.messages.create as unknown as (params: ClaudeMessageCreateRequest) => Promise<Awaited<ReturnType<typeof anthropic.messages.create>>>)(request);
  if (!('content' in response) || !Array.isArray(response.content)) {
    return '';
  }

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

  return { output, model, durationMs: Date.now() - start, fairness };
};

// ── MCP server registry (Claude API tool use) ─────────────────────────────────
export const MCP_SERVERS = {
  hubspot:   { name: 'hubspot-mcp',   url: process.env['HUBSPOT_MCP_URL']   ?? '' },
  m365:      { name: 'm365-mcp',      url: process.env['M365_MCP_URL']      ?? '' },
  neon:      { name: 'neon-mcp',      url: process.env['NEON_MCP_URL']      ?? '' },
} as const;

export const getConfiguredMcpServers = (): Array<{ name: string; url: string }> => {
  return Object.values(MCP_SERVERS)
    .map(server => ({ name: server.name, url: server.url.trim() }))
    .filter(server => server.url.length > 0);
};

export const validateMcpServerConfig = () => {
  const env = {
    HUBSPOT_MCP_URL: (process.env['HUBSPOT_MCP_URL'] ?? '').trim(),
    M365_MCP_URL: (process.env['M365_MCP_URL'] ?? '').trim(),
    NEON_MCP_URL: (process.env['NEON_MCP_URL'] ?? '').trim(),
  };

  return {
    enabled: Object.values(env).some(Boolean),
    enabledCount: Object.values(env).filter(Boolean).length,
    missing: Object.entries(env).filter(([, value]) => !value).map(([key]) => key),
    configured: Object.entries(env).filter(([, value]) => Boolean(value)).map(([key, value]) => ({ key, url: value })),
  };
};
