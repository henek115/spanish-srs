export const CORRECT_THRESHOLD = 0.85;

export function stripAccents(text) {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export function normalize(text) {
  let t = text.trim().toLowerCase();
  t = stripAccents(t);
  t = t.replace(/[¿?¡!.,;:]/g, "");
  t = t.replace(/\s+/g, " ");
  return t.trim();
}

// Longest common contiguous block between a[alo:ahi] and b[blo:bhi].
function longestMatch(a, alo, ahi, b, blo, bhi) {
  let besti = alo, bestj = blo, bestsize = 0;
  let j2len = {};
  for (let i = alo; i < ahi; i++) {
    const newj2len = {};
    for (let j = blo; j < bhi; j++) {
      if (a[i] === b[j]) {
        const k = (j2len[j - 1] || 0) + 1;
        newj2len[j] = k;
        if (k > bestsize) {
          besti = i - k + 1;
          bestj = j - k + 1;
          bestsize = k;
        }
      }
    }
    j2len = newj2len;
  }
  return [besti, bestj, bestsize];
}

function matchedLength(a, alo, ahi, b, blo, bhi) {
  const [i, j, k] = longestMatch(a, alo, ahi, b, blo, bhi);
  if (k === 0) return 0;
  let total = k;
  if (alo < i && blo < j) total += matchedLength(a, alo, i, b, blo, j);
  if (i + k < ahi && j + k < bhi) total += matchedLength(a, i + k, ahi, b, j + k, bhi);
  return total;
}

export function similarity(a, b) {
  if (a.length === 0 && b.length === 0) return 1.0;
  const m = matchedLength(a, 0, a.length, b, 0, b.length);
  return (2.0 * m) / (a.length + b.length);
}

// expected может содержать несколько принятых вариантов через ';' или ','.
export function checkAnswer(userAnswer, expected) {
  const variants = expected.split(/[;,]/).map((v) => v.trim()).filter(Boolean);
  if (variants.length === 0) variants.push(expected);

  const userNorm = normalize(userAnswer);
  let bestRatio = 0;
  let bestVariant = variants[0];
  for (const variant of variants) {
    const r = similarity(userNorm, normalize(variant));
    if (r > bestRatio) {
      bestRatio = r;
      bestVariant = variant;
    }
  }

  return {
    correct: bestRatio >= CORRECT_THRESHOLD,
    accuracyPct: Math.round(bestRatio * 100),
    bestExpected: bestVariant,
  };
}