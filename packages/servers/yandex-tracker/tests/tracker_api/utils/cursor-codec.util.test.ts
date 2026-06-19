import { describe, it, expect } from 'vitest';
import {
  CursorCodec,
  InvalidCursorError,
  CURSOR_TAGS,
  CURSOR_VERSION_PREFIX,
} from '#tracker_api/utils/cursor-codec.util.js';

describe('CursorCodec', () => {
  describe('encode/decode round-trip', () => {
    it('decode(encode(p,t),t).path === p для валидного пути', () => {
      const path = '/v3/issues/A-1/changelog?id=abc&perPage=50';
      const cursor = CursorCodec.encode(path, CURSOR_TAGS.changelog);
      expect(cursor.startsWith(CURSOR_VERSION_PREFIX)).toBe(true);
      const decoded = CursorCodec.decode(cursor, CURSOR_TAGS.changelog);
      expect(decoded.path).toBe(path);
      expect(decoded.extra).toBeUndefined();
    });

    it('сохраняет запятые в query (expand=a,b)', () => {
      const path = '/v3/issues/_search?page=2&expand=a,b';
      const cursor = CursorCodec.encode(path, CURSOR_TAGS.findIssues);
      expect(CursorCodec.decode(cursor, CURSOR_TAGS.findIssues).path).toBe(path);
    });

    it('переносит extra (хеш тела) для find_issues', () => {
      const path = '/v3/issues/_search?page=2';
      const cursor = CursorCodec.encode(path, CURSOR_TAGS.findIssues, 'bodyhash123');
      const decoded = CursorCodec.decode(cursor, CURSOR_TAGS.findIssues);
      expect(decoded.path).toBe(path);
      expect(decoded.extra).toBe('bodyhash123');
    });
  });

  describe('decode — всегда бросает InvalidCursorError (R3, без undefined)', () => {
    it('неизвестный/отсутствующий версионный префикс', () => {
      expect(() => CursorCodec.decode('c2:whatever', CURSOR_TAGS.comments)).toThrow(
        InvalidCursorError
      );
      expect(() => CursorCodec.decode('plainstring', CURSOR_TAGS.comments)).toThrow(
        InvalidCursorError
      );
    });

    it('битый base64url после префикса', () => {
      expect(() =>
        CursorCodec.decode(`${CURSOR_VERSION_PREFIX}@@@not-base64@@@`, CURSOR_TAGS.comments)
      ).toThrow(InvalidCursorError);
    });

    it('валидный base64, но не JSON', () => {
      const b64 = Buffer.from('not json at all', 'utf8').toString('base64url');
      expect(() =>
        CursorCodec.decode(`${CURSOR_VERSION_PREFIX}${b64}`, CURSOR_TAGS.comments)
      ).toThrow(InvalidCursorError);
    });

    it('JSON неверной структуры (нет t/p)', () => {
      const b64 = Buffer.from(JSON.stringify({ foo: 'bar' }), 'utf8').toString('base64url');
      expect(() =>
        CursorCodec.decode(`${CURSOR_VERSION_PREFIX}${b64}`, CURSOR_TAGS.comments)
      ).toThrow(InvalidCursorError);
    });

    it('mismatch тега (R13: кросс-эндпоинт курсор)', () => {
      const cursor = CursorCodec.encode('/v3/queues?page=2', CURSOR_TAGS.queues);
      expect(() => CursorCodec.decode(cursor, CURSOR_TAGS.comments)).toThrow(InvalidCursorError);
    });

    it('путь не из /v2|/v3 (guard) — даже при совпадающем теге', () => {
      // вручную собираем токен с чужим путём, но валидным тегом
      const b64 = Buffer.from(
        JSON.stringify({ t: CURSOR_TAGS.comments, p: 'https://evil.example/steal' }),
        'utf8'
      ).toString('base64url');
      expect(() =>
        CursorCodec.decode(`${CURSOR_VERSION_PREFIX}${b64}`, CURSOR_TAGS.comments)
      ).toThrow(InvalidCursorError);
    });

    it('абсолютный URL Трекера в payload нормализуется до относительного пути', () => {
      const b64 = Buffer.from(
        JSON.stringify({
          t: CURSOR_TAGS.comments,
          p: 'https://api.tracker.yandex.net/v3/issues/A-1/comments?id=5',
        }),
        'utf8'
      ).toString('base64url');
      const decoded = CursorCodec.decode(`${CURSOR_VERSION_PREFIX}${b64}`, CURSOR_TAGS.comments);
      expect(decoded.path).toBe('/v3/issues/A-1/comments?id=5');
    });
  });
});
