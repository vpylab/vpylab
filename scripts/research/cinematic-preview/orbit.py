from vpython import *
scene.lights = []
scene.ambient = color.gray(0.12)
sun = sphere(radius=1.65, texture=textures.fire, emissive=True)
local_light(pos=sun.pos, color=vector(1, 0.95, 0.86), intensity=70)
earth = sphere(radius=0.88, texture=textures.earth)
moon = sphere(radius=0.30, texture=textures.rock, shininess=0)
t = 0
while True:
    rate(60)
    earth.pos = 5 * vector(cos(t), 0, sin(t))
    moon.pos = earth.pos + 1.65 * vector(cos(6*t+0.9), 0.12*sin(6*t+0.9), sin(6*t+0.9))
    t += pi/720
