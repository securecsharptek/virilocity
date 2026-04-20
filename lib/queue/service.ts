// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Queue Service
// Vercel: uses DB-backed queue (Neon) + Vercel Cron instead of Azure Service Bus
// For hybrid Azure deployments: Azure Service Bus is used in lib/queue/servicebus.ts
// ─────────────────────────────────────────────────────────────────────────────
import { uid, now } from '../utils/index';
import type { AgentType } from '../types/index';

export interface QueueMessage {
  id:        string;
  tenantId:  string;
  type:      'agent' | 'autopilot' | 'email' | 'webhook';
  payload:   object;
  priority:  'normal' | 'high';
  createdAt: string;
  processAt: string;
}

// ── Enqueue agent task ────────────────────────────────────────────────────────
export const enqueueAgentTask = async (
  tenantId:  string,
  agentType: AgentType,
  input:     object = {},
  priority:  'normal' | 'high' = 'normal',
): Promise<string> => {
  const msg: QueueMessage = {
    id:        uid('msg'),
    tenantId,
    type:      'agent',
    payload:   { agentType, input },
    priority,
    createdAt: now(),
    processAt: now(), // immediate
  };

  // Production: INSERT INTO queue_messages (id, tenantId, type, payload, priority, processAt)
  // The cron job at /api/cron/autopilot polls this table
  return msg.id;
};

// ── Enqueue autopilot ─────────────────────────────────────────────────────────
export const enqueueAutopilot = async (
  tenantId: string,
  trigger:  'scheduled' | 'manual',
): Promise<string> => {
  const msg: QueueMessage = {
    id:        uid('msg'),
    tenantId,
    type:      'autopilot',
    payload:   { trigger },
    priority:  'normal',
    createdAt: now(),
    processAt: now(),
  };

  // Production: INSERT INTO queue_messages
  return msg.id;
};

// ── Process queue (called from cron) ─────────────────────────────────────────
export const processQueue = async (limit = 10): Promise<{ processed: number; failed: number }> => {
  // Production:
  // const messages = await db.select().from(queueMessages)
  //   .where(and(eq(queueMessages.status, 'pending'), lte(queueMessages.processAt, new Date())))
  //   .orderBy(desc(queueMessages.priority), asc(queueMessages.createdAt))
  //   .limit(limit);
  // for (const msg of messages) { ... process ... }
  return { processed: 0, failed: 0 };
};
