//
// REAL SEMANTIC SEARCH (NO AI, PURE MATCHING)
//

export function semanticSearchStrict(query) {
  const products = document.querySelectorAll(".sale-product-box");

  const normalizedQuery = normalize(query);
  const words = extractKeywords(normalizedQuery);

  // 🔥 detect core intent words (important ones)
  const coreWords = words.filter(w => w.length >= 5);

  const results = [];

  products.forEach(p => {
    const wrapperId = p.querySelector(".more-info-product")?.dataset.wrapper;
    const wrapper = document.getElementById(wrapperId);

    if (!wrapper) return;

    const description = normalize(wrapper.innerText);

    let score = 0;
    let coreMatches = 0;

    words.forEach(word => {
      if (description.includes(word)) {
        score += 1;
      }
    });

    // 🔥 CORE MATCH BOOST (VERY IMPORTANT)
    coreWords.forEach(word => {
      if (description.includes(word)) {
        score += 3;
        coreMatches++;
      }
    });

    // 🚫 HARD RULE: must match at least 1 core idea
    if (coreWords.length && coreMatches === 0) return;

    // 🚫 HARD RULE: reject weak matches
    if (score < 4) return;

    results.push({
      id: p.id,
      name: p.querySelector(".product-name")?.innerText || "",
      price: p.querySelector(".product-price")?.innerText || "",
      description,
      score
    });
  });

  return results.sort((a, b) => b.score - a.score);
}
