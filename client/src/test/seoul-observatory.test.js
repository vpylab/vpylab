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

it.skipIf(!hasPython())('서울에서 관측한 달의 고도와 밝은 면을 JPL Horizons와 대조한다', () => {
  const code = setup + `
for year, month, day, hour, minute, height, fraction in [
    (2025, 3, 31, 19, 45, 16.19870, 5.62977),
    (2020, 9, 24, 20, 0, 24.78540, 53.97131),
    (2023, 12, 27, 21, 40, 46.58955, 99.51410),
]:
    instant = datetime(year, month, day, hour, minute, tzinfo=kst).timestamp()
    solar, lunar, eye, up, greenwich, elongation = sky_positions(instant)
    assert abs(degrees(asin(dot(norm(lunar-eye), up))) - height) < .05
    assert abs(50*(1+dot(norm(solar-lunar), norm(eye-lunar))) - fraction) < .05
`;
  const result = runPythonJobs([{ id: 'seoul', label: 'observations', code }]).get('seoul:observations');
  expect(result.error).toBeNull();
});

it.skipIf(!hasPython())('멈춘 관측소에서 줌을 왕복해도 같은 달과 조명, 카메라 위치를 보존한다', () => {
  const fixed = source.replace('observation_start = None', 'observation_start = 1743417900');
  const code = fixed.replace('while True:', `frames = []
for factor in [1, 32, 160, 1]:
    zoom_control.value = factor
    set_zoom(zoom_control)`) + `
    frames.append((moon, moon.pos, moon.radius, moon.axis, moon.up, sunlight.direction, scene.camera.pos, scene.camera.axis, stamp))
    assert abs(1/tan(scene.fov/2) - factor*min(1, aspect)) < .0001
assert len(frames) == 4
for frame in frames:
    assert frame == frames[0]
`;
  const result = runPythonJobs([{ id: 'seoul', label: 'zoom', code }]).get('seoul:zoom');
  expect(result.error).toBeNull();
});
