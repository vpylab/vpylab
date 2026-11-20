// #39의 WebGL2 점 셰이더를 내보낸 작품에도 넣는다.
export function configureCometParticles(THREE, pmat, cmd) {
  const plume = cmd.shape === 'plume';
  if (plume || cmd.shape === 'mist') {
    pmat.transparent = true;
    pmat.depthWrite = false;
    pmat.blending = THREE.AdditiveBlending;
    const clock = { value: cmd.flow_time ?? 0 };
    if (plume) pmat.userData.flowTime = clock;
    pmat.customProgramCacheKey = () => plume ? 'plume-v1' : 'mist-v1';
    pmat.onBeforeCompile = shader => {
      if (plume) {
        shader.uniforms.flowTime = clock;
        shader.vertexShader = `uniform float flowTime;
          varying float particleFade;
          float seed(uint n) {
            n = (n ^ (n >> 16u)) * 0x7feb352du;
            n = (n ^ (n >> 15u)) * 0x846ca68bu;
            return float(n ^ (n >> 16u)) / 4294967296.0;
          }
        ` + shader.vertexShader.replace('#include <begin_vertex>', `
          uint id = uint(gl_VertexID);
          float variation = seed(id + 19u);
          float age = fract(seed(id + 571u) + flowTime / mix(2.6, 6.8, variation));
          vec3 transformed = position * vec3(age, age * age, age);
          // 방출구에 작은 폭을 주고 꼬리 끝으로 갈수록 가닥을 느슨하게 벌립니다.
          float phase = seed(id + 41u) * 6.2831853;
          transformed.yz += .035 * vec2(cos(phase), sin(phase)) * (1.0 - age);
          transformed.z += .04 * age * sin(8.0 * age + phase);
          particleFade = smoothstep(0., .09, age) * (1. - smoothstep(.55, 1., age));
        `).replace('gl_PointSize = size;', 'gl_PointSize = size * mix(.55, 1.65, variation);');
        shader.fragmentShader = 'varying float particleFade;\n' + shader.fragmentShader;
      }
      shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', `
        vec2 offset = gl_PointCoord * 2.0 - 1.0;
        float radiusSquared = dot(offset, offset);
        diffuseColor.a *= ${plume ? 'particleFade' : '1.0'};
        diffuseColor.a *= exp(-3.6 * radiusSquared) * (1.0 - smoothstep(0.55, 1.0, radiusSquared));
        #include <alphatest_fragment>
      `);
    };
  }
}
