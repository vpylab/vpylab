import courses from '../data/courses';
import missions, { categories } from '../data/missions';
import examples, { EXAMPLE_CATEGORIES } from '../data/examples';
import docs, { docCategories } from '../data/docs';

const text = (value) => typeof value === 'string' ? value : value?.ko || '';

/* 기존 앱의 "빛의 분산" 스펙트럼(DESIGN.md)과 같은 색을 자료 종류·분류에 적용합니다. */
export const SPECTRUM = {
  purple: '#6C5CE7', coral: '#FF6B6B', cyan: '#00CEC9', mint: '#00B894',
  orange: '#F0883E', pink: '#E84393', blue: '#4A6CF7', amber: '#FDCB6E', slate: '#5A5B6A',
};
export const SPECTRUM_CYCLE = [SPECTRUM.purple, SPECTRUM.coral, SPECTRUM.cyan, SPECTRUM.mint, SPECTRUM.orange, SPECTRUM.pink, SPECTRUM.blue];

/* 자료 종류별 대표 색·아이콘 (프로젝트 카드, 탭, 배너에서 사용) */
export const kinds = {
  lesson: { label: '코스·차시', icon: '📘', accent: SPECTRUM.blue },
  mission: { label: '미션', icon: '🎯', accent: SPECTRUM.purple },
  example: { label: '예제', icon: '🧪', accent: SPECTRUM.orange },
  reference: { label: 'API 문서', icon: '📖', accent: SPECTRUM.cyan },
};
export const labels = Object.fromEntries(Object.entries(kinds).map(([key, value]) => [key, value.label]));

const COURSE_HEX = { sky: SPECTRUM.blue, emerald: SPECTRUM.mint, amber: SPECTRUM.orange, indigo: SPECTRUM.purple, rose: SPECTRUM.coral, teal: SPECTRUM.cyan, slate: SPECTRUM.slate, blue: SPECTRUM.blue };
const MISSION_HEX = { CT: SPECTRUM.purple, CR: SPECTRUM.coral, MA: SPECTRUM.cyan, SC: SPECTRUM.mint, AR: SPECTRUM.orange, SN: SPECTRUM.pink, PC: SPECTRUM.mint, AI: SPECTRUM.blue };
const EXAMPLE_META = {
  space: { icon: '🪐', accent: SPECTRUM.blue }, sound: { icon: '🎵', accent: SPECTRUM.pink }, science: { icon: '🔬', accent: SPECTRUM.mint },
  art: { icon: '🎨', accent: SPECTRUM.orange }, game: { icon: '🎮', accent: SPECTRUM.coral }, creative: { icon: '✨', accent: SPECTRUM.purple },
  math: { icon: '📐', accent: SPECTRUM.cyan }, interactive: { icon: '🖱️', accent: SPECTRUM.blue },
};
const DOC_HEX = {
  objects: SPECTRUM.blue, meshes: SPECTRUM.purple, vectors: SPECTRUM.cyan, scene: SPECTRUM.slate, events: SPECTRUM.orange, widgets: SPECTRUM.coral,
  graphs: SPECTRUM.mint, colors: SPECTRUM.pink, materials: SPECTRUM.orange, sound: SPECTRUM.pink, charts: SPECTRUM.mint,
};
const exampleLabel = (id) => EXAMPLE_CATEGORIES.find((item) => item.id === id)?.label || id;

const lessons = courses.flatMap((course) => course.lessons.map((lesson) => ({
  ...lesson, kind: 'lesson', code: lesson.code, title: text(lesson.title),
  description: lesson.summary, group: text(course.title), courseId: course.id,
  icon: course.icon || kinds.lesson.icon, accent: COURSE_HEX[course.color] || kinds.lesson.accent,
})));
export const collection = {
  lesson: lessons,
  mission: missions.map((mission) => ({
    ...mission, kind: 'mission', title: text(mission.title), description: text(mission.description),
    group: text(categories[mission.category]?.title) || mission.category, code: mission.starterCode,
    icon: categories[mission.category]?.icon || kinds.mission.icon, accent: MISSION_HEX[mission.category] || kinds.mission.accent,
  })),
  example: examples.map((item) => ({
    ...item, kind: 'example', group: exampleLabel(item.category),
    icon: EXAMPLE_META[item.category]?.icon || kinds.example.icon, accent: EXAMPLE_META[item.category]?.accent || kinds.example.accent,
  })),
  reference: docs.map((item) => ({
    ...item, kind: 'reference', title: text(item.title), description: text(item.description),
    group: docCategories[item.category]?.ko || item.category,
    icon: docCategories[item.category]?.icon || kinds.reference.icon, accent: DOC_HEX[item.category] || kinds.reference.accent,
  })),
};
export const curriculumCounts = { courses: courses.length, lessons: lessons.length, missions: missions.length, examples: examples.length, docs: docs.length };

/** 프로젝트가 출발한 수업 자료의 색·아이콘. 자료 없이 만든 프로젝트는 순번에 따라 스펙트럼 색을 돌려 씁니다. */
export function projectAppearance(project, index = 0) {
  const source = project?.source;
  const item = source?.kind && collection[source.kind]?.find((entry) => entry.id === source.id);
  if (item) return { icon: item.icon, accent: item.accent, kind: kinds[source.kind] };
  if (source?.kind && kinds[source.kind]) return { icon: kinds[source.kind].icon, accent: kinds[source.kind].accent, kind: kinds[source.kind] };
  return { icon: '✦', accent: SPECTRUM_CYCLE[index % SPECTRUM_CYCLE.length], kind: null };
}
