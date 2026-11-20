import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { hasPython, runPythonJobs } from './python-runner';

// Exercise the shipped VPython code through widget setup, before its playback loop.
const source = readFileSync('public/projects/seoul-moon/observer.py', 'utf8');
const setup = source.slice(0, source.indexOf('while True:'));

it.skipIf(!hasPython())('서울 관측소의 위상·표면 방향과 해·달의 첫 출현을 천문력과 대조한다', () => {
  const code = setup + `
# NASA SVS 5587, geocentric, 00:00 UTC. Surface longitude is positive eastward.
for month, day, fraction, longitude_ref, latitude_ref in [
    (1, 1, 91.40, -1.279, -6.556),
    (7, 20, 35.51, 6.982, 4.351),
    (11, 20, 74.39, -7.238, -3.431),
]:
    instant = datetime(2026, month, day, tzinfo=timezone.utc).timestamp()
    solar, lunar, eye, up, greenwich, elongation = sky_positions(instant)
    prime, north = lunar_frame(instant)
    toward = -norm(lunar)
    lit = 50*(1+dot(norm(solar-lunar),toward))
    assert abs(lit-fraction) < .05
    assert abs(degrees(atan2(dot(toward,cross(north,prime)),dot(toward,prime)))-longitude_ref) < .02
    assert abs(degrees(asin(dot(toward,north)))-latitude_ref) < .02

# USNO, 2026-11-20, 37.5665 N, 126.978 E, KST. Published to the nearest minute.
for body, hour, minute in [('해',7,17),('달',14,22)]:
    instant = datetime(2026,11,20,hour,minute,tzinfo=kst).timestamp()
    assert upper_limb(instant-60,body) < 0 < upper_limb(instant+60,body)
`;
  const result = runPythonJobs([{ id: 'seoul', label: 'ephemeris', code }]).get('seoul:ephemeris');
  expect(result.error).toBeNull();
});

it('서울 관측 지도를 쓰는 HTML에 원본 바이트와 제작자 표시를 함께 싣는다', async () => {
  const { generateProjectHTML } = await import('../utils/export-html');
  const page = await generateProjectHTML(source);
  const maps = JSON.parse(page.match(/const planetMaps = (\{.*\});/)[1]);
  expect(Object.keys(maps).sort()).toEqual(['earth', 'lroc-color', 'sun']);
  const original = readFileSync('public/projects/seoul-moon/lroc-color.jpg', 'base64');
  expect(maps['lroc-color'] === 'data:image/jpeg;base64,' + original).toBe(true);
  expect(page).toContain('NASA/Goddard Space Flight Center Scientific Visualization Studio, LROC, Arizona State University');

  const dynamic = await generateProjectHTML('surface = getattr(textures, name)');
  const dynamicMaps = JSON.parse(dynamic.match(/const planetMaps = (\{.*\});/)[1]);
  expect(Object.keys(dynamicMaps).sort()).toEqual(['earth', 'jupiter', 'moon', 'saturn', 'sun']);
});
