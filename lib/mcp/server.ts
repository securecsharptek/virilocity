import { VERSION, CODENAME, PLATFORM, AGENT_COUNT, DB_TABLES, type Tenant } from '../types/index';
import { getA2ASession } from '../a2a/session-store';
import { validateMcpServerConfig } from '../ai/client';

export const MCP_SERVER_NAME = 'virilocity-mcp' as const;
export const MCP_PROTOCOL_VERSION = '2025-03-26' as const;

export type McpRpcId = string | number | null;

export type McpRpcRequest = {
  jsonrpc?: '2.0';
  id?: McpRpcId;
  method?: string;
  params?: Record<string, unknown>;
};

export type McpRpcResponse = {
  jsonrpc: '2.0';
  id: McpRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

export type McpToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
};

export const MCP_TOOLS: readonly McpToolDefinition[] = [
  {
    name: 'virilocity.platform.info',
    title: 'Platform Info',
    description: 'Returns Virilocity platform metadata, AI model routing, and MCP configuration status.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'virilocity.health.live',
    title: 'Liveness Check',
    description: 'Returns liveness status for deployment and Claude Desktop connectivity checks.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'virilocity.health.ready',
    title: 'Readiness Check',
    description: 'Returns readiness information including MCP environment validation.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'virilocity.a2a.session.get',
    title: 'Get A2A Session',
    description: 'Returns a tenant-scoped A2A session by sessionId.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', minLength: 1 },
      },
      required: ['sessionId'],
      additionalProperties: false,
    },
  },
  {
    name: 'virilocity.mcp.config.validate',
    title: 'Validate MCP Config',
    description: 'Returns presence/absence of HUBSPOT_MCP_URL, M365_MCP_URL, and NEON_MCP_URL.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
] as const;

export const buildMcpMetadata = () => ({
  name: MCP_SERVER_NAME,
  version: VERSION,
  codename: CODENAME,
  platform: PLATFORM,
  protocol: MCP_PROTOCOL_VERSION,
  transport: 'sse',
  agents: AGENT_COUNT,
  dbTables: DB_TABLES,
  mcpTools: MCP_TOOLS.length,
  capabilities: {
    tools: {
      listChanged: false,
    },
  },
});

const ok = (id: McpRpcId, result: unknown): McpRpcResponse => ({
  jsonrpc: '2.0',
  id,
  result,
});

const fail = (id: McpRpcId, code: number, message: string, data?: unknown): McpRpcResponse => ({
  jsonrpc: '2.0',
  id,
  error: { code, message, data },
});

const getTool = (name: string): McpToolDefinition | undefined => MCP_TOOLS.find(tool => tool.name === name);

export const executeMcpTool = async (
  name: string,
  args: Record<string, unknown>,
  tenant: Tenant,
): Promise<unknown> => {
  switch (name) {
    case 'virilocity.platform.info':
      return {
        ...buildMcpMetadata(),
        tenantId: tenant.id,
        mcpConfig: validateMcpServerConfig(),
        models: {
          enterprise: 'claude-opus-4-6',
          default: 'claude-sonnet-4-6',
          highFrequency: 'claude-haiku-4-5-20251001',
        },
      };

    case 'virilocity.health.live':
      return {
        status: 'live',
        ok: true,
        timestamp: new Date().toISOString(),
      };

    case 'virilocity.health.ready':
      return {
        status: 'ready',
        ok: true,
        timestamp: new Date().toISOString(),
        mcpConfig: validateMcpServerConfig(),
      };

    case 'virilocity.a2a.session.get': {
      const sessionId = typeof args.sessionId === 'string' ? args.sessionId.trim() : '';
      if (!sessionId) {
        throw new Error('sessionId is required');
      }
      const session = await getA2ASession(sessionId);
      if (!session || session.tenantId !== tenant.id) {
        throw new Error('Session not found');
      }
      return {
        session,
      };
    }

    case 'virilocity.mcp.config.validate':
      return validateMcpServerConfig();

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
};

export const handleMcpRpc = async (
  request: McpRpcRequest,
  tenant: Tenant,
): Promise<McpRpcResponse> => {
  const id = request.id ?? null;
  const method = request.method?.trim();

  if (!method) {
    return fail(id, -32600, 'Invalid request: method is required');
  }

  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        serverInfo: {
          name: MCP_SERVER_NAME,
          version: VERSION,
        },
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
      });

    case 'ping':
      return ok(id, { pong: true, timestamp: new Date().toISOString() });

    case 'tools/list':
      return ok(id, { tools: MCP_TOOLS });

    case 'tools/call': {
      const toolName = typeof request.params?.name === 'string' ? request.params.name : '';
      if (!toolName) {
        return fail(id, -32602, 'Invalid params: name is required');
      }

      const tool = getTool(toolName);
      if (!tool) {
        return fail(id, -32601, `Tool not found: ${toolName}`);
      }

      const args = request.params?.arguments;
      const toolArgs = args && typeof args === 'object' && !Array.isArray(args)
        ? args as Record<string, unknown>
        : {};

      try {
        const data = await executeMcpTool(toolName, toolArgs, tenant);
        return ok(id, {
          tool: toolName,
          structuredContent: data,
          content: [
            {
              type: 'text',
              text: JSON.stringify(data),
            },
          ],
        });
      } catch (error) {
        return fail(id, -32000, error instanceof Error ? error.message : 'Tool execution failed');
      }
    }

    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
};