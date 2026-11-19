/**
 * VPyLab — 커맨드 재생기 (채점 테스트용)
 *
 * Worker가 보낸 JSON 커맨드 목록을 Three.js 없이 객체 레지스트리에만 반영한다.
 * 브릿지(vpython-bridge.js)가 레지스트리에 기록하는 규칙(registry-props.js)을 그대로 사용하므로
 * "코드 실행 → 레지스트리 → 채점" 경로를 테스트에서 재현할 수 있다.
 */

import { normalizeRenderColors } from '../../../server/shared/rgb-input.js';
import {
  registerObject, updateObject, getObject, registerNote, registerSound,
} from './object-registry';
import { freqToNoteName, hasSfx, hasBgm } from './sound-system';
import { getRegistryProps, getRegistryUpdates, DEFAULT_OBJECT_PROPS } from './registry-props';

/**
 * 커맨드 목록을 레지스트리에 적용
 * @param {object[]} commands - Python 측 _add_command()가 만든 커맨드 배열
 * @param {{ t?: number }} [options] - 시뮬레이션 시간 시작값 (궤적 기록용)
 */
export function applyCommandsToRegistry(commands, options = {}) {
  let t = options.t ?? 0;

  for (const command of commands) {
    const cmd = normalizeRenderColors(command);
    switch (cmd.action) {
      case 'create': {
        if (cmd.type === 'distant_light') {
          const direction = cmd.direction || DEFAULT_OBJECT_PROPS.distant_light.direction;
          registerObject('distant_light', getRegistryProps({ ...cmd, direction }), cmd.id);
        } else {
          registerObject(cmd.type, getRegistryProps(cmd), cmd.id);
        }
        break;
      }
      case 'compound':
        registerObject('compound', getRegistryProps(cmd), cmd.id);
        break;
      case 'update': {
        const obj = getObject(cmd.id);
        if (!obj) break;
        const updates = getRegistryUpdates(cmd, obj);
        if (Object.keys(updates).length > 0) {
          updateObject(cmd.id, updates, t++);
        }
        break;
      }
      case 'sound':
        // 브릿지의 sound-system이 setNotePlayCallback/setSoundEventCallback으로 기록하는 것과 같다
        if (cmd.method === 'note' && cmd.name) {
          registerNote(cmd.name, cmd.duration ?? 0.5, cmd.type || 'sine');
        } else if (cmd.method === 'chord' && Array.isArray(cmd.frequencies)) {
          const names = cmd.frequencies.slice(0, 24).map(freqToNoteName).filter(Boolean);
          if (names.length > 0) registerNote(names.join('+'), cmd.duration ?? 1.0, cmd.type || 'sine');
        } else if (cmd.method === 'sfx' && hasSfx(cmd.name)) {
          registerSound('sfx', cmd.name);
        } else if (cmd.method === 'bgm_start' && hasBgm(cmd.name)) {
          registerSound('bgm', cmd.name);
        }
        break;
      default:
        break;
    }
  }
}
