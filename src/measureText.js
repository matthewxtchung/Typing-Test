let canvas;
export function measureWord(word, font) {
  if (!canvas) canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = font;
  return ctx.measureText(word + " ").width;
}

export function buildLines(words, containerWidth, font) {
  const lines = [];
  let currentLine = [];
  let currentWidth = 0;

  for (const word of words) {
    const wordWidth = measureWord(word, font);
    if (currentWidth + wordWidth > containerWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [word];
      currentWidth = wordWidth;
    } else {
      currentLine.push(word);
      currentWidth += wordWidth;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);
  return lines;
}