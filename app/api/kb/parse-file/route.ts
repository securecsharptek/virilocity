// ─────────────────────────────────────────────────────────────────────────────
// POST /api/kb/parse-file
// Accepts a multipart upload, extracts plain text, returns it to the client.
// Supported: .pdf  .txt  .md  .csv
// The caller is responsible for saving the extracted text via uploadKbDoc.
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { auth as nextAuth } from '../../../../auth';
import { authenticate, authErrorToHttp } from '../../../../lib/auth/middleware';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB hard cap

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth — bearer token or session
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const result = await authenticate(authHeader);
    if (!result.ok) {
      const [s, b] = authErrorToHttp(result.error);
      return NextResponse.json(b, { status: s });
    }
  } else {
    const session = await nextAuth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart request' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
  }

  const name = file.name ?? 'document';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';

  let text = '';

  try {
    if (ext === 'pdf') {
      // Dynamic import keeps pdf-parse out of edge bundles
      // pdf-parse may export either as default or as named; handle both
      const pdfMod = await import('pdf-parse');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParse = (pdfMod as any).default ?? (pdfMod as any);
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await pdfParse(buffer);
      text = result.text ?? '';
    } else if (['txt', 'md', 'csv', 'json'].includes(ext)) {
      text = await file.text();
    } else {
      return NextResponse.json(
        { error: `Unsupported file type ".${ext}". Upload a PDF, TXT, MD, or CSV file.` },
        { status: 415 },
      );
    }
  } catch {
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 422 });
  }

  // Normalise whitespace produced by PDF layout engines
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) {
    return NextResponse.json({ error: 'No readable text found in file' }, { status: 422 });
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  return NextResponse.json({ text, filename: name, wordCount });
}
