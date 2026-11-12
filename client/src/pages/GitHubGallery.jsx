import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import AddonBoundary from '../components/shared/AddonBoundary';
import GitHubGalleryView from '../components/gallery/GitHubGalleryView';
import { useUiText } from '../i18n/ui-text';
import { GALLERY_TEXT } from '../gallery/gallery-text.js';

/**
 * GitHub 연동 갤러리 화면(/gallery). 목록 주소(VITE_GALLERY_INDEX_URL)가 설정된 배포에서만 연결됩니다.
 * 서버와 DB를 사용하지 않습니다. 교사의 승인 방법: docs/GALLERY_GITHUB.md
 * 본문에서 오류가 나도 머리글과 다른 화면은 그대로 동작하고, 이 화면 안에서만 안내합니다(docs/SCOPE.md 애드온 규칙 4).
 */
export default function GitHubGallery() {
  const ui = useUiText();
  const [failed, setFailed] = useState(false);
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
      <Header />
      <main className="w-full max-w-5xl mx-auto px-6 md:px-10 py-12" data-testid="github-gallery-page">
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-4">
          <h1 className="font-display text-3xl font-bold">{ui("갤러리")}</h1>
          <Link to="/gallery/glowscript" className="text-sm no-underline" style={{ color: 'var(--color-accent)' }} data-testid="glowscript-gallery-link">{ui("GlowScript 작품 보기 ↗")}</Link>
        </div>
        {failed
          ? <p className="text-sm" role="alert" style={{ color: 'var(--color-text-secondary)' }} data-testid="gallery-broken">{ui(GALLERY_TEXT.broken)}</p>
          : <AddonBoundary onError={() => setFailed(true)}><GitHubGalleryView /></AddonBoundary>}
      </main>
    </div>
  );
}
