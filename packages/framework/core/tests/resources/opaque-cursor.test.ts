/**
 * Тесты OpaqueCursorCodec (пакет 5.1.A плана модернизации MCP 2026-07-28).
 *
 * Зеркалирует контракт `CursorCodec` Трекера (версия/тег/явный throw), но
 * проверяется здесь независимо — framework не может импортировать тесты/код
 * yandex-tracker (граф зависимостей monorepo).
 */

import { describe, it, expect } from 'vitest';
import {
  OpaqueCursorCodec,
  InvalidOpaqueCursorError,
  OPAQUE_CURSOR_VERSION_PREFIX,
} from '../../src/resources/pagination/opaque-cursor.js';

interface SamplePayload {
  readonly page: number;
  readonly note?: string;
}

describe('OpaqueCursorCodec', () => {
  it('кодирует и декодирует произвольную JSON-полезную нагрузку', () => {
    const payload: SamplePayload = { page: 2, note: 'hello' };
    const cursor = OpaqueCursorCodec.encode(payload, 'sample-tag');

    expect(cursor.startsWith(OPAQUE_CURSOR_VERSION_PREFIX)).toBe(true);
    expect(OpaqueCursorCodec.decode<SamplePayload>(cursor, 'sample-tag')).toEqual(payload);
  });

  it('курсор непрозрачен (не читаемый как plain base64(JSON) без версии)', () => {
    const cursor = OpaqueCursorCodec.encode({ page: 1 }, 'sample-tag');
    expect(cursor).not.toContain('"page"');
  });

  it('бросает InvalidOpaqueCursorError при неизвестном префиксе версии', () => {
    expect(() => OpaqueCursorCodec.decode('bogus-cursor', 'sample-tag')).toThrowError(
      InvalidOpaqueCursorError
    );
  });

  it('бросает InvalidOpaqueCursorError при чужом теге семейства (защита от кросс-провайдер курсора)', () => {
    const cursor = OpaqueCursorCodec.encode({ page: 1 }, 'provider-a');
    expect(() => OpaqueCursorCodec.decode(cursor, 'provider-b')).toThrowError(
      InvalidOpaqueCursorError
    );
  });

  it('бросает InvalidOpaqueCursorError при повреждённом base64-payload', () => {
    const broken = `${OPAQUE_CURSOR_VERSION_PREFIX}not-valid-base64url!!!`;
    expect(() => OpaqueCursorCodec.decode(broken, 'sample-tag')).toThrowError(
      InvalidOpaqueCursorError
    );
  });

  it('никогда не делает тихий fallback: любая проблема декодирования — explicit throw', () => {
    // base64url валидного алфавита, но не являющийся нашим JSON-конвертом.
    const garbage = `${OPAQUE_CURSOR_VERSION_PREFIX}${Buffer.from('not-json').toString('base64url')}`;
    expect(() => OpaqueCursorCodec.decode(garbage, 'sample-tag')).toThrowError(
      InvalidOpaqueCursorError
    );
  });
});
