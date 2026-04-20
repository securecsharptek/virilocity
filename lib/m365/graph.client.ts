// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Microsoft Graph Client
// GraphUsers · GraphMail · GraphCalendar · GraphSharePoint · GraphTeams
// App-only (daemon) + delegated (user) flows via MSAL
// ─────────────────────────────────────────────────────────────────────────────
import { Client }                     from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication, LogLevel } from '@azure/msal-node';
import { getSecret }                  from '../auth/keyvault';

// ── App-only Graph client ─────────────────────────────────────────────────────
let _appClient: Client | null = null;

export const getAppClient = async (): Promise<Client> => {
  if (_appClient) return _appClient;

  const clientSecret = await getSecret('entra-client-secret');
  const msal = new ConfidentialClientApplication({
    auth: {
      clientId:     process.env['ENTRA_CLIENT_ID']  ?? '',
      authority:    `https://login.microsoftonline.com/${process.env['ENTRA_TENANT_ID'] ?? 'common'}`,
      clientSecret,
    },
    system: { loggerOptions: { loggerCallback: () => {}, logLevel: LogLevel.Warning } },
  });

  const authResult = await msal.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });

  _appClient = Client.init({
    authProvider: done => done(null, authResult?.accessToken ?? ''),
  });

  return _appClient;
};

// ── Graph Users ───────────────────────────────────────────────────────────────
export class GraphUsers {
  constructor(private client: Client) {}

  async getMe(): Promise<Record<string, unknown>> {
    return this.client.api('/me').get() as Promise<Record<string, unknown>>;
  }

  async listUsers(): Promise<unknown[]> {
    const res = await this.client.api('/users').get() as { value: unknown[] };
    return res.value;
  }
}

// ── Graph Mail ────────────────────────────────────────────────────────────────
export class GraphMail {
  constructor(private client: Client) {}

  async sendEmail(msg: { to: string[]; subject: string; bodyHtml: string; cc?: string[] }): Promise<void> {
    await this.client.api('/me/sendMail').post({
      message: {
        subject: msg.subject,
        body:    { contentType: 'HTML', content: msg.bodyHtml },
        toRecipients:  msg.to.map(a => ({ emailAddress: { address: a } })),
        ccRecipients: (msg.cc ?? []).map(a => ({ emailAddress: { address: a } })),
      },
    });
  }

  async readInbox(top = 10): Promise<unknown[]> {
    const res = await this.client.api('/me/mailFolders/inbox/messages').top(top).get() as { value: unknown[] };
    return res.value;
  }
}

// ── Graph Calendar ────────────────────────────────────────────────────────────
export class GraphCalendar {
  constructor(private client: Client) {}

  async createEvent(event: { subject: string; start: string; end: string; attendees?: string[] }): Promise<Record<string, unknown>> {
    return this.client.api('/me/events').post({
      subject: event.subject,
      start:   { dateTime: event.start, timeZone: 'UTC' },
      end:     { dateTime: event.end,   timeZone: 'UTC' },
      attendees: (event.attendees ?? []).map(email => ({
        emailAddress: { address: email }, type: 'required',
      })),
    }) as Promise<Record<string, unknown>>;
  }
}

// ── Graph SharePoint ──────────────────────────────────────────────────────────
export class GraphSharePoint {
  constructor(private client: Client) {}

  async listSites(query = ''): Promise<unknown[]> {
    const endpoint = query
      ? `/sites?search=${encodeURIComponent(query)}`
      : '/sites?search=*';
    const res = await this.client.api(endpoint).get() as { value: unknown[] };
    return res.value;
  }

  async listDocuments(siteId: string, library = 'Documents'): Promise<unknown[]> {
    const res = await this.client
      .api(`/sites/${siteId}/drives`)
      .get() as { value: Array<{ name: string; id: string }> };
    const drive = res.value.find(d => d.name === library) ?? res.value[0];
    if (!drive) return [];
    const items = await this.client.api(`/drives/${drive.id}/root/children`).get() as { value: unknown[] };
    return items.value;
  }

  async uploadFile(siteId: string, fileName: string, content: Buffer): Promise<Record<string, unknown>> {
    return this.client
      .api(`/sites/${siteId}/drive/root:/${fileName}:/content`)
      .put(content) as Promise<Record<string, unknown>>;
  }
}

// ── Graph Teams ───────────────────────────────────────────────────────────────
export class GraphTeams {
  constructor(private client: Client) {}

  async listTeams(): Promise<unknown[]> {
    const res = await this.client.api('/me/joinedTeams').get() as { value: unknown[] };
    return res.value;
  }

  async listChannels(teamId: string): Promise<unknown[]> {
    const res = await this.client.api(`/teams/${teamId}/channels`).get() as { value: unknown[] };
    return res.value;
  }

  async sendChannelMessage(teamId: string, channelId: string, message: string): Promise<string> {
    // TEVV H-05: Adaptive Card schema validation would go here in V16.5
    const res = await this.client
      .api(`/teams/${teamId}/channels/${channelId}/messages`)
      .post({ body: { content: message, contentType: 'html' } }) as { id: string };
    return res.id;
  }

  async sendWeeklyKPI(teamId: string, channelId: string, kpis: {
    roas: number; aiScore: number; mqls: number; contentPieces: number; period: string;
  }): Promise<string> {
    const card = {
      type:    'AdaptiveCard',
      version: '1.4',
      body: [
        { type:'TextBlock', text:`📊 Weekly KPI Report — ${kpis.period}`, weight:'Bolder', size:'Medium' },
        { type:'FactSet', facts: [
          { title:'ROAS',          value:`${kpis.roas}x` },
          { title:'AI Visibility', value:`${kpis.aiScore}%` },
          { title:'MQLs',          value:String(kpis.mqls) },
          { title:'Content',       value:`${kpis.contentPieces} pieces` },
        ]},
      ],
    };
    const res = await this.client
      .api(`/teams/${teamId}/channels/${channelId}/messages`)
      .post({
        body: {
          contentType: 'html',
          content:     `<attachment id="kpi-card"></attachment>`,
        },
        attachments: [{
          id:          'kpi-card',
          contentType: 'application/vnd.microsoft.card.adaptive',
          content:     JSON.stringify(card),
        }],
      }) as { id: string };
    return res.id;
  }
}
