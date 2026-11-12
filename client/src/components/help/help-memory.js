/**
 * 안내를 한 번 끝까지 따라 한 적이 있는지 이 브라우저에 표시해 둡니다(예: 구글 로그인에 성공함).
 * 다음에는 같은 안내를 접은 상태로 보여 주기 위한 값이며, 계정·코드 같은 학생 정보는 담지 않습니다.
 * 저장소를 사용할 수 없으면(사생활 보호 모드 등) 아무 일도 하지 않고, 안내는 펼친 상태로 보입니다.
 */
const KEY = 'vpylab:help:done:v1';

/** 테스트에서는 저장소를 바꿔 넣습니다. 기본은 이 브라우저의 localStorage입니다. */
function storageOf(storage) {
  return storage || globalThis.localStorage;
}

function read(storage) {
  try {
    const parsed = JSON.parse(storageOf(storage).getItem(KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function isHelpDone(id, storage) {
  return read(storage)[id] === 1;
}

export function markHelpDone(id, storage) {
  try {
    const done = read(storage);
    if (done[id] === 1) return;
    storageOf(storage).setItem(KEY, JSON.stringify({ ...done, [id]: 1 }));
  } catch {
    // 저장하지 못해도 안내와 대화상자는 그대로 동작합니다.
  }
}
