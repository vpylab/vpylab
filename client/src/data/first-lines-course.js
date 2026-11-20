export default {
  "id": "first-lines",
  "track": "beginner",
  "level": 1,
  "title": {
    "ko": "내가 쓰는 첫 한 줄",
    "en": "My first line of code"
  },
  "subject": "코딩",
  "description": "빈 편집기에 공을 그리는 명령을 씁니다. 크기와 색을 하나씩 바꾸고, 마지막에는 내가 고른 공과 소리로 시작 신호를 만듭니다.",
  "targetGrade": "코딩을 처음 배우는 학생",
  "sessions": 5,
  "icon": "🔵",
  "color": "sky",
  "lessons": [
    {
      "id": "draw",
      "title": {
        "ko": "공 하나 그리기",
        "en": "Draw one ball"
      },
      "summary": "빈 첫 줄에 sphere()를 입력하고 실행을 누르세요.",
      "code": "sphere()\n",
      "practice": {
        "line": "sphere()",
        "meaning": "sphere는 공을 그리는 명령입니다. 영문 소문자로 쓰고 끝에 여는 괄호와 닫는 괄호를 붙입니다.",
        "change": "sphere만 box로 고쳐 box()를 실행하세요. 어떤 모양이 나올까요?",
        "observe": "공을 다시 그리려면 어느 낱말을 되돌리면 될까요? 직접 해 보세요."
      },
      "starterCode": ""
    },
    {
      "id": "size",
      "title": {
        "ko": "공을 크게 그리기",
        "en": "Make the ball larger"
      },
      "summary": "괄호 안의 숫자 하나로 공의 크기를 정합니다.",
      "code": "sphere(radius=1)\n",
      "practice": {
        "line": "radius=1",
        "meaning": "radius는 공의 반지름입니다. radius=1은 중심에서 겉면까지의 거리를 1로 정합니다.",
        "change": "먼저 실행해 크기를 보세요. 1을 2로 바꾸고 다시 실행하세요.",
        "observe": "더 작은 공을 만들려면 어느 숫자를 쓸까요? 0.5를 넣어 확인하세요."
      }
    },
    {
      "id": "color",
      "title": {
        "ko": "공에 색 입히기",
        "en": "Give the ball a color"
      },
      "summary": "같은 크기의 빨간 공과 파란 공을 차례로 그립니다.",
      "code": "sphere(radius=1, color=color.red)\n",
      "practice": {
        "line": "color=color.red",
        "meaning": "쉼표 뒤에 색을 정하는 설정을 덧붙였습니다. color.red는 준비된 빨간색입니다.",
        "change": "red만 blue로 바꾸고 다시 실행하세요.",
        "observe": "무엇이 바뀌었나요? 공의 크기를 그대로 둔 부분도 찾아보세요."
      }
    },
    {
      "id": "note",
      "title": {
        "ko": "공에 소리 한 음 더하기",
        "en": "Add one note"
      },
      "summary": "공을 그리는 줄 아래에 한 음을 내는 줄을 더합니다.",
      "code": "sphere(radius=1, color=color.blue)\n음표(\"도\")\n",
      "practice": {
        "line": "음표(\"도\")",
        "meaning": "첫 줄은 공을 그리고 두 번째 줄은 소리를 냅니다. 음 이름은 따옴표 안에 씁니다.",
        "change": "따옴표 안의 \"도\"만 \"솔\"로 바꾸세요.",
        "observe": "어느 줄이 있어야 공이 보이나요? 소리를 듣기 어려우면 둘째 줄을 지웠을 때와 비교해 보세요."
      }
    },
    {
      "id": "signal",
      "title": {
        "ko": "나만의 시작 신호 만들기",
        "en": "Make your own start signal"
      },
      "summary": "누군가에게 시작을 알릴 공 한 개와 음 하나를 고릅니다.",
      "code": "sphere(radius=1, color=color.red)\n음표(\"도\")\n",
      "practice": {
        "line": "sphere(radius=1, color=color.red)",
        "meaning": "지금까지 쓴 두 줄만으로 신호를 만들 수 있습니다.",
        "change": "공의 크기나 색 중 하나를 바꾸고 실행하세요. 마음에 들면 음 이름도 하나 골라 다시 실행하세요.",
        "observe": "소리를 꺼도 시작을 알아볼 수 있을까요? 고른 색이나 크기가 어떤 역할을 하는지 말해 보세요."
      }
    }
  ]
};
