/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity between two strings (0-1).
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export interface MatchCandidate {
  id: string;
  name: string;
  sku: string;
}

export interface MatchResult {
  candidate_id: string | null;
  candidate_name: string | null;
  confidence: number;
}

/**
 * Find best matching stock item for a given name from AI scan.
 * - Exact SKU match = 1.0
 * - Fuzzy name match normalized and compared
 * - Threshold: 0.5 minimum to return a match
 */
export function findBestMatch(
  scanName: string,
  candidates: MatchCandidate[],
  threshold = 0.5
): MatchResult {
  const normalized = scanName.toLowerCase().trim();

  // Try exact SKU match first
  const skuMatch = candidates.find(
    (c) => c.sku.toLowerCase() === normalized
  );
  if (skuMatch) {
    return { candidate_id: skuMatch.id, candidate_name: skuMatch.name, confidence: 1.0 };
  }

  let bestMatch: MatchResult = { candidate_id: null, candidate_name: null, confidence: 0 };

  for (const candidate of candidates) {
    const nameSim = similarity(normalized, candidate.name.toLowerCase().trim());
    const skuSim = similarity(normalized, candidate.sku.toLowerCase().trim()) * 0.8;
    const score = Math.max(nameSim, skuSim);

    if (score > bestMatch.confidence) {
      bestMatch = { candidate_id: candidate.id, candidate_name: candidate.name, confidence: Math.round(score * 100) / 100 };
    }
  }

  if (bestMatch.confidence < threshold) {
    return { candidate_id: null, candidate_name: null, confidence: bestMatch.confidence };
  }

  return bestMatch;
}

/**
 * Calculate supplier name similarity, accounting for common suffixes
 * like "Sp. z o.o.", "S.A.", etc. that appear on invoices but not
 * necessarily in the database.
 *
 * Uses a combination of Levenshtein similarity and prefix-based matching:
 * if one name starts with the other, we compute similarity based on the
 * shorter name length, which handles suffix additions gracefully.
 */
function supplierSimilarity(a: string, b: string): number {
  const baseSim = similarity(a, b);

  // Check if the shorter string is a prefix of the longer one
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;

  if (longer.startsWith(shorter)) {
    // Prefix match: high confidence, scaled by length ratio
    // "Hurtownia ABC" prefix of "Hurtownia ABC Sp. z o.o." -> ~0.85
    const ratio = shorter.length / longer.length;
    return Math.max(baseSim, 0.6 + ratio * 0.4);
  }

  // Check if shorter is contained anywhere (not just prefix)
  if (longer.includes(shorter) && shorter.length >= 4) {
    const ratio = shorter.length / longer.length;
    return Math.max(baseSim, 0.5 + ratio * 0.3);
  }

  return baseSim;
}

/**
 * Match a supplier name from AI scan to existing suppliers.
 */
export function findBestSupplierMatch(
  scanName: string,
  suppliers: { id: string; name: string }[],
  threshold = 0.6
): { id: string | null; confidence: number } {
  const normalized = scanName.toLowerCase().trim();

  let bestId: string | null = null;
  let bestScore = 0;

  for (const supplier of suppliers) {
    const score = supplierSimilarity(normalized, supplier.name.toLowerCase().trim());
    if (score > bestScore) {
      bestScore = score;
      bestId = supplier.id;
    }
  }

  if (bestScore < threshold) return { id: null, confidence: Math.round(bestScore * 100) / 100 };
  return { id: bestId, confidence: Math.round(bestScore * 100) / 100 };
}
