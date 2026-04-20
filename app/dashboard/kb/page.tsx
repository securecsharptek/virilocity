// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Knowledge Base Dashboard Page
// ─────────────────────────────────────────────────────────────────────────────
import type { Metadata } from 'next';
import Card   from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input  from '../../../components/ui/Input';
import Badge  from '../../../components/ui/Badge';
import { TIER_LIMITS } from '../../../lib/types/index';

export const metadata: Metadata = { title: 'Knowledge Base — Dashboard' };

const KB_CATEGORIES = [
  { id:'brand',      label:'Brand',      color:'navy'  },
  { id:'product',    label:'Product',    color:'teal'  },
  { id:'competitor', label:'Competitor', color:'amber' },
  { id:'market',     label:'Market',     color:'green' },
  { id:'legal',      label:'Legal',      color:'neutral'},
  { id:'other',      label:'Other',      color:'neutral'},
] as const;

export default function KBPage() {
  const tier    = 'pro';
  const limits  = TIER_LIMITS[tier];
  const hasKB   = limits.kbStorageGb > 0;

  return (
    <>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Knowledge Base</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {hasKB
              ? `${limits.kbStorageGb}GB storage · Shared with all org members · pgvector 1536-dim embeddings`
              : 'Upgrade to Starter or above to enable the Knowledge Base'}
          </p>
        </div>
        {hasKB && (
          <Button variant="secondary" size="sm" aria-label="Upload new document to knowledge base">
            <span aria-hidden="true">↑</span> Upload Document
          </Button>
        )}
      </header>

      {!hasKB ? (
        <Card padded>
          <div className="text-center py-8">
            <p className="text-4xl mb-3" aria-hidden="true">📚</p>
            <h2 className="text-lg font-bold text-navy mb-2">Knowledge Base Locked</h2>
            <p className="text-slate-500 text-sm mb-4">
              The Knowledge Base requires Starter tier or above.
            </p>
            <a href="/dashboard/billing"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal underline">
              View upgrade options →
            </a>
          </div>
        </Card>
      ) : (
        <>
          {/* Upload form */}
          <Card title="Add Document" className="mb-6">
            <form
              method="POST"
              action="/api/kb/upload"
              className="space-y-4"
              aria-label="Upload document to knowledge base"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Document Name" name="name" type="text"
                  required placeholder="Q1 2026 Brand Guidelines"
                  autoComplete="off" hint="Give the document a clear, searchable name" />
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select id="category" name="category"
                    className="input"
                    aria-label="Select document category">
                    {KB_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-1">
                  Content <span aria-label="required" className="text-danger">*</span>
                </label>
                <textarea
                  id="content" name="content" required rows={6}
                  className="input resize-y"
                  placeholder="Paste document content here — the AI agents will use this to personalize their outputs..."
                  aria-describedby="content-hint"
                />
                <p id="content-hint" className="text-xs text-slate-400 mt-1">
                  Plain text or markdown. Max 50,000 characters per document.
                </p>
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Upload & Index
              </Button>
            </form>
          </Card>

          {/* Document list */}
          <Card title="Documents" subtitle="Sorted by most recently uploaded">
            <div className="text-center py-10 text-slate-400">
              <p className="text-3xl mb-2" aria-hidden="true">📄</p>
              <p className="text-sm">No documents yet — upload your first document above.</p>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
