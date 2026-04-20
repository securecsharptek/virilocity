// ─────────────────────────────────────────────────────────────────────────────
// Virilocity V16.4 — Content Fairness Filter  ·  TEVV FIX: BIAS COND → PASS
// Closes: Bias & Fairness Testing CONDITIONAL PASS (74/100) → PASS
//
// Applied to: GEOContentGenerator, CVROptimizer, EmailSequencer, AdCreativeGenerator
// Standard: NIST AI RMF Bias/Fairness · ISO/IEC TR 24027:2021
//
// Strategy:
//  1. Detect protected-class language in generated content
//  2. Detect demographic targeting language
//  3. Detect economic exclusion signals
//  4. Return structured audit log for compliance trail
// ─────────────────────────────────────────────────────────────────────────────

export interface FairnessResult {
  passed:      boolean;
  score:       number;       // 0–100, higher = more fair
  flags:       FairnessFlag[];
  sanitized:   string;       // content with flagged phrases replaced
  auditId:     string;
}

export interface FairnessFlag {
  category:  FairnessCategory;
  phrase:    string;
  severity:  'low' | 'medium' | 'high';
  offset:    number;
}

export type FairnessCategory =
  | 'demographic_targeting'
  | 'protected_class_reference'
  | 'economic_exclusion'
  | 'gender_bias'
  | 'age_bias'
  | 'ability_bias';

// ── Detection patterns stored as strings (compiled fresh per call to avoid
//    global-flag lastIndex state shared across concurrent test runners) ─────────
interface PatternDef {
  source:   string;
  flags:    string;
  category: FairnessCategory;
  severity: FairnessFlag['severity'];
}

const PATTERN_DEFS: PatternDef[] = [
  // Demographic targeting
  { source: String.raw`\b(target(?:ing|s)?\s+(?:only\s+)?(?:men|women|males?|females?|hispanics?|asians?|blacks?|whites?))\b`, flags:'gi', category:'demographic_targeting', severity:'high' },
  { source: String.raw`\b(exclusively\s+for\s+(?:men|women|professionals|executives|millennials|gen[- ]z|boomers?))\b`,       flags:'gi', category:'demographic_targeting', severity:'medium' },

  // Protected class references
  { source: String.raw`\b(if\s+you(?:'re|\s+are)\s+(?:a\s+)?(?:white|black|asian|hispanic|latino|female|male|christian|muslim|jewish))\b`, flags:'gi', category:'protected_class_reference', severity:'high' },
  { source: String.raw`\b(religion|ethnicity|race|national\s+origin)\s+(?:of\s+)?(?:our\s+)?(?:customers?|users?|clients?)\b`, flags:'gi', category:'protected_class_reference', severity:'medium' },

  // Economic exclusion
  { source: String.raw`\b(only\s+for\s+(?:high[- ]income|wealthy|rich|affluent|premium\s+clients?))\b`, flags:'gi', category:'economic_exclusion', severity:'medium' },
  { source: String.raw`\b(not\s+(?:for|suitable\s+for)\s+(?:small\s+businesses?|startups?|individuals?))\b`, flags:'gi', category:'economic_exclusion', severity:'low' },

  // Gender bias — suffix optional so "his business" alone triggers
  { source: String.raw`\b((?:his|her)\s+(?:business|company|team|employees?)(?:\s+(?:needs?|goals?|success))?)\b`, flags:'gi', category:'gender_bias', severity:'low' },
  { source: String.raw`\b(businessman|businesswoman|manpower|man[-\s]hours?)\b`, flags:'gi', category:'gender_bias', severity:'low' },

  // Age bias
  { source: String.raw`\b(too\s+old\s+for|not\s+(?:tech[- ]?savvy|digital[- ]native)|elderly\s+(?:users?|customers?))\b`, flags:'gi', category:'age_bias', severity:'medium' },

  // Ability bias
  { source: String.raw`\b(not\s+(?:suitable|designed)\s+for\s+(?:disabled|handicapped|impaired))\b`, flags:'gi', category:'ability_bias', severity:'high' },
];

let _auditCounter = 0;

// ── Main fairness filter ───────────────────────────────────────────────────────
export const applyFairnessFilter = (content: string): FairnessResult => {
  const auditId = `fair_${Date.now().toString(36)}_${(++_auditCounter).toString(36)}`;
  const flags: FairnessFlag[] = [];

  // Compile fresh RegExp each call — avoids shared global lastIndex state
  for (const def of PATTERN_DEFS) {
    const re = new RegExp(def.source, def.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      flags.push({ category: def.category, phrase: match[0], severity: def.severity, offset: match.index });
    }
  }

  // Sanitize: replace flagged phrases with neutral alternatives
  let sanitized = content;
  for (const flag of flags) {
    sanitized = sanitized.replace(flag.phrase, _neutralize(flag.category));
  }

  // Score: start at 100, deduct per flag weighted by severity
  const deductions: Record<FairnessFlag['severity'], number> = { low:5, medium:15, high:30 };
  const score = Math.max(0, 100 - flags.reduce((acc, f) => acc + deductions[f.severity], 0));

  return { passed: score > 70, score, flags, sanitized, auditId };
};

const _neutralize = (category: FairnessCategory): string => {
  switch (category) {
    case 'demographic_targeting':    return 'targeted to relevant audiences';
    case 'protected_class_reference':return 'our customers';
    case 'economic_exclusion':       return 'for businesses of all sizes';
    case 'gender_bias':              return 'their business';
    case 'age_bias':                 return 'all users';
    case 'ability_bias':             return 'all customers';
  }
};

// ── Batch filter (for agent pipelines) ───────────────────────────────────────
export const filterBatch = (items: string[]): FairnessResult[] =>
  items.map(applyFairnessFilter);
