// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — AppSource: Teams App Manifest
// GET /appsource/manifest  (public — no auth required)
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import { VERSION } from '../../../lib/types/index';

export const runtime = 'edge';

const APP_URL   = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://app.virilocity.io';
const CLIENT_ID = process.env['ENTRA_CLIENT_ID']     ?? 'replace-with-app-registration-client-id';

export function GET() {
  return NextResponse.json({
    '$schema':        'https://developer.microsoft.com/en-us/json-schemas/teams/v1.17/MicrosoftTeams.schema.json',
    manifestVersion:  '1.17',
    version:          VERSION,
    id:               'b3c4d5e6-f7a8-4901-bcde-f01234567890',
    packageName:      'io.virilocity.app',
    contentLanguage:  'en-US',
    developer: {
      name:          'CloudOneSoftware LLC',
      websiteUrl:    'https://www.virilocity.io',
      privacyUrl:    `${APP_URL}/privacy`,
      termsOfUseUrl: `${APP_URL}/terms`,
    },
    name:        { short: 'Virilocity', full: 'Virilocity AI Marketing Autopilot' },
    description: {
      short: '39 AI agents — full marketing autopilot in Microsoft 365',
      full:  'Virilocity runs 39 AI marketing agents on complete autopilot, integrating natively with Microsoft Teams, Outlook, and SharePoint. Starting at $79/month — 97% more affordable than comparable platforms.',
    },
    icons:       { outline: 'assets/icon-outline-32.png', color: 'assets/icon-color-192.png' },
    accentColor: '#0D1B3E',
    staticTabs: [
      { entityId:'dashboard',      name:'Dashboard',      contentUrl:`${APP_URL}/teams`,             scopes:['personal','team'] },
      { entityId:'agents',         name:'Agents',         contentUrl:`${APP_URL}/teams?tab=agents`,  scopes:['personal','team'] },
      { entityId:'ai-visibility',  name:'AI Visibility',  contentUrl:`${APP_URL}/teams?tab=visibility`, scopes:['personal'] },
      { entityId:'kb',             name:'Knowledge Base', contentUrl:`${APP_URL}/teams?tab=kb`,      scopes:['personal','team'] },
    ],
    webApplicationInfo: { id: CLIENT_ID, resource: `api://${new URL(APP_URL).hostname}/${CLIENT_ID}` },
    validDomains: ['app.virilocity.io', 'virilocity.io', '*.virilocity.io'],
    permissions:  ['identity', 'messageTeamMembers'],
    devicePermissions: [],
    authorization: {
      permissions: {
        resourceSpecific: [
          { name: 'ChannelMessage.Send.Group', type: 'Application' },
          { name: 'TeamSettings.Read.Group',   type: 'Application' },
        ],
      },
    },
  });
}
