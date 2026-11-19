/**
 * VPyLab — UI 위젯 시스템
 * Python에서 생성한 slider/button/checkbox/radio/menu/winput을
 * 메인 스레드의 DOM 패널에 렌더링하고, 사용자 입력을 Worker로 전달.
 *
 * 보안:
 * - 모든 텍스트는 textContent로만 설정 (innerHTML 금지)
 * - 위젯 ID는 신뢰된 워커에서 생성됨 (sanitize 불필요)
 */

import { postEvent, postWidgetValue, postInputValue } from './pyodide-singleton';

import { createWidgetPanel } from '../../../server/shared/widget-panel.js';

export const { createWidget, createInputPrompt, createPauseNotice, updateWidget, deleteWidget, clearWidgets } = createWidgetPanel(postEvent, postWidgetValue, postInputValue);
