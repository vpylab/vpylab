# 보안 정책 (Security Policy)

## 지원 버전 (Supported Versions)

| 버전 | 지원 상태 |
|------|-----------|
| 0.1.x (현재) | 보안 패치 지원 |

## 취약점 신고 (Reporting a Vulnerability)

VPy Lab은 **학생과 교사가 사용하는 교육 플랫폼**입니다. 보안은 최우선 과제입니다.

### 신고 방법

보안 취약점을 발견하셨다면:

1. **공개 Issue로 신고하지 마세요.**
2. **GitHub 비공개 신고**: [비공개 보안 보고서 작성](https://github.com/vpylab/vpylab/security/advisories/new) (Private vulnerability reporting)

### 신고 포함 사항

- 취약점 설명
- 재현 방법
- 잠재적 영향 범위
- 가능하다면 수정 제안

### 응답 시간

- 48시간 이내 확인 응답
- 7일 이내 수정 일정 공유
- 심각한 취약점은 우선 처리

### 주요 보안 영역

VPy Lab에서 특히 주의가 필요한 보안 영역:

- **Pyodide Worker 샌드박스**: 학생 코드가 시스템에 접근하지 못하도록 격리
- **XSS 방지**: 모든 사용자 입력은 `textContent`로만 렌더링
- **Supabase RLS**: Row Level Security 정책 우회 방지
- **AGPL 준수**: 파생 서비스의 소스코드 공개 의무

### 감사 (Acknowledgments)

보안 취약점을 책임감 있게 신고해 주신 분들께 감사드립니다.
신고자의 동의 하에 이 섹션에 이름을 게시합니다.
