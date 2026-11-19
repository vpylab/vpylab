import { expect, it } from 'vitest';
import * as THREE from 'three';
import { trackSphere, forgetSphere, updateSphereDetail } from './sphere-detail.js';

it('같은 천체를 가까이서만 세밀하게 그리며 삭제 후에는 갱신하지 않는다', () => {
  const camera = new THREE.PerspectiveCamera(60,1,.1,500);
  const scene = new THREE.Scene();
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1,64,32), new THREE.MeshStandardMaterial({map:new THREE.Texture()}));
  scene.add(ball);
  trackSphere(scene, ball);
  ball.position.z = -100;
  updateSphereDetail(scene,camera,720);
  expect(ball.geometry.parameters.widthSegments).toBe(24);
  ball.position.z = -4;
  updateSphereDetail(scene,camera,720);
  expect(ball.geometry.parameters.widthSegments).toBe(96);
  forgetSphere(ball);
  ball.position.z = -100;
  updateSphereDetail(scene,camera,720);
  expect(ball.geometry.parameters.widthSegments).toBe(96);
});
