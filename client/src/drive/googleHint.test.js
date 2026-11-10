import { describe, expect, it } from 'vitest';
import { googleEmailOf } from './googleHint';

describe('드라이브 승인에 넘길 구글 계정', () => {
  it('구글 로그인 정보의 이메일을 우선하고, 없으면 구글로 로그인한 계정의 이메일을 쓴다', () => {
    expect(googleEmailOf({ email: 'main@school.example', identities: [{ provider: 'github', identity_data: { email: 'gh@x.example' } }, { provider: 'google', identity_data: { email: 'g@school.example' } }] })).toBe('g@school.example');
    expect(googleEmailOf({ email: 'a@school.example', app_metadata: { provider: 'google' } })).toBe('a@school.example');
  });
  it('GitHub로만 로그인했거나 로그인하지 않았으면 넘기지 않는다', () => {
    expect(googleEmailOf(null)).toBe('');
    expect(googleEmailOf({ email: 'a@x.example', app_metadata: { provider: 'github' }, identities: [{ provider: 'github' }] })).toBe('');
    expect(googleEmailOf({ app_metadata: { provider: 'google' } })).toBe('');
    expect(googleEmailOf({ identities: [{ provider: 'google', identity_data: { email: 'not-an-email' } }], app_metadata: { provider: 'github' }, email: 'a@x.example' })).toBe('');
  });
});
