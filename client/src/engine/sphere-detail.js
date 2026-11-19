import * as THREE from 'three';

const byScene = new WeakMap();
const registrations = new WeakMap();
const center = new THREE.Vector3();
const worldScale = new THREE.Vector3();

export function trackSphere(scene, mesh) {
  forgetSphere(mesh);
  let objects = byScene.get(scene);
  if (!objects) byScene.set(scene, objects = new Set());
  objects.add(mesh);
  registrations.set(mesh, objects);
}

export function forgetSphere(mesh) {
  registrations.get(mesh)?.delete(mesh);
  registrations.delete(mesh);
}

export function updateSphereDetail(scene, camera, height) {
  const objects = byScene.get(scene);
  if (!objects || !height) return;
  for (const mesh of objects) {
    if (!mesh.visible || !mesh.material.map) continue;
    mesh.getWorldPosition(center);
    const depth = -center.applyMatrix4(camera.matrixWorldInverse).z;
    if (depth <= 0) continue;
    const { radius, widthSegments } = mesh.geometry.parameters;
    // size로 키운 구도 화면에서 차지하는 크기대로 셉니다.
    mesh.getWorldScale(worldScale);
    const shownRadius = radius * Math.max(Math.abs(worldScale.x), Math.abs(worldScale.y), Math.abs(worldScale.z));
    const pixels = height * Math.abs(camera.projectionMatrix.elements[5]) * shownRadius / depth;
    // 두 경계에 여유를 두어 확대·축소할 때 매 프레임 메시를 바꾸지 않습니다.
    let segments = widthSegments;
    if (pixels < 30) segments = 24;
    else if (pixels > 220) segments = 96;
    else if (pixels > 45 && pixels < 160) segments = 48;
    if (segments === widthSegments) continue;
    const previous = mesh.geometry;
    mesh.geometry = new THREE.SphereGeometry(radius, segments, segments / 2);
    previous.dispose();
  }
}
