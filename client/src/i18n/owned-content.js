import { translateUi } from './ui-text';

const sourceFields = new Set(['code', 'accessibleCode', 'supportCode', 'copyCode', 'signature', 'url', 'path', 'id', 'ko', 'en']);
const englishCommands = { 음표:'play_note_and_wait', 소리:'play_sound' };
const ballIdentifiers = { 색상: 'color', 바꾸기: 'change_color', 이벤트: 'event' };
const ballColorNames = { 분홍: 'pink', 하늘: 'skyblue' };
const noteLetters = { 도:'C', 레:'D', 미:'E', 파:'F', 솔:'G', 라:'A', 시:'B' };
const isCoreCourse = id => ['two-ball-signals', 'first-lines', 'beg-light-sound', 'beg-github-project'].includes(id);
function englishNote(token) {
  const match=/^([도레미파솔라시])([#b]?)(-?\d+)?$/.exec(token);
  return match ? noteLetters[match[1]] + match[2] + (match[3] ?? '4') : token;
}
// 번역된 교재 설명의 코드 용어만 맞춥니다. 원래 play_note의 의미는 바꾸지 않습니다.
const englishCoreText = text => text.replace(/[가-힣]+(?:[#b](?:-?\d+)?|-?\d+)?/g, token => englishCommands[token] ?? englishNote(token));

export function localizeLessonCode(courseId, code, locale) {
  if (locale !== 'en' || !isCoreCourse(courseId) || typeof code !== 'string') return code;
  // 문자열·주석·식별자를 나눠 처리합니다. 주석/일반 문자열/기존 영문 호출은 그대로 둡니다.
  const tokens=/#[^\n]*|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[\p{L}_][\p{L}\p{N}_]*/gu;
  return code.replace(tokens, token => {
    if (token.startsWith('#')) return token;
    if (/^["']/.test(token)) {
      if (courseId === 'two-ball-signals' && Object.hasOwn(ballColorNames, token.slice(1, -1))) {
        return token[0] + ballColorNames[token.slice(1, -1)] + token[0];
      }
      const note=/^(["'])([도레미파솔라시][#b]?(?:-?\d+)?)\1$/.exec(token);
      return note ? note[1] + englishNote(note[2]) + note[1] : token;
    }
    if (courseId === 'two-ball-signals' && Object.hasOwn(ballIdentifiers, token)) return ballIdentifiers[token];
    return Object.hasOwn(englishCommands, token) ? englishCommands[token] : token;
  });
}

/** 서비스 교재의 표시 사본입니다. 원본과 학생이 편집한 코드는 바꾸지 않습니다. */
export function localizeCourse(course, locale, courseId = course?.id) {
  if (!course || locale !== 'en') return course;
  const core = isCoreCourse(courseId);
  const visit = (value, key) => {
    if (courseId === 'two-ball-signals' && key === 'line') return localizeLessonCode(courseId, value, locale);
    if (sourceFields.has(key)) return ['code', 'accessibleCode'].includes(key) ? localizeLessonCode(courseId, value, locale) : value;
    if (typeof value === 'string') {
      const translated = translateUi(locale, value);
      return core ? englishCoreText(translated) : translated;
    }
    if (Array.isArray(value)) return value.map(item => visit(item));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([field, item]) => [field, visit(item, field)]));
    return value;
  };
  return visit(course);
}
