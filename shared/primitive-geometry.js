// Three.js의 중심 기준 기하를 VPython의 pos(밑면 중심) 기준으로 맞춥니다.
// 편집기와 독립 HTML에서 같은 생성기를 사용합니다.
export function createPrimitiveGeometry(THREE) {
 return {
  // 밑면 중심에서 +X 방향으로 뻗는 직사각형 밑면의 사각뿔입니다.
  pyramid(size){return new THREE.ConeGeometry(1,1,4,1,false,Math.PI/4).rotateZ(-Math.PI/2).translate(.5,0,0).scale(size[0],size[1]/Math.SQRT2,size[2]/Math.SQRT2);},
  cylinder(radius,length){return new THREE.CylinderGeometry(radius,radius,length,32).translate(0,length/2,0);},
  cone(radius,length){return new THREE.ConeGeometry(radius,length,32).translate(0,length/2,0);},
 };
}
