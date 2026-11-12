import { afterEach, expect, it } from 'vitest';
import { PERSONAL_HOME_KEY, parsePersonalHome, readPersonalHome, removePersonalHome, resetPersonalHome, writePersonalHome } from './personal-home';
afterEach(()=>localStorage.clear());
it('현재 코드 사본을 이 브라우저에 보관하며 초기화와 삭제가 다른 저장소 값을 지우지 않는다',()=>{
 localStorage.setItem('other-key','keep');expect(readPersonalHome()).toBeNull();expect(writePersonalHome({project:{title:'만두',code:'sphere()'}}).ok).toBe(true);
 expect(readPersonalHome().project.title).toBe('만두');expect(Object.keys(JSON.parse(localStorage.getItem(PERSONAL_HOME_KEY)))).toContain('project');
 expect(resetPersonalHome()).toBe(true);expect(readPersonalHome()).toMatchObject({enabled:false,project:{code:'sphere()'}});expect(localStorage.getItem('other-key')).toBe('keep');
 expect(removePersonalHome()).toBe(true);expect(readPersonalHome()).toBeNull();expect(localStorage.getItem('other-key')).toBe('keep');
});
it('꾸미기 변경과 작품 교체는 서로의 설정을 유지한다',()=>{
 writePersonalHome({greeting:'나의 우주',background:'#123456'});writePersonalHome({project:{title:'별',code:'sphere()'}});writePersonalHome({background:'#abcdef'});
 expect(readPersonalHome()).toMatchObject({greeting:'나의 우주',background:'#abcdef',project:{title:'별',code:'sphere()'}});
});
it('잘못된 데이터와 큰 코드를 거부하고 기존 작품을 보존한다',()=>{
 writePersonalHome({project:{title:'기존',code:'sphere()'}});expect(writePersonalHome({project:{code:'가'.repeat(20_000)}}).ok).toBe(false);expect(readPersonalHome().project.title).toBe('기존');
 expect(parsePersonalHome('{')).toBeNull();expect(parsePersonalHome(JSON.stringify({version:2}))).toBeNull();expect(parsePersonalHome('x'.repeat(400_001))).toBeNull();
 expect(writePersonalHome({project:{code:'   '}}).ok).toBe(false);
});
it('썸네일은 크기가 제한된 래스터만 사용하고 배경에는 CSS 주소를 허용하지 않는다',()=>{
 const value=parsePersonalHome(JSON.stringify({version:1,background:'url(https://example.com)',greeting:'<script>hi</script>',project:{code:'sphere()',thumbnail:'data:image/svg+xml;base64,PHN2Zz4='}}));
 expect(value.background).toBeNull();expect(value.project.thumbnail).toBeNull();expect(value.greeting).toBe('<script>hi</script>');
});
it('저장 공간 실패 시 성공으로 표시하지 않는다',()=>{
 const broken={getItem(){throw new Error('blocked');},setItem(){throw new Error('quota');},removeItem(){throw new Error('blocked');}};
 expect(readPersonalHome(broken)).toBeNull();expect(writePersonalHome({greeting:'hi'},broken).ok).toBe(false);expect(resetPersonalHome(broken)).toBe(false);expect(removePersonalHome(broken)).toBe(false);
});
it('큰 썸네일을 먼저 제외하고 빈 코드 오류를 구분한다',()=>{
 const result=writePersonalHome({project:{code:'sphere()',thumbnail:'data:image/png;base64,'+'A'.repeat(410_000)}});expect(result.ok).toBe(true);expect(readPersonalHome().project.thumbnail).toBeNull();expect(writePersonalHome({project:{code:' '}}).error).toContain('코드를 작성');
});

it('기본 복구 뒤 조명만 바꿔도 이전 문구·배경·사본은 보존되고 개인 화면은 다시 켜지지 않는다',()=>{
 writePersonalHome({greeting:'나의 우주',background:'#123456',project:{title:'별',code:'sphere()'},lights:[{brightness:.5}]});
 resetPersonalHome();expect(readPersonalHome().lights).toBeNull();writePersonalHome({lights:[{brightness:.7}]});
 expect(readPersonalHome()).toMatchObject({enabled:false,greeting:'나의 우주',background:'#123456',project:{code:'sphere()'},lights:[{brightness:.7},{}]});
});
