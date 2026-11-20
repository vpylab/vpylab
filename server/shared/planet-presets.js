// 정적으로 읽을 수 있는 재질만 내보내고 별칭·getattr처럼 실행해야 아는 경우 다섯 장을 함께 보관한다.
const planetNames = ['earth', 'moon', 'sun', 'jupiter', 'saturn'];

export function usedPlanetPresets(code) {
  const names = new Set();
  const rest = code.replace(/(?:\btextures|텍스처)\s*\.\s*([A-Za-z_][\w]*)|preset:([a-z_]+)/g, (match, attr, literal) => {
    names.add(attr || literal);
    return '';
  });
  const selected = /\btextures\b|텍스처/.test(rest) ? planetNames.slice() : planetNames.filter(name => names.has(name));
  // 서울 관측소의 관측 지도는 기본 재질과 별개로 정확한 작품 주소를 쓴 경우에만 싣습니다.
  if (/(["'])\/projects\/seoul-moon\/lroc-color\.jpg\1/.test(code)) selected.push('lroc-color');
  return selected;
}
