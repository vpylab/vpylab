// 정적으로 읽을 수 있는 재질만 내보내고 별칭·getattr처럼 실행해야 아는 경우 다섯 장을 함께 보관한다.
const planetNames = ['earth', 'moon', 'sun', 'jupiter', 'saturn'];

export function usedPlanetPresets(code) {
  const names = new Set();
  const rest = code.replace(/(?:\btextures|텍스처)\s*\.\s*([A-Za-z_][\w]*)|preset:([a-z_]+)/g, (match, attr, literal) => {
    names.add(attr || literal);
    return '';
  });
  if (/\btextures\b|텍스처/.test(rest)) return planetNames.slice();
  return planetNames.filter(name => names.has(name));
}
