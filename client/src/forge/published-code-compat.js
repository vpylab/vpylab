// 게시된 두 이전 형식의 원문을 검증할 때만 사용합니다.
export function writePublishedEnding(format, push, effectNames, hasSound, hasWaves) {
  if (format === 'wrapper') {
    writeLegacyWrapper(push, effectNames, hasSound, hasWaves);
    return;
  }
  push('object_3d = compound(parts, origin=origin)');
  push('# 기존 작품에서 사용한 속성과 함수도 같은 도형에 연결합니다.');
  push('object_3d.object = object_3d');
  if(hasWaves)push('effects = ['+effectNames.join(', ')+']');
  push('object_3d.parts = [object_3d]'+(hasWaves?' + effects':''));
  push('object_3d.active = True');
  push('def move_to(new_pos):');
  push('object_3d.pos = vector(new_pos)',2);
  push('object_3d.move_to = move_to');
  if(hasSound){
    push('object_3d._effect_running = False');
    writeBellClick(push, hasWaves, false);
    push('object_3d.on_click = on_click');
    push('scene.bind("click", on_click)');
  }
  push('def dispose():');
  push('if not object_3d.active:',2);
  push('return',3);
  push('object_3d.active = False',2);
  push('for item in object_3d.parts:',2);
  push('item.visible = False',3);
  if(hasSound)push('scene.unbind("click", on_click)',2);
  push('object_3d.dispose = dispose');
  push('return object_3d');
}

// 이전에 게시된 작품의 원문을 검증할 때만 생성하는 v1 형식입니다.
function writeLegacyWrapper(push, effectNames, hasSound, hasWaves) {
  push('object_3d = compound(parts)');push('effects = ['+effectNames.join(', ')+']');push('visible_parts = [object_3d] + effects');
  push('object_offset = vector(object_3d.pos - origin)');
  push('class Module:');
  push('def __init__(self):',2);push('self.object = object_3d',3);push('self.parts = visible_parts',3);push('self.active = True',3);
  if(hasSound){push('self._effect_running = False',3);push('self._handler = self.on_click',3);push('scene.bind("click", self._handler)',3);}
  push('@property',2);push('def pos(self):',2);push('return vector(self.object.pos - object_offset)',3);
  push('def move_to(self, new_pos):',2);push('self.object.pos = vector(new_pos) + object_offset',3);
  if(hasSound)writeBellClick(push, hasWaves, true);
  push('def dispose(self):',2);push('if not self.active:',3);push('return',4);push('self.active = False',3);push('for item in self.parts:',3);push('item.visible = False',4);
  if(hasSound)push('scene.unbind("click", self._handler)',3);
  push('return Module()');
}

function writeBellClick(push, hasWaves, legacy) {
  const owner=legacy?'self':'object_3d',body=legacy?'self.object':'object_3d';
  const line=(code,indent)=>push(code,(legacy?2:1)+indent);
  line((hasWaves?'async ':'')+`def on_click(${legacy ? 'self, ' : ''}event):`,0);
  line(`if not ${owner}.active or ${owner}._effect_running:`,1);
  line('return',2);
  line('picked = getattr(event, "pick", None)',1);
  line('if picked is None:',1);
  line('picked = scene.mouse.pick',2);
  line('picked = getattr(picked, "_id", picked)',1);
  line('if any(picked == getattr(item, "_id", item) for item in parts + [object_3d]):',1);
  line('# 소리와 비동기 이벤트는 VPyLab 확장입니다. 외부 환경에서는 해당 처리를 맞춰 주세요.',2);
  line('play_sound(tone_hz, duration=0.45)',2);
  if(hasWaves){
    line('# VPyLab의 비동기 이벤트로 음파 효과를 재사용합니다.',2);
    line(`${owner}._effect_running = True`,2);
    line('try:',2);
    line('for wave in effects:',3);
    line('wave.visible = True',4);
    line('for frame in range(36):',3);
    line(`if not ${owner}.active:`,4);
    line('break',5);
    line('for index, wave in enumerate(effects):',4);
    line(`wave.pos = vector(${body}.pos)`,5);
    line('wave.radius = (0.35 + frame/36*1.8 + index*0.18) * scale',5);
    line('wave.opacity = max(0, 0.65 * (1-frame/36))',5);
    line('await rate(60)',4);
    line('finally:',2);
    line('for wave in effects:',3);
    line('wave.visible = False',4);
    line(`${owner}._effect_running = False`,3);
  }
}

