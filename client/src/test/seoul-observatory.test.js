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
    zoom_control.value = level_for_zoom(factor)
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

it.skipIf(!hasPython())('태양을 향해 시작하고, 드래그 후에도 눈 위치와 조명은 고정된다', () => {
  const fixed = source.replace('observation_start = None', 'observation_start = 1795144500')
    .replace('recorded_view = tracking_mode', 'recorded_view = solar_mode');
  const code = fixed.replace('while True:', `class Pointer:
    def __init__(self, name, x, y):
        self.event, self.clientX, self.clientY = name, x, y

for step in range(3):
    if step == 1:
        look_around(Pointer("mousedown", 120, 180))
        look_around(Pointer("mousemove", 175, 205))
        look_around(Pointer("mouseup", 175, 205))
    if step == 2:
        look_around(Pointer("mousemove", 260, 225))
        zoom_control.value = level_for_zoom(32)
        set_zoom(zoom_control)`) + `
    assert sun.visible and solar_disc.visible
    assert mag((solar_disc.pos-observer_eye) / disc_depth - (sun.pos-observer_eye)) < 1e-10
    assert abs(solar_disc.radius / disc_depth - sun.radius) < 1e-10
    assert scene.camera.pos == observer_eye
    if step == 0:
        initial = scene.camera.axis
        assert initial == norm(sun.pos-observer_eye)
        direction = sunlight.direction
    if step == 1:
        turned = scene.camera.axis
        assert mag(turned-initial) > .01
    if step == 2:
        assert scene.camera.axis == turned and sunlight.direction == direction
`;
  expect(runPythonJobs([{ id: 'seoul', label: 'look', code }]).get('seoul:look').error).toBeNull();
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

it.skipIf(!hasPython())('서울의 밤하늘에서 축소하면 태양까지 보이고, 돌아오면 원래 달을 본다', () => {
  const fixed = source.replace('observation_start = None', 'observation_start = 1743417900');
  const code = fixed.replace('while True:', `for level in [level_for_zoom(145), 32, 24, 12, 0, 32, level_for_zoom(145)]:
    change_level(level)`) + `
    if level >= 32:
        assert not sun.visible and not earth.visible
        assert scene.camera.pos == observer_eye and moon.visible
    else:
        assert earth.visible and moon.visible and sun.visible and not ground.visible
    if level == 0:
        direction = norm(scene.camera.axis)
        right = norm(cross(direction, scene.up))
        top = cross(right, direction)
        for body in [sun, earth, moon]:
            sight = body.pos-scene.camera.pos
            height = dot(sight,direction)*tan(scene.fov/2)
            assert abs(dot(right,sight))+body.radius < height*aspect
            assert abs(dot(top,sight))+body.radius < height
    assert stamp == observation_start
`;
  expect(runPythonJobs([{id: 'seoul', label: 'pullback', code}]).get('seoul:pullback').error).toBeNull();
});

it.skipIf(!hasPython())('우주에서 시간을 진행한 뒤 서울로 돌아와도 달과 태양광의 상대 방향을 보존한다', () => {
  const fixed = source.replace('observation_start = None', 'observation_start = 1743417900');
  const code = fixed.replace('while True:', `for days, level in [(0,0),(2,0),(5,0),(5,8),(5,20),(5,31.99),(5,32),(5,level_for_zoom(145))]:
    stamp = observation_start + days*86400
    change_level(level)`) + `
    physical = norm(solar-lunar)
    if level < 32:
        assert mag(norm(sun.pos-moon.pos) - physical) < 1e-8
        assert mag(sunlight.direction + physical) < 1e-8
        toward = moon.pos - scene.camera.pos
        forward = norm(scene.camera.axis)
        side = norm(cross(forward,scene.up))
        top = cross(side,forward)
        height = dot(toward,forward)*tan(scene.fov/2)
        assert abs(dot(toward,side))+moon.radius < height*aspect
        assert abs(dot(toward,top))+moon.radius < height
    else:
        assert moon.visible and scene.camera.pos == observer_eye
        assert mag(sunlight.direction+local_vector(physical,east,north,up)) < 1e-8
        assert mag(moon.axis-local_vector(prime,east,north,up)) < 1e-8
        assert 53 < lit < 55
    assert instant == observation_start + days*86400
`;
  expect(runPythonJobs([{id: 'seoul', label: 'sunlight', code}]).get('seoul:sunlight').error).toBeNull();
});
