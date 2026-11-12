import { useCallback } from 'react';
import { translateUi } from '../../i18n/ui-text';
import useAppStore from '../../stores/appStore';
import additions from './en-ui-text.additions.json';

/**
 * 그 자리 안내(components/help)의 문구 번역.
 * 영어 번역은 이 폴더의 en-ui-text.additions.json을 먼저 보고, 없으면 앱의 번역(i18n/ui-text.js)을 따릅니다.
 * additions를 i18n/catalogs/en-ui-text.json에 합친 뒤에도 그대로 동작합니다(같은 번역을 두 곳에서 찾을 뿐입니다).
 */
const normalize = (value) => value.replace(/\s+/g, ' ').trim();

export function helpText(locale, source, ...values) {
  if (locale === 'en') {
    const tagged = Array.isArray(source) && Object.hasOwn(source, 'raw');
    const key = tagged ? source.map((part, i) => part + (i < values.length ? `{${i}}` : '')).join('') : source;
    if (typeof key === 'string' && Object.hasOwn(additions, normalize(key))) {
      return additions[normalize(key)].replace(/\{(\d+)\}/g, (token, i) => String(values[Number(i)] ?? token));
    }
  }
  return translateUi(locale, source, ...values);
}

/** h("한국어 원문") 또는 h`${값}이 들어간 원문` 형태로 사용합니다. locale은 구글·GitHub 화면 표기를 고를 때 사용합니다. */
export function useHelpText() {
  const locale = useAppStore((state) => state.locale);
  const h = useCallback((source, ...values) => helpText(locale, source, ...values), [locale]);
  return { h, locale };
}
