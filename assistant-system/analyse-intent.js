//
// ADVANCED INTENT ENGINE
// Uses INTENTS from chat.js
//

//
// TYPO CORRECTION
//
const TYPO_MAP = {
  "helo": "hello",
  "helllo": "hello",
  "hii": "hi",
  "byu": "buy",
  "prodct": "product",
  "prce": "price",
  "delivry": "delivery",
  "paymant": "payment",
  "recomend": "recommend"
};


//
// NORMALIZATION
//
export function normalizeAdvanced(text) {

  let t = text.toLowerCase();

  //
  // FIX TYPOS
  //
  Object.entries(TYPO_MAP).forEach(([wrong, correct]) => {

    const regex = new RegExp(`\\b${wrong}\\b`, "g");

    t = t.replace(regex, correct);

  });

  //
  // REMOVE ACCENTS
  //
  t = t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  //
  // CLEAN SYMBOLS
  //
  t = t
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return t;
}


//
// EMOTION DETECTION
//
export function detectEmotion(text) {

  const t = text.toLowerCase();

  if (
    /\b(angry|terrible|awful|hate|stupid|idiot|worst|bad)\b/i.test(t)
  ) {
    return "negative";
  }

  if (
    /\b(amazing|awesome|great|perfect|love)\b/i.test(t)
  ) {
    return "positive";
  }

  return "neutral";
}


//
// ENTITY EXTRACTION
//
export function extractEntities(text) {

  const words = text.split(" ");

  return {
    colors: words.filter(w =>
      [
        "red","blue","green",
        "yellow","black","white",
        "purple","orange"
      ].includes(w)
    ),

    themes: words.filter(w =>
      [
        "nature","forest","mountain",
        "summer","winter","fantasy",
        "space","kids","magic"
      ].includes(w)
    )
  };
}


//
// SMART SCORING
//
function scorePhraseMatch(message, phrase) {

  let score = 0;

  //
  // EXACT MATCH
  //
  if (message === phrase) {
    score += 15;
  }

  //
  // FULL PHRASE
  //
  if (message.includes(phrase)) {
    score += 10;
  }

  //
  // WORD MATCHING
  //
  const phraseWords = phrase.split(" ");
  const msgWords = message.split(" ");

  phraseWords.forEach(word => {

    if (word.length < 2) return;

    //
    // EXACT WORD
    //
    if (msgWords.includes(word)) {
      score += 3;
    }

    //
    // PARTIAL WORD
    //
    msgWords.forEach(mw => {

      if (
        mw.length > 4 &&
        (
          mw.includes(word) ||
          word.includes(mw)
        )
      ) {
        score += 1;
      }

    });

  });

  return score;
}


//
// CONTEXT BOOST
//
function applyMemoryBoost(scores, memory = {}) {

  if (memory.lastProduct) {

    if (scores.price) scores.price += 3;

    if (scores.availability) {
      scores.availability += 3;
    }

    if (scores.product_info) {
      scores.product_info += 3;
    }
  }

  if (memory.expectingChoice) {

    if (scores.semantic_search) {
      scores.semantic_search += 4;
    }

  }

  return scores;
}


//
// MAIN ANALYZER
//
export function analyzeIntentAdvanced(
  message,
  INTENTS,
  memory = {}
) {

  const msg = normalizeAdvanced(message);

  //
  // SPECIAL FOLLOWUPS
  //
  if (/^(yes|yeah|ok|sure|yep)$/i.test(msg)) {

    return {
      intent: "confirmation",
      confidence: 0.99,
      emotion: detectEmotion(msg),
      entities: extractEntities(msg)
    };

  }

  if (/^(no|nope|nah|wrong)$/i.test(msg)) {

    return {
      intent: "rejection",
      confidence: 0.99,
      emotion: detectEmotion(msg),
      entities: extractEntities(msg)
    };

  }

  //
  // SCORE ALL INTENTS
  //
  const scores = {};

  let bestIntent = "clarify";
  let bestScore = 0;

  Object.entries(INTENTS).forEach(([intent, langs]) => {

    scores[intent] = 0;

    //
    // FLATTEN ALL LANGUAGE PHRASES
    //
    const phrases = Object.values(langs).flat();

    phrases.forEach(phrase => {

      scores[intent] += scorePhraseMatch(
        msg,
        normalizeAdvanced(phrase)
      );

    });

    //
    // BOOST COMMON INTENTS
    //
    if (
      intent === "semantic_search" &&
      /\b(i want|looking for|something with|find me)\b/i.test(msg)
    ) {
      scores[intent] += 10;
    }

    //
    // TRACK BEST
    //
    if (scores[intent] > bestScore) {

      bestScore = scores[intent];
      bestIntent = intent;

    }

  });

  //
  // MEMORY BOOST
  //
  applyMemoryBoost(scores, memory);

  //
  // RECALCULATE BEST AFTER BOOST
  //
  Object.entries(scores).forEach(([intent, score]) => {

    if (score > bestScore) {

      bestScore = score;
      bestIntent = intent;

    }

  });

  //
  // SMART FALLBACKS
  //

  //
  // LONG UNKNOWN SENTENCE
  //
  if (
    bestScore < 4 &&
    msg.split(" ").length >= 4
  ) {
    bestIntent = "semantic_search";
  }

  //
  // SHORT UNKNOWN
  //
  if (bestScore < 2) {
    bestIntent = "clarify";
  }

  //
  // PREVENT FALSE GREETINGS
  //
  if (
    bestIntent === "greeting" &&
    bestScore < 10
  ) {
    bestIntent = "clarify";
  }

  //
  // CONFIDENCE
  //
  const confidence = Math.min(
    1,
    bestScore / 15
  );

  return {
    intent: bestIntent,
    confidence,
    scores,
    normalized: msg,
    emotion: detectEmotion(msg),
    entities: extractEntities(msg)
  };
}
