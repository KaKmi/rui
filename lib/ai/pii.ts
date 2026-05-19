import { cleanExtractedText } from '@/lib/parsers/text-quality';

const MAX_RESUME_TEXT_CHARS = 12_000;

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CN_PHONE_RE = /(?:(?:\+?86[-\s]?)?1[3-9]\d[-\s]?\d{4}[-\s]?\d{4})/g;
const ID_CARD_RE = /\b\d{6}(?:19|20)\d{2}(?:0\d|1[0-2])(?:[0-2]\d|3[01])\d{3}[\dXx]\b/g;
const URL_RE = /https?:\/\/[^\s]+/gi;
const EXPLICIT_NAME_RE = /(?:姓名|Name)\s*[:：]\s*([\u4e00-\u9fff\s]{2,10})/gi;

const PROFILE_LINE_RE =
  /^(?:性别|年龄|出生年月|出生日期|生日|婚育|民族|籍贯|户籍|政治面貌)\s*[:：].*$/;

const NAME_LINE_DENY = new Set([
  '简历',
  '个人简历',
  '求职简历',
  '教育经历',
  '工作经历',
  '项目经历',
  '个人信息',
  '联系方式',
  '联系',
]);

export type ResumeRedactionResult = {
  candidateLabel: string;
  text: string;
  stats: {
    originalChars: number;
    redactedChars: number;
    clipped: boolean;
    emails: number;
    phones: number;
    ids: number;
    urls: number;
    names: number;
    profileLines: number;
  };
};

function countMatches(text: string, re: RegExp): number {
  return text.match(re)?.length ?? 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeNameCandidate(value: string): string {
  return value.replace(/\s/g, '').trim();
}

function looksLikeChineseName(value: string): boolean {
  if (NAME_LINE_DENY.has(value)) return false;
  return /^[\u4e00-\u9fff]{2,4}$/.test(value);
}

function addNameCandidate(names: Set<string>, value: string) {
  const compact = normalizeNameCandidate(value);
  if (looksLikeChineseName(compact)) {
    names.add(compact);
    return;
  }

  const duplicated = compact.match(/^([\u4e00-\u9fff]{2,4})\1$/);
  if (duplicated?.[1] && looksLikeChineseName(duplicated[1])) {
    names.add(duplicated[1]);
  }
}

function collectLikelyNames(text: string): string[] {
  const names = new Set<string>();
  const explicitMatches = Array.from(text.matchAll(EXPLICIT_NAME_RE));
  for (const match of explicitMatches) {
    if (match[1]) addNameCandidate(names, match[1]);
  }

  for (const line of text.split('\n').slice(0, 20)) {
    const segments = line.split(/[\t|｜,，/／]+/);
    for (const segment of segments) addNameCandidate(names, segment);
  }

  return Array.from(names);
}

function namePattern(name: string): RegExp {
  const pattern = Array.from(name).map(escapeRegExp).join('\\s*');
  return new RegExp(pattern, 'g');
}

export function redactResumeForLLM(rawText: string, resumeId: string): ResumeRedactionResult {
  const candidateLabel = `候选人 ${resumeId}`;
  const originalChars = rawText.length;
  let text = cleanExtractedText(rawText);

  const ids = countMatches(text, ID_CARD_RE);
  text = text.replace(ID_CARD_RE, '[ID_CARD]');

  const emails = countMatches(text, EMAIL_RE);
  text = text.replace(EMAIL_RE, '[EMAIL]');

  const phones = countMatches(text, CN_PHONE_RE);
  text = text.replace(CN_PHONE_RE, '[PHONE]');

  const urls = countMatches(text, URL_RE);
  text = text.replace(URL_RE, '[URL]');

  const likelyNames = collectLikelyNames(text);
  for (const name of likelyNames) {
    text = text.replace(namePattern(name), '[NAME]');
  }

  let profileLines = 0;
  text = text
    .split('\n')
    .map((line) => {
      if (PROFILE_LINE_RE.test(line.trim())) {
        profileLines += 1;
        return '[SENSITIVE_PROFILE_REMOVED]';
      }
      return line;
    })
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();

  const clipped = text.length > MAX_RESUME_TEXT_CHARS;
  if (clipped) {
    text = `${text.slice(0, MAX_RESUME_TEXT_CHARS)}\n\n[TRUNCATED_FOR_CONTEXT_LIMIT]`;
  }

  return {
    candidateLabel,
    text,
    stats: {
      originalChars,
      redactedChars: text.length,
      clipped,
      emails,
      phones,
      ids,
      urls,
      names: likelyNames.length,
      profileLines,
    },
  };
}
