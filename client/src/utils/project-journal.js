// 표시 순서가 개인 문서와 팀 저장소의 항해일지 양식을 함께 결정합니다.
export const journalFields = [
  ['did', '내가 한 일', '오늘 내가 직접 만들거나 확인한 것은?', 'What I did', 'What did you build or test today?'],
  ['blocker', '어려웠던 점과 해결 과정', '어디에서 막혔고 무엇을 시도했나요?', 'Challenges and solutions', 'Where did you get stuck, and what did you try?'],
  ['help', '친구와의 협력', '누구에게 어떤 도움을 주거나 받았나요?', 'Working together', 'Who did you help, or who helped you?'],
  ['source', '참고한 자료와 나의 시도', '어떤 자료에서 힌트를 얻고 어떻게 적용했나요?', 'References and experiments', 'What gave you a clue and how did you use it?'],
  ['thought', '느낀 점과 재미있었던 점', '기억하고 싶은 순간이나 새로 알게 된 점은?', 'Reflections and discoveries', 'What surprised you or made you smile?'],
  ['next', '다음에 해 볼 일', '다음 시간에 무엇을 해 볼까요?', 'What comes next', 'What would you like to try next time?'],
];

export function journalAnswers(values) {
  return journalFields.flatMap(([key, label]) => {
    const value = String(values?.[key] || '').trim().slice(0, 500);
    return value ? [[label, value]] : [];
  });
}

export function journalText(entry, author, markdown = false) {
  const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: entry.zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const safe = value => markdown ? value.replace(/[<>&*_\x5b\x5d#`@\\]/g, c => '&#' + c.charCodeAt(0) + ';').replace(/\n/g, ' ') : value;
  const stamp = fmt.format(new Date(entry.at));
  return [(markdown ? '## ' : '') + stamp + ' (' + entry.zone + ') · ' + safe(author),
    ...journalAnswers(entry.values).map(([label, value]) => (markdown ? '- ' : '') + label + ' — ' + safe(value))].join('\n');
}
