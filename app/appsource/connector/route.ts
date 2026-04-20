import { NextResponse } from 'next/server';
import { VERSION } from '../../../lib/types/index';
export const runtime = 'edge';
const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.virilocity.io';
export function GET() {
  return NextResponse.json({
    swagger:  '2.0',
    info:     { title: 'Virilocity Power Automate Connector', version: VERSION, description: '39 AI marketing agents for Microsoft Power Automate' },
    host:     new URL(APP_URL).hostname,
    basePath: '/',
    schemes:  ['https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    securityDefinitions: {
      oauth2: {
        type:             'oauth2',
        flow:             'accessCode',
        authorizationUrl: `${APP_URL}/api/m365/auth`,
        tokenUrl:         `${APP_URL}/api/m365/callback`,
        scopes:           { 'openid': 'Sign in', 'email': 'Read email' },
      },
    },
    paths: {
      '/api/agent/dispatch': { post: { operationId: 'agentDispatch',  summary: 'Dispatch AI marketing agent', security: [{ oauth2: [] }] } },
      '/api/autopilot':      { post: { operationId: 'runAutopilot',   summary: 'Run full autopilot cycle',    security: [{ oauth2: [] }] } },
      '/api/billing/plans':  { get:  { operationId: 'getBillingPlans', summary: 'Get available pricing plans', security: [] } },
      '/api/kb/upload':      { post: { operationId: 'uploadDocument',  summary: 'Upload knowledge base doc',  security: [{ oauth2: [] }] } },
      '/api/platform':       { get:  { operationId: 'getPlatform',    summary: 'Get platform metadata',       security: [] } },
    },
  });
}
