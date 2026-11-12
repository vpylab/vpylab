// 편집기와 공유 HTML이 같은 복합 객체 재질 규칙을 사용합니다.
// 독립 HTML에 함수 본문을 실을 수 있도록 외부 의존성은 THREE 인자로 받습니다.
export function createCompoundAppearanceTools(THREE) {
  const states = new WeakMap();
  const forMaterials = (object, visit) => {
    if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(visit);
    if (object.userData?.textMaterial) visit(object.userData.textMaterial);
  };
  function setOpacity(material, value, keepTransparent = false) {
    const transparent = keepTransparent || value < 1;
    if (material.transparent !== transparent) material.needsUpdate = true;
    material.opacity = value;
    material.transparent = transparent;
    material.depthWrite = !transparent;
  }
  function init(group) {
    const records = new Map();
    group.traverse(child => {
      if (child !== group && states.has(child)) states.get(child).frozen = true;
      forMaterials(child, material => {
      if (records.has(material)) return;
      records.set(material, {
        color: material.color?.clone(), opacity: material.opacity ?? 1,
        transparent: !!material.transparent,
      });
      material.userData ||= {};
      material.userData.vpInCompound = true;
      });
    });
    const state = { records, color: new THREE.Color(1, 1, 1), opacity: 1 };
    states.set(group, state);
    return state;
  }
  function apply(group, changes) {
    const state = states.get(group) || init(group);
    if (state.frozen) return;
    if (changes.color) state.color.setRGB(...changes.color);
    if (changes.opacity !== undefined) state.opacity = changes.opacity;
    for (const [material, base] of state.records) {
      if (base.color && material.color) {
        material.color.copy(base.color).multiply(state.color);
        if (material.emissiveIntensity > 0 && material.emissive) material.emissive.copy(material.color);
      }
      setOpacity(material, base.opacity * state.opacity, base.transparent);
      const uniforms = material.userData?.vpVertexOverrides;
      if (changes.shininess !== undefined) {
        if (uniforms) uniforms.shininess.value = changes.shininess;
        if ('roughness' in material) material.roughness = Math.max(0.05, 1 - changes.shininess);
      }
      if (changes.emissive !== undefined) {
        if (uniforms) uniforms.emissive.value = changes.emissive ? 1 : 0;
        if (material.emissive) material.emissive.copy(changes.emissive ? material.color : new THREE.Color(0, 0, 0));
        if ('emissiveIntensity' in material) material.emissiveIntensity = changes.emissive ? 0.8 : 0;
        material.needsUpdate = true;
      }
    }
  }
  return { init, apply, setOpacity };
}
