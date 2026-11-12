import { Component } from 'react';

/**
 * 애드온 경계: 애드온을 불러오지 못하거나 애드온 안에서 오류가 나도 화면의 나머지(실행·저장)는 그대로 동작하게 합니다.
 * (docs/SCOPE.md 애드온 규칙 1·4) 오류가 나면 아무것도 그리지 않고 onError로 한 번 알립니다.
 */
export default class AddonBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
