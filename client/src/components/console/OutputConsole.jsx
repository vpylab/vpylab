import { useRef, useEffect } from 'react';
import { useI18n } from '../../i18n/useI18n';

/**
 * 파이썬 오류의 입문자용 설명 — 설명을 먼저, 원문 한 줄과 줄 번호를 아래에 작게 보여 준다.
 * 보안: 모든 문자열은 React 텍스트 노드(textContent)로만 렌더링한다.
 */
function ErrorExplanation({ item, t }) {
  const { title, explanation, hint, line } = item.details.explanation;
  const lineLabel = Number.isInteger(line) ? t('console.errorLine', { line }) : '';
  return (
    <div
      className="my-1 py-1.5 pl-2.5 pr-2 rounded-r animate-slide-up"
      role="alert"
      style={{
        borderLeft: '3px solid var(--color-error)',
        backgroundColor: 'color-mix(in srgb, var(--color-error) 6%, transparent)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div className="font-semibold" style={{ color: 'var(--color-error-text)' }}>
        <span style={{ marginRight: 4 }}>&#x2716;</span>
        {title}
      </div>
      <div className="mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{explanation}</div>
      {hint && (
        <div className="mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          <span style={{ marginRight: 4 }}>&#x2192;</span>
          {hint}
        </div>
      )}
      {item.details.codeLine && Number.isInteger(line) && (
        <div className="mt-1 text-xs whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {lineLabel}: {item.details.codeLine.trim()}
        </div>
      )}
      <div className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
        {lineLabel ? `${lineLabel} · ` : ''}{item.text}
      </div>
    </div>
  );
}

/**
 * 콘솔 출력 패널
 * 보안: textContent만 사용 (innerHTML 절대 금지 — XSS 방지)
 */
export default function OutputConsole({ outputs = [], onClear }) {
  const { t } = useI18n();
  const scrollRef = useRef(null);

  // 새 출력 시 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputs]);

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-3 py-1.5 text-xs shrink-0"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <span className="font-medium">{t('console.title')}</span>
        <button
          onClick={onClear}
          className="px-2 py-0.5 rounded text-xs cursor-pointer transition-colors"
          style={{
            // 모든 테마에서 대비 4.5:1 이상이 되도록 패널 바탕 + 테두리로 구분합니다.
            backgroundColor: 'var(--color-bg-panel)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {t('console.clear')}
        </button>
      </div>

      {/* 출력 영역 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 text-sm leading-relaxed"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {outputs.length === 0 ? (
          <div className="text-xs pt-4 text-center" style={{ color: 'var(--color-text-muted)' }}>
            {t('console.noOutput')}
          </div>
        ) : (
          outputs.map((item, i) => item.type === 'error' && item.details?.explanation ? (
            <ErrorExplanation key={i} item={item} t={t} />
          ) : (
            <div
              key={i}
              className="py-0.5 animate-slide-up"
              style={{
                // 상태 글자색은 테마별로 대비 4.6:1 이상이 되도록 계산한 *-text 토큰을 사용합니다.
                color: item.type === 'error'
                  ? 'var(--color-error-text)'
                  : item.type === 'warning'
                    ? 'var(--color-warning-text)'
                    : item.type === 'success'
                      ? 'var(--color-success-text)'
                      : 'var(--color-text-primary)',
              }}
            >
              {/* textContent만 사용 — XSS 방지 */}
              {item.type === 'error' && <span style={{ marginRight: 4, fontFamily: 'var(--font-sans)' }}>&#x2716;</span>}
              {item.type === 'warning' && <span style={{ marginRight: 4, fontFamily: 'var(--font-sans)' }}>&#x26A0;</span>}
              {item.type === 'success' && <span style={{ marginRight: 4, fontFamily: 'var(--font-sans)' }}>&#x2714;</span>}
              {item.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
