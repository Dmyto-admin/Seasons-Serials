// assistant-system/analyse-intent.js

/*
SUPER ADVANCED INTENT ANALYZER
v2

Goals:
- understand REAL language better
- typo tolerant
- phrase tolerant
- context aware
- semantic-ish scoring
- multilingual
- avoids stupid greeting bugs
- weighted intents
- emotional detection
- product/store understanding
- follow-up understanding
*/

const INTENT_DATABASE = {

  greeting: {
    weight: 1,

    phrases: [
      "hello",
      "hi",
      "hey",
      "good morning",
      "good evening",
      "good afternoon",

      "hola",
      "bonjour",
      "salut",

      "привіт",
      "добрий день",
      "добрий вечір"
    ]
  },

  thanks: {
    weight: 1,

    phrases: [
      "thanks",
      "thank you",
      "thank u",
      "many thanks",
      "appreciate it",

      "gracias",
      "merci",

      "дякую",
      "спасибі"
    ]
  },

  suggest: {
    weight: 4,

    phrases: [
      "recommend",
      "suggest",
      "show products",
      "show me products",
      "what can i buy",
      "what do you have",
      "i want to buy",
      "give me ideas",
      "show me something",

      "recomienda",
      "mostrar productos",

      "montre moi",

      "порадь",
      "покажи товари"
    ]
  },

  semantic_search: {
    weight: 6,

    phrases: [
      "something with",
      "looking for",
      "i want something",
      "find something",
      "find me",
      "i need something",
      "show me something",

      "algo con",
      "je cherche",

      "щось з",
      "я шукаю"
    ]
  },

  availability: {
    weight: 5,

    phrases: [
      "is it available",
      "available",
      "in stock",
      "can i buy this",
      "is this sold",

      "disponible",

      "в наявності",
      "доступний"
    ]
  },

  payment: {
    weight: 5,

    phrases: [
      "payment",
      "how to pay",
      "pay",
      "bank transfer",
      "purchase payment",

      "pago",
      "paiement",

      "оплата",
      "платити"
    ]
  },

  delivery: {
    weight: 5,

    phrases: [
      "delivery",
      "shipping",
      "when will it arrive",
      "how long delivery",
      "ship",

      "livraison",
      "entrega",

      "доставка"
    ]
  },

  report: {
    weight: 6,

    phrases: [
      "bug",
      "report",
      "error",
      "issue",
      "problem",
      "website broken",
      "doesn't work",

      "problema",
      "erreur",

      "помилка",
      "не працює"
    ]
  },

  help: {
    weight: 3,

    phrases: [
      "help",
      "assist",
      "support",
      "menu",
      "options",

      "aide",
      "ayuda",

      "допомога"
    ]
  },

  price: {
    weight: 5,

    phrases: [
      "price",
      "cost",
      "how much",
      "what is the price",
      "how expensive",

      "precio",
      "prix",

      "ціна",
      "скільки коштує"
    ]
  },

  product_info: {
    weight: 5,

    phrases: [
      "details",
      "description",
      "information",
      "tell me more",
      "more info",

      "detalles",
      "détails",

      "опис"
    ]
  },

  about_assistant: {
    weight: 4,

    phrases: [
      "what do you do",
      "what are you used for",
      "your purpose",
      "who are you",
      "what can you do",

      "para que sirves",
      "que haces",

      "a quoi tu sers",
      "que fais tu",

      "для чого ти",
      "що ти робиш"
    ]
  },

  seasons_serials: {
    weight: 5,

    phrases: [
      "seasons serials",
      "who created seasons serials",
      "who owns seasons serials",
      "company",
      "about the company",

      "empresa",

      "entreprise",

      "компанія"
    ]
  },

  product_search: {
    weight: 3,

    phrases: [
      "product",
      "item",
      "show item",
      "find product",

      "producto",

      "produit",

      "товар"
    ]
  },

  cheapest: {
    weight: 6,

    phrases: [
      "cheapest",
      "lowest price",
      "least expensive",
      "budget option",
      "most affordable",

      "mas barato",
      "más barato",

      "moins cher",

      "найдешевший"
    ]
  },

  expensive: {
    weight: 6,

    phrases: [
      "most expensive",
      "highest price",
      "premium",
      "luxury",
      "best quality",

      "mas caro",
      "más caro",

      "plus cher",

      "найдорожчий"
    ]
  },

  product_exists: {
    weight: 6,

    phrases: [
      "do you have this",
      "does this exist",
      "do you sell this",
      "is this a product",
      "check this product",

      "tienes esto",

      "avez vous",

      "у вас є"
    ]
  },

  sorry: {
    weight: 2,

    phrases: [
      "bad",
      "terrible",
      "wrong",
      "awful",
      "stupid",
      "doesn't work",
      "you failed",

      "mal",

      "погано"
    ]
  }
};

const STOP_WORDS = [
  "the","a","an","is","are","to","for","and","or",
  "this","that","i","you","we","it","of","on",
  "please","can","could","would"
];

const FOLLOW_UP_WORDS = [
  "yes",
  "yeah",
  "ok",
  "okay",
  "sure",
  "yep",
  "correct",
  "exactly",

  "так",
  "oui",
  "sí"
];

const NEGATIVE_WORDS = [
  "no",
  "wrong",
  "bad",
  "terrible",
  "awful",
  "stupid",
  "useless",
  "broken",

  "ні",
  "погано"
];

const QUESTION_WORDS = [
  "what",
  "how",
  "where",
  "why",
  "when",
  "which",

  "que",
  "como",

  "що",
  "як"
];

function normalize(text) {

  return text
    .toLowerCase()

    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

    .replace(/[^\p{L}\p{N}\s]/gu, " ")

    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {

  return normalize(text)
    .split(" ")
    .filter(Boolean);
}

function removeStopWords(words) {

  return words.filter(w => !STOP_WORDS.includes(w));
}

function levenshtein(a, b) {

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {

    for (let j = 1; j <= a.length; j++) {

      if (b.charAt(i - 1) === a.charAt(j - 1)) {

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

function similarity(a, b) {

  if (!a || !b) return 0;

  const distance = levenshtein(a, b);

  return 1 - distance / Math.max(a.length, b.length);
}

function containsPhrase(text, phrase) {

  return text.includes(phrase);
}

function semanticWordMatch(inputWords, phraseWords) {

  let score = 0;

  for (const pw of phraseWords) {

    for (const iw of inputWords) {

      if (iw === pw) {
        score += 3;
        continue;
      }

      if (iw.includes(pw) || pw.includes(iw)) {
        score += 2;
        continue;
      }

      const sim = similarity(iw, pw);

      if (sim > 0.82) {
        score += 2;
      }
      else if (sim > 0.72) {
        score += 1;
      }
    }
  }

  return score;
}

function detectEmotion(text) {

  const words = tokenize(text);

  let negative = 0;

  words.forEach(w => {

    if (NEGATIVE_WORDS.includes(w)) {
      negative++;
    }
  });

  if (negative >= 2) return "angry";

  return "neutral";
}

function detectQuestion(text) {

  const words = tokenize(text);

  return words.some(w => QUESTION_WORDS.includes(w));
}

function detectFollowUp(text) {

  const words = tokenize(text);

  return words.some(w => FOLLOW_UP_WORDS.includes(w));
}

function boostByStructure(text, intent) {

  let boost = 0;

  if (intent === "price") {

    if (
      text.includes("how much") ||
      text.includes("price")
    ) {
      boost += 8;
    }
  }

  if (intent === "availability") {

    if (
      text.includes("available") ||
      text.includes("in stock")
    ) {
      boost += 8;
    }
  }

  if (intent === "report") {

    if (
      text.includes("not working") ||
      text.includes("broken") ||
      text.includes("bug")
    ) {
      boost += 10;
    }
  }

  if (intent === "semantic_search") {

    if (
      text.includes("something with") ||
      text.includes("looking for") ||
      text.includes("i want something")
    ) {
      boost += 10;
    }
  }

  return boost;
}

function analyzeSingleIntent(intent, text, words) {

  const config = INTENT_DATABASE[intent];

  if (!config) return 0;

  let score = 0;

  for (const phrase of config.phrases) {

    const phraseWords = tokenize(phrase);

    // EXACT PHRASE
    if (containsPhrase(text, phrase)) {
      score += 15;
    }

    // WORD SEMANTICS
    score += semanticWordMatch(words, phraseWords);

    // PARTIAL STRUCTURE
    phraseWords.forEach(pw => {

      if (text.includes(pw)) {
        score += 1;
      }
    });
  }

  // STRUCTURAL BOOSTS
  score += boostByStructure(text, intent);

  // WEIGHT
  score *= config.weight;

  return score;
}

function postProcessIntent(bestIntent, score, text) {

  // greeting protection
  if (
    bestIntent === "greeting" &&
    text.split(" ").length > 4
  ) {
    return "clarify";
  }

  // weak greeting protection
  if (
    bestIntent === "greeting" &&
    score < 20
  ) {
    return "clarify";
  }

  // angry report detection
  const emotion = detectEmotion(text);

  if (
    emotion === "angry" &&
    (
      text.includes("not work") ||
      text.includes("broken") ||
      text.includes("error")
    )
  ) {
    return "report";
  }

  return bestIntent;
}

export function analyzeIntent(message, context = {}) {

  if (!message) return "clarify";

  const text = normalize(message);

  if (!text.length) {
    return "clarify";
  }

  // HARD BLOCKS
  if (
    text === "something else" ||
    text === "another" ||
    text === "different"
  ) {
    return "suggest";
  }

  // FOLLOW UP
  if (detectFollowUp(text)) {

    if (context.awaitingChoice) {
      return "confirm";
    }
  }

  const rawWords = tokenize(text);

  const words = removeStopWords(rawWords);

  let scores = {};

  for (const intent in INTENT_DATABASE) {

    scores[intent] = analyzeSingleIntent(
      intent,
      text,
      words
    );
  }

  // CONTEXT BOOSTS
  if (context.lastProduct) {

    if (detectQuestion(text)) {

      scores.price += 6;
      scores.product_info += 4;
      scores.availability += 5;
    }
  }

  // FIND BEST
  let bestIntent = "clarify";
  let bestScore = 0;

  for (const intent in scores) {

    if (scores[intent] > bestScore) {

      bestScore = scores[intent];
      bestIntent = intent;
    }
  }

  // MINIMUM CONFIDENCE
  if (bestScore < 12) {

    // SMART semantic fallback

    if (
      text.includes("want") ||
      text.includes("looking") ||
      text.includes("something") ||
      text.includes("find")
    ) {
      return "semantic_search";
    }

    return "clarify";
  }

  bestIntent = postProcessIntent(
    bestIntent,
    bestScore,
    text
  );

  console.log(
    "[INTENT ANALYZER]",
    {
      text,
      bestIntent,
      bestScore,
      scores
    }
  );

  return bestIntent;
}
