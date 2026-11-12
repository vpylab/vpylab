import { useOptionalI18n as useI18n } from '../../i18n/useI18n';
import { useUiText } from "../../i18n/ui-text";
import { Children, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const panel = {
  backgroundColor: 'var(--color-bg-panel)',
  border: '1px solid var(--color-border)',
};

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-lg font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: 'var(--color-text-secondary)' }}>{children}</div>
    </section>
  );
}

function Contents({ course, lessonId }) {
  const { locale } = useI18n();
  const ui = useUiText();
  return (
    <nav aria-label={ui("기초 교재 목차")} className="rounded-xl p-4" style={panel}>
      <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{ui("차례")}</h2>
      <ol className="space-y-1">
        {course.lessons.map((lesson, index) => (
          <li key={lesson.id}>
            <Link
              to={`/courses/${course.id}/${lesson.id}`}
              aria-label={ui`${index + 1}차시 ${lesson.title[locale]}`}
              aria-current={lessonId === lesson.id ? 'page' : undefined}
              className="flex gap-3 px-3 py-2.5 rounded-lg text-sm no-underline"
              style={{
                color: lessonId === lesson.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                backgroundColor: lessonId === lesson.id ? 'var(--color-accent-bg)' : 'transparent',
              }}
            >
              <span className="font-mono shrink-0">{index + 1}</span>
              <span>{lesson.title[locale]}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function StepFlow({ children, workflow = false, code }) {
  const { locale }=useI18n();
  const ui = useUiText();
  const [step, setStep] = useState(0);
  const flowRef = useRef(null);
  const items = Children.toArray(children);
  const groups = workflow ? [
    { label: ui("생각"), titles: [ui("시작 전에 생각하기")] },
    { label: ui("따라 하기"), titles: [ui("직접 따라 하기"), ui("알아둘 개념")] },
    { label: ui("적용"), titles: [ui("내 작품에 적용하기")] },
    { label: locale==='en'?'Check':'확인', titles: [ui("이해했는지 확인하기"), ui("다음 작업을 위한 기록")] },
  ] : [
    { label: ui("예상"), titles: [ui("실행 전에 예상하기")] },
    { label: ui("실행"), titles: [ui("코드 열고 실행하기"), ui("새로 만나는 개념"), ui("코드 읽어 보기")] },
    { label: ui("바꾸기"), titles: [ui("한 가지씩 바꾸며 실험하기")] },
    { label: ui("만들기"), titles: [ui("내가 해결할 문제"), ui("더 해보고 싶다면")] },
    { label: locale==='en'?'Check':'확인', titles: [ui("이해했는지 확인하기"), ui("다음 시도를 위한 기록")] },
  ];
  const move = index => {
    setStep(index);
    requestAnimationFrame(() => flowRef.current?.scrollIntoView({ block: 'start' }));
  };
  return (
    <article className="min-w-0">
      {items.filter(item => !item.props.title)}
      <div ref={flowRef} className="scroll-mt-20">
        <nav aria-label={ui("이번 차시 학습 순서")} className="flex border-b mb-8" style={{ borderColor: 'var(--color-border)' }}>
          {groups.map((group, index) => <button key={group.label} type="button" aria-current={index === step ? 'step' : undefined} onClick={() => move(index)} className="flex-1 px-1 py-3 text-xs sm:text-sm cursor-pointer border-0 border-b-2 bg-transparent" style={{ color: index === step ? 'var(--color-accent)' : 'var(--color-text-secondary)', borderBottomColor: index === step ? 'var(--color-accent)' : 'transparent', fontWeight: index === step ? 600 : 400 }}><span className="mr-1" aria-hidden="true">{index + 1}.</span>{group.label}</button>)}
        </nav>
        {groups[step].titles.map(title => {
          const item = items.find(child => child.props.title === title);
          if (!item) return null;
          if ([ui("새로 만나는 개념"), ui("코드 읽어 보기"), ui("알아둘 개념")].includes(title)) return <details key={title} className="mb-4 border p-4" style={panel}><summary className="text-sm cursor-pointer font-medium" style={{ color: 'var(--color-text-primary)' }}>{title}</summary><div className="pt-4">{item}</div></details>;
          return item;
        })}
        {step === 0 && code && <pre className="border p-5 text-xs sm:text-sm leading-relaxed overflow-x-auto mb-6" tabIndex={0} aria-label={ui("예상할 코드")} style={{ ...panel, color: 'var(--color-text-primary)' }}><code>{code}</code></pre>}
        <nav aria-label={ui("학습 단계 이동")} className="flex justify-between items-center gap-3 pt-5 pb-8">
          {step > 0 ? <button type="button" onClick={() => move(step - 1)} className="btn-secondary">{ui("← 이전 단계")}</button> : <span />}
          {step < groups.length - 1 && <button type="button" onClick={() => move(step + 1)} className="btn-primary">{ui`다음: ${groups[step + 1].label}`} →</button>}
        </nav>
      </div>
    </article>
  );
}

function Lesson({ course, lesson }) {
  const ui = useUiText();
  const guide = lesson.guide;
  return (
    <StepFlow code={lesson.code}>
      <div className="rounded-xl p-5 mb-8" style={panel}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-accent)' }}>{ui("이번에 할 수 있게 되는 것")}</p>
        <p className="text-base leading-relaxed font-medium" style={{ color: 'var(--color-text-primary)' }}>{guide.goal}</p>
      </div>

      <Section title={ui("실행 전에 예상하기")}><p>{guide.predict}</p></Section>

      <Section title={ui("새로 만나는 개념")}>
        <dl className="space-y-4">
          {guide.concepts.map(({ term, explanation }) => (
            <div key={term}>
              <dt className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{term}</dt>
              <dd>{explanation}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={ui("코드 열고 실행하기")}>
        <p>{ui("실습에서 실행한 뒤 위쪽의 학습 안내로 이 차시에 돌아올 수 있습니다. 수정한 코드는 이 탭에 보관됩니다.")}</p>
        {guide.support && <p>{guide.support}</p>}
        {guide.accessibleCode && <details className="border p-4" style={panel}><summary className="cursor-pointer font-medium">{ui("소리 대신 화면으로 해보기")}</summary><pre className="mt-3 overflow-x-auto text-xs leading-relaxed" tabIndex={0}><code>{guide.accessibleCode}</code></pre><p className="mt-3">{ui("실습 화면의 코드를 이 코드로 바꾸고, 크기 목록의 순서를 바꿔 보세요.")}</p></details>}
        <pre
          className="rounded-xl p-5 text-[13px] leading-relaxed overflow-x-auto"
          style={{ ...panel, color: 'var(--color-text-primary)', fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
          tabIndex={0}
          aria-label={ui("이번 차시 실습 코드")}
        ><code>{lesson.code}</code></pre>
        <Link
          to={`/sandbox?lesson=${course.id}/${lesson.id}`}
          className="btn-primary no-underline inline-flex"
        >{ui("코드 열고 실습하기 →")}</Link>
        <details className="rounded-lg px-4 py-3" style={panel}>
          <summary className="cursor-pointer font-medium" style={{ color: 'var(--color-text-primary)' }}>{ui("실행한 뒤 결과 확인하기")}</summary>
          <p className="mt-3">{guide.observe}</p>
        </details>
      </Section>

      <Section title={ui("코드 읽어 보기")}>
        <dl className="space-y-4">
          {guide.reading.map(({ code, explanation }) => (
            <div key={code}>
              <dt className="font-mono text-xs break-words mb-1" style={{ color: 'var(--color-text-primary)' }}>{code}</dt>
              <dd>{explanation}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={ui("한 가지씩 바꾸며 실험하기")}>
        <p>{ui("실험마다 원래 코드로 돌아온 뒤 안내한 부분 하나만 바꿉니다. 실행 전에 예상하고, 결과가 다르면 이유를 찾아보세요.")}</p>
        <p>{ui("원본이 필요하면 위의 코드 열고 실습하기를 다시 눌러 새 탭에서 열 수 있습니다. 남겨 둘 수정 코드는 먼저 저장하거나 복사해 두세요.")}</p>
        <ol className="space-y-4">
          {guide.experiments.map(({ change, question }, index) => (
            <li key={change} className="rounded-xl p-5" style={panel}>
              <h3 className="font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{index + 1}. {change}</h3>
              <p>{question}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={ui("내가 해결할 문제")}>
        <p>{guide.challenge.task}</p>
        <ul className="list-disc pl-5 space-y-2">
          {guide.challenge.criteria.map(item => <li key={item}>{item}</li>)}
        </ul>
        <div className="space-y-2 pt-2">
          {guide.challenge.hints.map((hint, index) => (
            <details key={hint} className="rounded-lg px-4 py-3" style={panel}>
              <summary className="cursor-pointer font-medium" style={{ color: 'var(--color-text-primary)' }}>{ui("막힐 때 힌트")} {index + 1}</summary>
              <p className="mt-3">{hint}</p>
            </details>
          ))}
        </div>
      </Section>

      {guide.extension && (
        <Section title={ui("더 해보고 싶다면")}>
          <details className="rounded-lg px-4 py-3" style={panel}>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--color-text-primary)' }}>{guide.extension.title}</summary>
            <p className="mt-3">{guide.extension.explanation}</p>
            <p className="mt-3">{guide.extension.task}</p>
            <details className="mt-3">
              <summary className="cursor-pointer">{ui("생각이 막힐 때")}</summary>
              <p className="mt-3">{guide.extension.hint}</p>
            </details>
          </details>
        </Section>
      )}

      <Section title={ui("이해했는지 확인하기")}>
        {guide.checks.map(({ question, answer }) => (
          <details key={question} className="rounded-lg px-4 py-3" style={panel}>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--color-text-primary)' }}>{question}</summary>
            <p className="mt-3">{answer}</p>
          </details>
        ))}
      </Section>

      <Section title={ui("다음 시도를 위한 기록")}>
        <p>{guide.reflection}</p>
        <p>{ui("실습 코드 맨 아래에 #으로 시작하는 주석으로 남길 수 있습니다.")}</p>
        <p className="font-mono text-xs">{ui("# 소리를 끄면 크기로만 구분했다.")}</p>
      </Section>
    </StepFlow>
  );
}

function WorkflowLesson({ lesson }) {
  const ui = useUiText();
  const guide = lesson.guide;
  return (
    <StepFlow workflow>
      <div className="rounded-xl p-5 mb-8" style={panel}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-accent)' }}>{ui("이번에 할 수 있게 되는 것")}</p>
        <p className="text-base leading-relaxed font-medium" style={{ color: 'var(--color-text-primary)' }}>{guide.goal}</p>
      </div>
      <Section title={ui("시작 전에 생각하기")}><p>{guide.predict}</p></Section>
      <Section title={ui("알아둘 개념")}>
        <dl className="space-y-4">
          {guide.concepts.map(({ term, explanation }) => (
            <div key={term}>
              <dt className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>{term}</dt>
              <dd>{explanation}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title={ui("직접 따라 하기")}>
        <p>{ui("작품이 열려 있는 탭이 있으면 그 탭에서 진행하세요. 아래 링크는 실습 화면을 엽니다. 이어서 작업할 작품은 원래 탭을 사용하거나 프로젝트 목록에서 다시 여세요.")}</p>
        <Link to="/sandbox" className="btn-primary no-underline inline-flex">{ui("실습 화면 열기 →")}</Link>
        <ol className="space-y-4 pt-2">
          {guide.steps.map(({ title, body }, index) => (
            <li key={title} className="rounded-xl p-5" style={panel}>
              <h3 className="font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{index + 1}. {title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </ol>
        {guide.support && <p>{guide.support}</p>}
        <details className="rounded-lg px-4 py-3" style={panel}>
          <summary className="cursor-pointer font-medium" style={{ color: 'var(--color-text-primary)' }}>{ui("진행한 뒤 결과 확인하기")}</summary>
          <p className="mt-3">{guide.observe}</p>
        </details>
      </Section>
      <Section title={ui("내 작품에 적용하기")}>
        <p>{guide.challenge.task}</p>
        <ul className="list-disc pl-5 space-y-2">
          {guide.challenge.criteria.map(item => <li key={item}>{item}</li>)}
        </ul>
        {guide.challenge.hints.map((hint, index) => (
          <details key={hint} className="rounded-lg px-4 py-3" style={panel}>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--color-text-primary)' }}>{ui("막힐 때 힌트")} {index + 1}</summary>
            <p className="mt-3">{hint}</p>
          </details>
        ))}
      </Section>
      <Section title={ui("이해했는지 확인하기")}>
        {guide.checks.map(({ question, answer }) => (
          <details key={question} className="rounded-lg px-4 py-3" style={panel}>
            <summary className="cursor-pointer font-medium" style={{ color: 'var(--color-text-primary)' }}>{question}</summary>
            <p className="mt-3">{answer}</p>
          </details>
        ))}
      </Section>
      <Section title={ui("다음 작업을 위한 기록")}><p>{guide.reflection}</p></Section>
    </StepFlow>
  );
}

function Introduction({ course }) {
  const ui = useUiText();
  return <article className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
    <p className="mb-4">{course.workbook.introduction}</p>
    <p className="mb-6">{course.workbook.pacing}</p>
    <Link to={`/courses/${course.id}/${course.lessons[0].id}`} className="btn-primary no-underline inline-flex mb-8">{ui("첫 차시 시작하기 →")}</Link>
    <Contents course={course} />
    <details className="mt-6 p-4 border" style={panel}><summary className="cursor-pointer font-medium" style={{ color: 'var(--color-text-primary)' }}>{ui("준비와 완성 기준")}</summary>
      <div className="pt-5"><Section title={ui("실습 준비")}><ol className="list-decimal pl-5 space-y-2">{course.workbook.preparation.map(item => <li key={item}>{item}</li>)}</ol></Section>
      <Section title={ui("이렇게 배웁니다")}><p>{course.workbook.routine}</p></Section>
      <Section title={course.workbook.finalProjectTitle || ui("마지막에 만들 작품")}><p>{course.workbook.finalProjectDescription || ui("누군가에게 필요한 신호를 만들고, 시험 결과를 근거로 한 번 더 고칩니다.")}</p><ul className="list-disc pl-5 space-y-2">{course.workbook.projectCriteria.map(item => <li key={item}>{item}</li>)}</ul></Section>
      {course.workbook.references && <Section title={ui("더 알아보기")}>{course.workbook.references.map(reference => <p key={reference.url}><a href={reference.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>{reference.title} ↗</a></p>)}</Section>}</div>
    </details>
  </article>;
}

export default function WorkbookCourse({ course, lessonId }) {
  const { locale } = useI18n();
  const ui = useUiText();
  useEffect(() => { window.scrollTo(0, 0); }, [course.id, lessonId]);

  const lessonIndex = course.lessons.findIndex(lesson => lesson.id === lessonId);
  const lesson = course.lessons[lessonIndex];
  const previous = course.lessons[lessonIndex - 1];
  const next = course.lessons[lessonIndex + 1];

  if (lessonId && !lesson) {
    return (
      <main className="container-main py-12">
        <p className="mb-4" style={{ color: 'var(--color-text-primary)' }}>{ui("차시를 찾을 수 없습니다.")}</p>
        <Link to={`/courses/${course.id}`} className="btn-secondary no-underline">{ui("교재 차례로 돌아가기")}</Link>
      </main>
    );
  }

  return (
    <main className="flex-1 w-full min-w-0 max-w-3xl mx-auto px-6 py-8 md:py-12" style={{ color: 'var(--color-text-primary)' }}>
      <nav aria-label={ui("현재 위치")} className="text-xs flex justify-between gap-4 mb-8" style={{ color: 'var(--color-text-secondary)' }}>
        <Link to="/missions" className="no-underline" style={{ color: 'inherit' }}>{ui("← 트레이닝")}</Link>
        <Link to={`/courses/${course.id}`} className="no-underline min-w-0 truncate" style={{ color: 'inherit' }}>{course.title[locale]}</Link>
      </nav>
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <p className="text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>{lesson ? ui`${lessonIndex + 1} / ${course.lessons.length}차시` : course.workbook.eyebrow || ui("처음 배우는 코딩")}</p>
          <details className="text-xs relative shrink-0" key={lessonId || 'intro'}>
            <summary className="cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>{ui("차례 보기")}</summary>
            <div className="absolute right-0 top-full z-20 w-72 max-w-[calc(100vw-48px)] mt-3"><Contents course={course} lessonId={lessonId} /></div>
          </details>
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-bold leading-snug mb-3">{lesson ? lesson.title[locale] : course.title[locale]}</h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{lesson ? lesson.summary : course.workbook.tagline}</p>
        {course.workbook.type === 'workflow' && lessonIndex === 1 && <p className="mt-4 text-sm p-4 border" style={panel}>{ui("이 앱은 누구나 볼 수 있는 공개 GitHub 저장소를 만듭니다. 실명·연락처·비밀번호를 코드나 기록에 넣지 마세요. GitHub 연결은 나중에 해도 됩니다.")}</p>}
      </header>
      {lesson ? (course.workbook.type === 'workflow' ? <WorkflowLesson key={lesson.id} lesson={lesson} /> : <Lesson key={lesson.id} course={course} lesson={lesson} />) : <Introduction course={course} />}
      {lesson && <nav aria-label={ui("차시 이동")} className="flex gap-3 flex-wrap justify-between py-6" style={{ borderTop: '1px solid var(--color-border)' }}>
        <Link to={previous ? `/courses/${course.id}/${previous.id}` : `/courses/${course.id}`} className="text-sm no-underline py-2" style={{ color: 'var(--color-text-secondary)' }}>{previous ? ui("← 이전 차시") : ui("← 교재 안내")}</Link>
        {next ? <Link to={`/courses/${course.id}/${next.id}`} className="text-sm font-semibold no-underline py-2" style={{ color: 'var(--color-accent)' }}>{ui("다음 차시 →")}</Link> : <Link to={course.workbook.nextCourse?.path || '/missions'} className="text-sm font-semibold no-underline py-2" style={{ color: 'var(--color-accent)' }}>{course.workbook.nextCourse?.label || ui("트레이닝으로 돌아가기 →")}</Link>}
      </nav>}
    </main>
  );
}
