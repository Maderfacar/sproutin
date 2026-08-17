import { afterEach, describe, expect, it } from 'vitest';
import {
  CALLBACK_PATH,
  buildAuthorizeUrl,
  publicOrigin,
  randomState,
  readOauthConfig,
} from './line-oauth';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('buildAuthorizeUrl', () => {
  it('帶齊 LINE 要求的授權參數', () => {
    const url = new URL(buildAuthorizeUrl('https://school.example', '1234567890', 'st4te'));

    expect(url.origin + url.pathname).toBe('https://access.line.me/oauth2/v2.1/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('1234567890');
    expect(url.searchParams.get('state')).toBe('st4te');
  });

  it('要求 openid，否則 LINE 不會回 id_token（沒有 id_token 就認不出是誰）', () => {
    const url = new URL(buildAuthorizeUrl('https://school.example', '1', 's'));
    expect(url.searchParams.get('scope')?.split(' ')).toContain('openid');
  });

  it('redirect_uri 指向登記的 callback 路徑', () => {
    const url = new URL(buildAuthorizeUrl('https://school.example', '1', 's'));
    expect(url.searchParams.get('redirect_uri')).toBe(`https://school.example${CALLBACK_PATH}`);
  });
});

describe('publicOrigin', () => {
  it('優先採用明確設定的網址，並去掉尾端斜線', () => {
    process.env.WEB_PUBLIC_URL = 'https://sproutin.example/';
    const req = new Request('http://internal.local/admin/callback');
    expect(publicOrigin(req)).toBe('https://sproutin.example');
  });

  it('未設定時採用瀏覽器實際使用的主機（Vercel 位於反向代理後）', () => {
    delete process.env.WEB_PUBLIC_URL;
    const req = new Request('http://internal.local/admin/callback', {
      headers: { 'x-forwarded-host': 'sproutin.example', 'x-forwarded-proto': 'https' },
    });
    expect(publicOrigin(req)).toBe('https://sproutin.example');
  });
});

describe('readOauthConfig', () => {
  it('缺少 channel secret 時回 null（讓登入頁說是設定問題，而不是把人丟去 LINE 才失敗）', () => {
    process.env.LINE_LOGIN_CHANNEL_ID = '1234567890';
    delete process.env.LINE_LOGIN_CHANNEL_SECRET;
    expect(readOauthConfig()).toBeNull();
  });

  it('兩個值都在才算設定完成', () => {
    process.env.LINE_LOGIN_CHANNEL_ID = '1234567890';
    process.env.LINE_LOGIN_CHANNEL_SECRET = 'secret';
    expect(readOauthConfig()).toEqual({ channelId: '1234567890', channelSecret: 'secret' });
  });
});

describe('randomState', () => {
  it('每次都不同（state 相同就失去防偽造的意義）', () => {
    const values = new Set(Array.from({ length: 50 }, () => randomState()));
    expect(values.size).toBe(50);
  });
});
