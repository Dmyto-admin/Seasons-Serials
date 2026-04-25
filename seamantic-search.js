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

    let score = 0;

    words.forEach(word => {
      if (description.includes(word)) {
        score += 2; // strong match
      }
    });

    // 🔥 STRICT FILTER (important)
    if (score >= 2) {
      results.push({
        id: p.id,
        name: p.querySelector(".product-name")?.innerText || "",
        price: p.querySelector(".product-price")?.innerText || "",
        description,
        score
      });
    }
  });

  return results.sort((a, b) => b.score - a.score);
}
