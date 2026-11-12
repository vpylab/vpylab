import { Component, Suspense, lazy } from 'react';

/**
 * 그 자리 안내를 화면에 연결하는 한 지점입니다(docs/SCOPE.md 애드온 규칙).
 *   <HelpSlot topic="drive-signin" waiting={…} popupBlocked={…} />
 * 안내는 따로 불러옵니다. 불러오지 못하거나 그리다가 오류가 나면 아무것도 보이지 않을 뿐,
 * 이 컴포넌트를 놓은 대화상자의 저장·연결 동작은 그대로입니다. 안내는 화면의 값을 읽기만 하고 바꾸지 않습니다.
 * topic 목록은 DialogHelp.jsx에 있습니다.
 */
const DialogHelp = lazy(() => import('./DialogHelp.jsx').catch(() => ({ default: () => null })));

class HelpBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function HelpSlot(props) {
  return (
    <HelpBoundary>
      <Suspense fallback={null}>
        <DialogHelp {...props} />
      </Suspense>
    </HelpBoundary>
  );
}
