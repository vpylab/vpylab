import { useState } from 'react';
import { useUiText } from '../../i18n/ui-text';
import { DEFAULT_PLACEMENT, PLACEMENT_AXES, PLACEMENT_SLIDERS, colorVectorText, normalizePlacement, placementCode } from '../../forge/placement';

/**
 * 완성한 모듈을 놓아 보는 패널. 대장간의 "놓아 보기" 탭을 고른 동안에만 표시됩니다.
 */
export default function ForgePlacement({ factory, placement, onChange }) {
  const ui = useUiText();
  const [copied, setCopied] = useState('');
  const value = normalizePlacement(placement);
  const code = placementCode(factory, value);
  const set = (key, next) => {
    setCopied('');
    // 이전 값에서 이어서 바꿉니다. 두 조절기가 잇달아 바뀌어도 앞의 변경을 잃지 않습니다.
    onChange(previous => normalizePlacement({ ...previous, [key]: next }));
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(ui('사용 코드를 복사했습니다. 완성 모듈 코드 아래에 붙여 넣으세요.'));
    } catch {
      setCopied(ui('복사하지 못했습니다. 아래 코드를 직접 선택해 복사하세요.'));
    }
  };
  return (
    <div className="forge-placement" data-forge-placement="on">
      <div className="forge-placement-head">
        <strong>{ui('놓아 보기')}</strong>
        <span>
          <button type="button" onClick={() => onChange({ ...DEFAULT_PLACEMENT })}>{ui('처음 값으로 ↺')}</button>
        </span>
      </div>
      <p>{ui('미리보기의 선은 빨강이 x, 초록이 y, 파랑이 z 방향입니다.')}</p>
      <div className="forge-placement-sliders">
        {PLACEMENT_SLIDERS.map(slider => (
          <label key={slider.key} className="forge-slider">
            <span>
              {ui(slider.label)}
              <output htmlFor={'forge-place-' + slider.key}>{value[slider.key]}{slider.key === 'angle' ? '°' : ''}</output>
            </span>
            <input
              id={'forge-place-' + slider.key}
              type="range"
              min={slider.min}
              max={slider.max}
              step={slider.step}
              value={value[slider.key]}
              onChange={event => set(slider.key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>
      <div className="forge-placement-axis" role="group" aria-label={ui('돌리는 축')}>
        <span>{ui('돌리는 축')}</span>
        {Object.keys(PLACEMENT_AXES).map(axis => (
          <button key={axis} type="button" aria-pressed={value.axis === axis} onClick={() => set('axis', axis)}>
            {axis} · vector({PLACEMENT_AXES[axis].join(', ')})
          </button>
        ))}
      </div>
      <label className="forge-placement-color">
        <span>{ui('전체 색 (원래 색에 곱해집니다)')}</span>
        <input type="color" value={value.tint} onChange={event => set('tint', event.target.value)} />
        <code>{colorVectorText(value.tint)}</code>
      </label>
      <pre tabIndex={0}><code>{code}</code></pre>
      <div className="forge-export-actions">
        <button type="button" onClick={copy}>{ui('이 사용 코드 복사')}</button>
      </div>
      <p role="status" aria-live="polite">{copied}</p>
    </div>
  );
}
