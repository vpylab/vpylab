/**
 * Python 전용 Monaco: 'monaco-editor' 진입점은 모든 언어와 TypeScript·CSS·HTML·JSON 언어 서비스(작업 스레드 포함)를 함께 불러옵니다.
 * VPyLab 편집기는 Python만 쓰므로, 편집 기능 전체(edcore)와 Python 문법 색만 불러와 내려받는 양과 배포 크기를 줄입니다.
 * 다른 언어가 필요해지면 그 언어의 basic-languages/<언어>/<언어>.contribution.js를 여기에 더합니다.
 */
export * from 'monaco-editor/esm/vs/editor/edcore.main.js';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution.js';
