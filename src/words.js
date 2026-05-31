export const words = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "it",
  "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
  "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
  "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know",
  "take", "people", "into", "year", "your", "good", "some", "could",
  "them", "see", "other", "than", "then", "now", "look", "only", "come",
  "its", "over", "think", "also", "back", "after", "use", "two", "how",
  "our", "work", "first", "well", "way", "even", "new", "want", "because",
  "any", "these", "give", "day", "most", "us", "great", "between", "need",
  "large", "often", "hand", "high", "place", "hold", "turn", "where",
  "help", "through", "much", "before", "line", "right", "too", "mean",
  "old", "any", "same", "tell", "boy", "follow", "came", "want", "show",
  "form", "three", "small", "set", "put", "end", "does", "another", "well",
  "large", "big", "spell", "add", "even", "land", "here", "must", "big",
  "such", "turn", "here", "why", "ask", "went", "men", "read", "need",
  "land", "different", "home", "move", "try", "kind", "hand", "picture",
  "again", "change", "off", "play", "spell", "air", "away", "animal",
  "house", "point", "page", "letter", "mother", "answer", "found", "study",
  "still", "learn", "plant", "cover", "food", "sun", "four", "thought",
  "let", "keep", "children", "land", "side", "without", "boy",
  "once", "animal", "life", "enough", "took", "sometimes", "mountains",
  "cut", "young", "talk", "soon", "list", "song", "being", "leave",
  "family", "body", "music", "color", "stand", "sun", "questions", "fish",
  "area", "mark", "dog", "horse", "birds", "problem", "complete", "room",
  "knew", "since", "ever", "piece", "told", "usually", "friends",
  "easy", "heard", "order", "red", "door", "sure", "become", "top",
  "ship", "across", "today", "during", "short", "better", "best", "however",
  "low", "hours", "black", "products", "happened", "whole", "measure",
  "remember", "early", "waves", "reached", "listen", "wind", "rock",
  "space", "covered", "fast", "several", "hold", "himself", "toward",
  "five", "step", "morning", "passed", "vowel", "true", "hundred",
  "against", "pattern", "numeral", "table", "north", "slowly", "money",
  "map", "farm", "pulled", "draw", "voice", "seen", "cold", "cried",
  "plan", "notice", "south", "sing", "war", "ground", "fall", "king",
  "town", "unit", "figure", "certain", "field", "travel", "wood", "fire",
  "upon", "done", "dark", "machine", "base", "ago", "stood", "plane"
];

export function generateWords(count = 100) {
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(words[Math.floor(Math.random() * words.length)]);
  }
  return result.join(" ");
}