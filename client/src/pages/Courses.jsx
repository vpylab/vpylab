import { localizeCourse } from '../i18n/owned-content';
import { Link, Navigate, useParams, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { getCourseById } from '../data/courses';
import { useI18n } from '../i18n/useI18n';
import WorkbookCourse from '../components/courses/WorkbookCourse';

/**
 * Courses — 한 페이지에서 3가지 모드를 라우팅 파라미터로 분기
 *   /courses                      → 미션 트레이닝 목록으로 이동
 *   /courses/:courseId            → 코스 상세
 *   /courses/:courseId/:lessonId  → 코스 상세 + 차시 활성(우측 sticky 패널)
 *
 * 디자인 원칙: Home/Missions와 동일한 토큰 — container-main, category-card,
 * mission-filter-btn, font-display, CSS 변수만 사용. 트랙·코스별 색은 spectrum
 * 토큰(CAT_COLORS와 동일 팔레트)을 inline color로 적용.
 */

// 트랙 메타 (입문 / 융합 / 튜토리얼)
const TRACK_META = {
  beginner: { ko: '입문', en: 'Beginner', color: '#4A6CF7' },
  fusion: { ko: '융합', en: 'Fusion', color: '#00B894' },
  tutorial: { ko: '튜토리얼', en: 'Tutorial', color: '#6C5CE7' },
};

// 코스 색상 키 → spectrum hex (DESIGN.md 팔레트와 일치)
const COURSE_HEX = {
  sky: '#4A6CF7',
  emerald: '#00B894',
  amber: '#F0883E',
  indigo: '#6C5CE7',
  rose: '#FF6B6B',
  teal: '#00CEC9',
  slate: '#5A5B6A',
  blue: '#4A6CF7',
};
const colorOf = (course) => COURSE_HEX[course.color] || '#4A6CF7';

// ─── 차시 행 ─────────────────────────────────────────────────
function LessonRow({ course, lesson, idx, active, color, lang }) {
  return (
    <Link
      to={`/courses/${course.id}/${lesson.id}`}
      className="block no-underline transition-colors"
      style={{
        backgroundColor: active ? `${color}14` : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <div className="flex items-center gap-4 px-5 py-3.5">
        {/* 번호 원 — 활성: 채움, 비활성: 보더만 */}
        <span
          className="flex-none w-8 h-8 rounded-full text-[12.5px] font-mono font-bold flex items-center justify-center transition-all"
          style={{
            backgroundColor: active ? color : 'transparent',
            color: active ? '#fff' : color,
            border: `1.5px solid ${active ? color : `${color}55`}`,
          }}
        >
          {idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-snug truncate"
            style={{ color: 'var(--color-text-primary)' }}>
            {lesson.title?.[lang] || lesson.title?.ko}
          </p>
          <p className="text-[12.5px] mt-0.5 leading-relaxed"
            style={{
              color: 'var(--color-text-secondary)',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
            {lesson.summary}
          </p>
        </div>
        <span className="text-[14px] shrink-0 font-mono"
          style={{ color: active ? color : 'var(--color-text-muted)' }}>
          {active ? '●' : '→'}
        </span>
      </div>
    </Link>
  );
}

// ─── 코스 디테일 ────────────────────────────────────────────
function CourseDetail({ courseId, lessonId }) {
  const { t, locale: lang } = useI18n();
  const navigate = useNavigate();
  const course = localizeCourse(getCourseById(courseId), lang);

  if (!course) {
    return (
      <main className="flex-1 container-main py-16 w-full">
        <div className="max-w-md mx-auto text-center">
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            {lang === 'ko' ? '코스를 찾을 수 없습니다.' : 'Course not found.'}
          </p>
          <Link to="/missions" className="btn-secondary no-underline inline-block">
            {lang === 'ko' ? '← 트레이닝' : '← Back to courses'}
          </Link>
        </div>
      </main>
    );
  }

  if (course.workbook) return <WorkbookCourse course={course} lessonId={lessonId} />;

  const color = colorOf(course);
  const trackMeta = TRACK_META[course.track];
  const activeLesson = lessonId ? course.lessons.find((x) => x.id === lessonId) : null;

  return (
    <main className="flex-1 container-main py-8 w-full">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Link to="/" className="text-xs no-underline" style={{ color: 'var(--color-text-muted)' }}>
          {t('nav.home')}
        </Link>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>/</span>
        <Link to="/missions" className="text-xs no-underline" style={{ color: 'var(--color-text-muted)' }}>
          {lang === 'ko' ? '미션' : 'Missions'}
        </Link>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>/</span>
        <span className="text-xs font-medium truncate" style={{ color: 'var(--color-text-secondary)' }}>
          {course.title?.[lang] || course.title?.ko}
        </span>
      </div>

      {/* 코스 헤더 — 좌측 컬러 액센트 카드 (category-card와 같은 톤) */}
      <header
        className="relative rounded-lg p-7 md:p-9 mb-10 overflow-hidden"
        style={{
          backgroundColor: 'var(--color-bg-panel)',
          border: '1px solid var(--color-border)',
          borderLeft: `3px solid ${color}`,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* 메타 행: 아이콘 + 트랙 + 교과 + 차시 */}
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="text-[28px] leading-none">{course.icon}</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider"
              style={{ color }}>
              {trackMeta?.[lang] || trackMeta?.ko}
            </span>
          </div>
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>·</span>
          <span className="text-[11.5px] font-medium"
            style={{ color: 'var(--color-text-secondary)' }}>
            {course.subject}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>·</span>
          <span className="text-[11.5px] font-mono font-semibold"
            style={{ color: 'var(--color-text-secondary)' }}>
            {course.sessions}{lang === 'ko' ? '차시' : ' sessions'}
          </span>
        </div>

        {/* 제목 */}
        <h1 className="font-display text-[24px] md:text-[30px] font-bold leading-tight max-w-3xl"
          style={{ color: 'var(--color-text-primary)' }}>
          {course.title?.[lang] || course.title?.ko}
        </h1>

        {/* 설명 */}
        <p className="text-[14px] mt-3 leading-relaxed max-w-3xl"
          style={{ color: 'var(--color-text-secondary)' }}>
          {course.description}
        </p>

        {/* 대상 학년 — 작은 칩 */}
        {course.targetGrade && (
          <span
            className="inline-block text-[11px] font-medium mt-4 px-2.5 py-1 rounded"
            style={{
              backgroundColor: `${color}1A`,
              color,
            }}
          >
            {lang === 'ko' ? '대상' : 'For'} · {course.targetGrade}
          </span>
        )}
      </header>

      {/* 2-col: 좌 차시 일람 / 우 sticky 패널 */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-x-8 gap-y-8">

        {/* ── 좌측: 차시 일람 ── */}
        <section className="min-w-0">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-[15px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}>
              {lang === 'ko' ? '차시' : 'Lessons'}
            </h2>
            <span className="text-[11px] font-mono" style={{ color: 'var(--color-text-muted)' }}>
              {course.lessons.length}{lang === 'ko' ? '개' : ''}
            </span>
          </div>
          <ol
            className="rounded-lg overflow-hidden"
            style={{
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg-panel)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {course.lessons.map((l, i) => (
              <li
                key={l.id}
                style={{
                  borderTop: i === 0 ? 'none' : '1px solid var(--color-border)',
                }}
              >
                <LessonRow
                  course={course}
                  lesson={l}
                  idx={i}
                  active={l.id === lessonId}
                  color={color}
                  lang={lang}
                />
              </li>
            ))}
          </ol>
        </section>

        {/* ── 우측: sticky 패널 ── */}
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start space-y-4">

          {/* 활성 차시 카드 */}
          {activeLesson ? (
            <div
              className="rounded-lg overflow-hidden"
              style={{
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-panel)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                className="px-5 py-4"
                style={{
                  backgroundColor: `${color}0F`,
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider"
                    style={{ color }}>
                    {lang === 'ko' ? '현재 차시' : 'Current Lesson'}
                  </span>
                </div>
                <h3 className="font-display text-[16px] font-bold leading-snug"
                  style={{ color: 'var(--color-text-primary)' }}>
                  {activeLesson.title?.[lang] || activeLesson.title?.ko}
                </h3>
                <p className="text-[12.5px] mt-1.5 leading-relaxed"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  {activeLesson.summary}
                </p>
              </div>
              {activeLesson.practice && (
                <dl className="px-5 py-4 text-sm leading-relaxed space-y-3">
                  <div><dt className="font-semibold">{lang === 'ko' ? '이번에 추가한 코드' : 'New in this step'}</dt>
                    <dd><code className="break-words">{activeLesson.practice.line}</code><p>{activeLesson.practice.meaning}</p></dd></div>
                  <div><dt className="font-semibold">{lang === 'ko' ? '하나만 바꿔 보기' : 'Change one thing'}</dt><dd>{activeLesson.practice.change}</dd></div>
                  <div><dt className="font-semibold">{lang === 'ko' ? '관찰하고 설명하기' : 'Observe and explain'}</dt><dd>{activeLesson.practice.observe}</dd></div>
                </dl>
              )}
              <pre
                className="text-[11.5px] leading-[1.6] p-4 m-0"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-primary)',
                  maxHeight: 280,
                  overflow: 'auto',
                  whiteSpace: 'pre',
                  fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                }}
              >
                <code>{activeLesson.code}</code>
              </pre>
              <div className="px-4 py-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                {activeLesson.video && (
                  <a className="inline-flex items-center min-h-11 mb-2 text-sm underline"
                    href={activeLesson.video}>
                    {lang === 'ko' ? '이 단계의 실행 영상 보기' : 'Watch this step run'}
                  </a>
                )}
                <button
                  onClick={() =>
                    navigate(
                      `/sandbox?lesson=${encodeURIComponent(course.id)}/${encodeURIComponent(activeLesson.id)}`,
                    )
                  }
                  className="btn-primary w-full !text-[13px] !py-2.5"
                >
                  {lang === 'ko' ? '샌드박스에서 실습 →' : 'Practice in Sandbox →'}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="rounded-lg p-5"
              style={{
                border: '1px dashed var(--color-border)',
                backgroundColor: 'var(--color-bg-panel)',
              }}
            >
              <p className="text-[12.5px] leading-relaxed"
                style={{ color: 'var(--color-text-muted)' }}>
                {lang === 'ko'
                  ? '왼쪽에서 차시를 선택하면 코드와 실습 버튼이 여기에 나타납니다.'
                  : 'Select a lesson on the left to see code and a practice button here.'}
              </p>
            </div>
          )}

        </aside>
      </div>
    </main>
  );
}

// ─── 페이지 엔트리 ──────────────────────────────────────────
export default function Courses() {
  const { courseId, lessonId } = useParams();
  return (
    <div className="min-h-screen w-full min-w-0 flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <Header />
      {courseId ? (
        <CourseDetail courseId={courseId} lessonId={lessonId} />
      ) : (
        <Navigate to="/missions" replace />
      )}
    </div>
  );
}
