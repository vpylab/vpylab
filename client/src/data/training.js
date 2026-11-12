const text = (ko, en) => ({ ko, en });

export const trainingCourses = [
  { id: 'beg-light-sound', title: text('처음 만드는 빛과 소리', 'Your first light and sound project'), description: text('예상하고, 실행하고, 한 가지씩 바꾸며 나만의 알림 작품을 만듭니다.', 'Predict, run, and change one thing at a time to make your own signal.'), prerequisite: text('코딩이 처음이어도 시작할 수 있어요.', 'No coding experience needed.'), sessions: 8 },
];

// ID는 기존 제출·학습 기록과 연결됩니다. 배열 순서만 훈련 순서로 정합니다.
export const trainingSteps = [
  { missionId: 'CT-6', focus: text('변수', 'Variables'), reflect: text('크기와 위치를 따로 바꾸면 결과가 어떻게 달라지나요?', 'How do size and position affect the result independently?') },
  { missionId: 'CT-7', focus: text('반복', 'Loops'), reflect: text('조명을 4개로 바꾸면 마지막 x 좌표는 얼마인가요?', 'What is the last x coordinate if there are four lights?') },
  { missionId: 'CT-13', focus: text('조건', 'Conditions'), reflect: text('점수를 59, 60으로 바꾸어 각각 실행해 보세요. 경계에서 색이 바뀌나요?', 'Run with scores of 59 and 60. Does the color change at the boundary?') },
  { missionId: 'CT-11', focus: text('리스트', 'Lists'), reflect: text('색 목록의 순서를 뒤집으면 어느 구슬이 바뀌나요?', 'Which spheres change when you reverse the color list?') },
  { missionId: 'SN-1', focus: text('빛과 소리 결합', 'Combine light and sound'), reflect: text('음 목록의 순서만 바꾸면 소리와 구슬 순서는 각각 어떻게 되나요?', 'When you change only the note order, what happens to the sound and sphere order?') },
  { missionId: 'CR-1', focus: text('내 작품', 'Your own project'), reflect: text('내 캐릭터의 특징 하나와 그 특징을 만든 코드 한 줄을 설명해 보세요.', 'Describe one feature of your character and the line that creates it.') },
];

export function getTrainingPosition(missionId) {
  const index = trainingSteps.findIndex(step => step.missionId === missionId);
  return index < 0 ? null : { ...trainingSteps[index], index, total: trainingSteps.length, nextId: trainingSteps[index + 1]?.missionId || null };
}
