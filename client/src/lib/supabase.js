import { createClient } from '@supabase/supabase-js';
import { OPEN_EDITION } from './api-base.js';

export const AUTH_STORAGE_KEY = 'vpylab-auth';

// 교실 LAN 모드처럼 Supabase 설정이 없는 빌드에서는 즉시 실패하는 자리 표시 주소를 씁니다.
// createClient는 빈 URL이면 예외를 던져 앱 전체가 멈추므로, 세션은 localStorage만 읽고
// 네트워크 요청은 연결 거부로 바로 끝나게 합니다.
// 오픈소스 판은 환경변수에 Supabase 값이 있어도(커밋된 .env.production) 절대 연결하지 않습니다.
// 운영자가 학생 데이터를 받지 않는다는 원칙 때문입니다. 존재하지 않는 https 주소로 두어 요청이 바로 실패하게 합니다.
const supabaseUrl = OPEN_EDITION ? 'https://no-supabase.invalid' : (import.meta.env.VITE_SUPABASE_URL || '').trim() || 'http://127.0.0.1:1';
const supabaseAnonKey = OPEN_EDITION ? 'open-edition-no-supabase' : (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim() || 'lan-mode-no-supabase';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: AUTH_STORAGE_KEY,
    // Web Locks 경쟁 조건 방지: 잠금 없이 즉시 실행
    lock: (name, acquireTimeout, fn) => fn(),
  },
});
