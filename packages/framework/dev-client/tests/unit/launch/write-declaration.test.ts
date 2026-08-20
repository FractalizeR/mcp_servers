/**
 * Объявление пишущего прогона: без него сервер не может потребовать ограничения
 * области действия именно для запусков с записью — рубеж оставался бы тем, что
 * легко забыть включить (найдено ревью 2026-08-20).
 */

import { describe, it, expect } from 'vitest';
import { declareWriteRun, WRITE_DECLARATION_VAR } from '../../../src/launch/write-declaration.js';

describe('declareWriteRun', () => {
  it('читающий прогон окружение не меняет', () => {
    expect(declareWriteRun({ HOME: '/home/u' }, false)).toEqual({ HOME: '/home/u' });
  });

  it('пишущий прогон объявляется маркером', () => {
    expect(declareWriteRun({ HOME: '/home/u' }, true)[WRITE_DECLARATION_VAR]).toBe('1');
  });

  it('исходное окружение не мутируется', () => {
    const env = { HOME: '/home/u' };

    declareWriteRun(env, true);

    expect(env).toEqual({ HOME: '/home/u' });
  });
});
