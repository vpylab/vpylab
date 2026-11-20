import * as THREE from 'three';

// 후광은 광원이 아닙니다. 다른 물체는 학생이 배치한 조명만 비춥니다.
const glows = new WeakMap();
// 원반 가장자리에서는 광구의 얕은 층을 보므로 중심보다 어둡고 따뜻하게 보입니다.
function shadePhotosphere(shader) {
  const chunk = '#include <emissivemap_fragment>';
  shader.fragmentShader = shader.fragmentShader.replace(chunk, `${chunk}
    float mu = max(dot(normal, normalize(vViewPosition)), 0.0);
    totalEmissiveRadiance *= mix(vec3(.64, .40, .24), vec3(1.16), sqrt(mu));
  `);
}

export function updateSolarGlow(mesh) {
  const material = mesh.material;
  const active = material?.userData?.textureSpec === 'preset:sun' && material.emissiveIntensity > 0;
  if (active && material.onBeforeCompile !== shadePhotosphere) {
    material.onBeforeCompile = shadePhotosphere;
    material.needsUpdate = true;
  } else if (!active && material?.onBeforeCompile === shadePhotosphere) {
    delete material.onBeforeCompile;
    material.needsUpdate = true;
  }
  let halo = glows.get(mesh);
  if (active && !halo) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // 자원이 부족한 기기에서는 후광만 생략합니다 (예외로 나머지 장면이 멈추지 않게)
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (const [offset, alpha] of [[0,.5],[.30,.38],[.44,.16],[.69,.04],[1,0]]) {
      gradient.addColorStop(offset, `rgba(255,152,57,${alpha})`);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,128,128);
    const map = new THREE.CanvasTexture(canvas);
    halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    }));
    halo.raycast = () => {};
    mesh.add(halo);
    glows.set(mesh, halo);
  }
  if (halo) {
    halo.visible = active;
    halo.scale.setScalar(5.5 * mesh.geometry.parameters.radius);
  }
}
