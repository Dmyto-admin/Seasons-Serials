//
// REAL SEMANTIC SEARCH (NO AI, PURE MATCHING)
//

export function semanticSearchStrict(query) {
  const products = document.querySelectorAll(".sale-product-box");

  const normalizedQuery = normalize(query);
  const words = extractKeywords(normalizedQuery);

  const results = [];

  products.forEach(p => {
    const wrapperId = p.querySelector(".more-info-product")?.dataset.wrapper;
    const wrapper = document.getElementById(wrapperId);

    if (!wrapper) return;

    const description = normalize(wrapper.innerText);
    const name = normalize(p.querySelector(".product-name")?.innerText || "");

    let score = 0;

    words.forEach(word => {
      if (description.includes(word)) score += 2;
      if (name.includes(word)) score += 3; // 🔥 NAME BOOST (important)
    });

    if (score > 0) {
      results.push({
        id: p.id,
        name: p.querySelector(".product-name")?.innerText || "",
        price: p.querySelector(".product-price")?.innerText || "",
        description,
        score
      });
    }
  });

  const sorted = results.sort((a, b) => b.score - a.score);

  if (sorted.length === 0) return [];

  const topScore = sorted[0].score;

  // 🧠 CASE 1 — STRONG CERTAINTY (ONE OR TIES)
  const strongMatches = sorted.filter(p => p.score === topScore);

  if (topScore >= 4) {
    return strongMatches; // top 1 or tied
  }

  // 🧠 CASE 2 — MEDIUM CONFIDENCE → top 3
  return sorted.slice(0, 3);
}

function normalize(text) {
  return text.toLowerCase().trim();
}

function extractKeywords(text) {
  return text.split(" ").filter(w => w.length > 2);
}
