//
// REAL SEMANTIC SEARCH (NO AI, PURE MATCHING)
//

export function semanticSearchStrict(query) {
  const products = document.querySelectorAll(".sale-product-box");

  const normalizedQuery = normalize(query);
  const words = extractKeywords(normalizedQuery);

  const coreWords = words.filter(w => w.length >= 4); // FIX: lower threshold

  const results = [];

  products.forEach(p => {
    const wrapperId = p.querySelector(".more-info-product")?.dataset.wrapper;
    const wrapper = document.getElementById(wrapperId);

    if (!wrapper) return;

    const description = normalize(wrapper.innerText);

    let score = 0;
    let coreMatches = 0;

    for (const word of words) {
      if (description.includes(word)) {
        score += 1;
      }
    }

    for (const word of coreWords) {
      if (description.includes(word)) {
        score += 3;
        coreMatches++;
      }
    }

    results.push({
      id: p.id,
      name: p.querySelector(".product-name")?.innerText || "",
      price: p.querySelector(".product-price")?.innerText || "",
      description,
      score,
      coreMatches
    });
  });

  const sorted = results.sort((a, b) => b.score - a.score);

  if (sorted.length === 0) return [];

  const best = sorted[0];

  const second = sorted[1];

  const confidence =
    best.score >= 8 ||
    (best.coreMatches >= 2 && best.score >= 6);

  // ✅ HIGH CONFIDENCE → TOP 1 ONLY
  if (confidence) {
    return [best];
  }

  // ✅ MEDIUM → TOP 3
  if (best.score >= 4) {
    return sorted.slice(0, 3);
  }

  // ❌ WEAK → fallback top 3 anyway (NO EMPTY RESULTS)
  return sorted.slice(0, 3);
}
