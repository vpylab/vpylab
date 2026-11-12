import { afterEach,expect,it } from 'vitest';
import { claimWordTip,readWordHelp,rememberWord } from './word-help';
afterEach(()=>localStorage.clear());
it('단어별 자동 안내는 두 번만 허용한다',()=>{expect(claimWordTip('sphere')).toBe(true);expect(claimWordTip('sphere')).toBe(true);expect(claimWordTip('sphere')).toBe(false);expect(claimWordTip('radius')).toBe(true);expect(readWordHelp().views.sphere).toBe(2);expect(claimWordTip('color')).toBe(false);});
it('알겠어요는 즉시 자동 안내를 중단하며 문서의 기존 기억 데이터도 읽는다',()=>{localStorage.setItem('vpylab:word-help:v1:guest',JSON.stringify(['compound']));expect(claimWordTip('compound')).toBe(false);rememberWord('opacity');expect(claimWordTip('opacity')).toBe(false);expect(readWordHelp().known).toEqual(['compound','opacity']);});
it('브라우저 보관 공간을 지우면 안내 횟수도 초기화한다',()=>{claimWordTip('radius');claimWordTip('radius');localStorage.clear();expect(claimWordTip('radius')).toBe(true);});
