export type TextQuality = {
  chars: number;
  effectiveChars: number;
  cjkChars: number;
  latinChars: number;
  digitChars: number;
  replacementChars: number;
  lineCount: number;
  uniqueLineRatio: number;
  flags: string[];
};

function count(text: string, re: RegExp): number {
  return text.match(re)?.length ?? 0;
}

function compactCjkSpaces(value: string): string {
  let text = value;
  let prev = '';
  while (prev !== text) {
    prev = text;
    text = text.replace(/([\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])/g, '$1');
  }
  return text;
}

function cleanLine(line: string): string {
  const cells = line
    .trim()
    .split(/\t+/)
    .map((cell) => compactCjkSpaces(cell.replace(/[ \u00a0\u3000]+/g, ' ').trim()))
    .filter(Boolean);

  if (cells.length === 0) return '';
  const unique = Array.from(new Set(cells));
  if (unique.length === 1) return unique[0] ?? '';
  return cells.join('\t');
}

export function cleanExtractedText(input: string): string {
  const lines = input
    .normalize('NFKC')
    .replace(/\u0000/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(cleanLine)
    .filter(Boolean);

  const deduped: string[] = [];
  for (const line of lines) {
    if (line !== deduped[deduped.length - 1]) deduped.push(line);
  }

  return deduped.join('\n').replace(/\n{4,}/g, '\n\n\n').trim();
}

export function assessTextQuality(text: string): TextQuality {
  const compact = text.replace(/\s/g, '');
  const cjkChars = count(compact, /[\u4e00-\u9fff]/g);
  const latinChars = count(compact, /[A-Za-z]/g);
  const digitChars = count(compact, /\d/g);
  const replacementChars = count(compact, /[�□]/g);
  const effectiveChars = cjkChars + latinChars + digitChars;
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const uniqueLineRatio = lines.length > 0 ? new Set(lines).size / lines.length : 0;
  const flags: string[] = [];

  if (effectiveChars < 120) flags.push('too-short');
  if (compact.length > 0 && effectiveChars / compact.length < 0.45) flags.push('low-text-density');
  if (replacementChars > Math.max(8, effectiveChars * 0.03)) flags.push('garbled');
  if (lines.length < 5 && effectiveChars < 300) flags.push('too-few-lines');
  if (lines.length >= 8 && uniqueLineRatio < 0.35) flags.push('too-repetitive');

  return {
    chars: text.length,
    effectiveChars,
    cjkChars,
    latinChars,
    digitChars,
    replacementChars,
    lineCount: lines.length,
    uniqueLineRatio,
    flags,
  };
}

export function textQualityError(source: 'PDF' | 'DOCX', quality: TextQuality): string | null {
  if (quality.flags.length === 0) return null;
  if (quality.flags.includes('too-short') || quality.flags.includes('too-few-lines')) {
    return `${source} 可抽取文本太少，可能是扫描件或图片型简历；请上传可复制文字的 PDF/DOCX。`;
  }
  if (quality.flags.includes('garbled') || quality.flags.includes('low-text-density')) {
    return `${source} 文本抽取质量过低，疑似乱码或版式不可读；请上传可复制文字的 PDF/DOCX。`;
  }
  if (quality.flags.includes('too-repetitive')) {
    return `${source} 文本重复率过高，疑似解析异常；请换用 DOCX 或重新导出 PDF。`;
  }
  return null;
}
