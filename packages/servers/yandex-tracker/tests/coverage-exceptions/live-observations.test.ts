/**
 * Самотест валидации реестра живых наблюдений: без него роняющий код держится на
 * комментарии, а реестр, принимающий пустой `readBack`, воспроизводит ровно ту
 * подмену «пришёл 200 = наблюдение», ради снятия которой заведён. Отчёты пишутся во
 * ВРЕМЕННЫЙ каталог (см. L-3, `index.test.ts`), не в боевой `tests/live-runs/`.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectCoverageGateViolations, coverageGateKey } from './coverage-gate-baseline.js';
import {
  validateLiveRegistry,
  collectStaleLiveUnreachable,
  collectStaleRetiredObservations,
  collectFingerprintMismatches,
  formatFingerprintMismatchFailure,
  retiredLiveKeys,
  LIVE_OBSERVATIONS,
  LIVE_UNREACHABLE,
  RETIRED_LIVE_OBSERVATIONS,
} from './live-observations.js';
import { knownToolBaseNames } from './index.js';
import type { LiveObservation, LiveUnreachable, RetiredLiveObservation } from './types.js';

const VALID_TOOLS: ReadonlySet<string> = new Set(['update_board', 'update_sprint']);
const REPORT = 'tests/live-runs/9_LIVE_RUN_REPORT_2026-01-01.md';
const RUN_LABEL = 'sweep-test';

describe('validateLiveRegistry', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir !== undefined) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  /** Отчёт называет оба инструмента фикстур и метку прогона — иначе не свидетельствует записи. */
  function packageRootWithReport(body?: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'live-observations-test-'));
    tempDir = dir;
    mkdirSync(join(dir, 'tests', 'live-runs'), { recursive: true });
    writeFileSync(
      join(dir, REPORT),
      body ?? `# отчёт прогона ${RUN_LABEL}\n\nupdate_board, update_sprint\n`
    );
    return dir;
  }

  function observation(overrides: Partial<LiveObservation> = {}): LiveObservation {
    return {
      tool: 'update_board',
      property: 'С-4',
      runLabel: RUN_LABEL,
      report: REPORT,
      readBack: 'версия 1→2, чтение подтверждает',
      schemaFingerprint: 'a1b2c3d4e5f6',
      ...overrides,
    };
  }

  function unreachable(overrides: Partial<LiveUnreachable> = {}): LiveUnreachable {
    return {
      tool: 'update_sprint',
      property: 'С-5',
      reason: 'дефект D10 жив',
      whatWouldClose: 'починка D10 и обратное чтение поля',
      report: REPORT,
      ...overrides,
    };
  }

  function retired(overrides: Partial<RetiredLiveObservation> = {}): RetiredLiveObservation {
    return {
      tool: 'update_board',
      property: 'С-4',
      runLabel: RUN_LABEL,
      report: REPORT,
      reason: 'схема сузилась, наблюдение относится к другому контракту',
      whatWouldClose: 'повторная живая проба под новой меткой',
      ...overrides,
    };
  }

  function validate(
    observations: readonly LiveObservation[],
    unreachables: readonly LiveUnreachable[],
    packageRoot: string,
    retiredRecords: readonly RetiredLiveObservation[] = []
  ): void {
    validateLiveRegistry({
      observations,
      unreachable: unreachables,
      retired: retiredRecords,
      validTools: VALID_TOOLS,
      packageRoot,
    });
  }

  it('корректный реестр загружается', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate([observation()], [unreachable()], root);
    }).not.toThrow();
  });

  it('пустой readBack роняет загрузку — иначе записью становится код ответа', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate([observation({ readBack: '   ' })], [], root);
    }).toThrow(/readBack/);
  });

  it('пустой schemaFingerprint роняет загрузку — запись без него нельзя просрочить', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate([observation({ schemaFingerprint: '  ' })], [], root);
    }).toThrow(/schemaFingerprint/);
  });

  it('пустой whatWouldClose роняет загрузку — запись без условия закрытия живёт вечно', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate([], [unreachable({ whatWouldClose: '' })], root);
    }).toThrow(/whatWouldClose/);
  });

  it('несуществующий инструмент роняет загрузку', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate([observation({ tool: 'update_bard' })], [], root);
    }).toThrow(/update_bard/);
  });

  it('свойство вне С-4/С-5 роняет загрузку — живой прогон остальных не наблюдает', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate([observation({ property: 'С-2' as LiveObservation['property'] })], [], root);
    }).toThrow(/С-2/);
  });

  it('отчёт, которого нет на диске, роняет загрузку — ссылка не переживает доказательство', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate(
        [observation({ report: 'tests/live-runs/9_LIVE_RUN_REPORT_2026-01-02.md' })],
        [],
        root
      );
    }).toThrow(/9_LIVE_RUN_REPORT_2026-01-02/);
  });

  it('отчёт вне tests/live-runs/ роняет загрузку — иначе он выпадает из inputs coverage:*', () => {
    const root = packageRootWithReport();
    writeFileSync(join(root, '9_LIVE_RUN_REPORT_2026-01-01.md'), `# ${RUN_LABEL} update_board\n`);

    expect(() => {
      validate([observation({ report: '9_LIVE_RUN_REPORT_2026-01-01.md' })], [], root);
    }).toThrow(/tests\/live-runs/);
  });

  it('README каталога отчётом не является, даже называя инструмент и метку прогона', () => {
    const root = packageRootWithReport();
    writeFileSync(
      join(root, 'tests', 'live-runs', 'README.md'),
      `# отчёты\n\nПравило: назвать инструмент (update_board). Метки: ${RUN_LABEL}\n`
    );

    expect(() => {
      validate([observation({ report: 'tests/live-runs/README.md' })], [], root);
    }).toThrow(/не отчёт прогона/);
  });

  it('имя-префикс не засчитывается за другое имя — сверка идёт по границе идентификатора', () => {
    const root = packageRootWithReport(
      `# отчёт прогона ${RUN_LABEL}\n\nupdate_board_column, update_sprint\n`
    );

    expect(() => {
      validate([observation({ tool: 'update_board' })], [], root);
    }).toThrow(/имени инструмента "update_board"/);
  });

  it('имя, окружённое разметкой, засчитывается — граница идентификатора, а не пробел', () => {
    const root = packageRootWithReport(
      `# отчёт прогона ${RUN_LABEL}\n\n(правка сделана \`update_board\`).\n`
    );

    expect(() => {
      validate([observation()], [], root);
    }).not.toThrow();
  });

  it('отчёт не называет инструмент записи — роняет загрузку', () => {
    const root = packageRootWithReport(`# отчёт прогона ${RUN_LABEL}\n\nupdate_sprint\n`);

    expect(() => {
      validate([observation()], [], root);
    }).toThrow(/имени инструмента "update_board"/);
  });

  it('отчёт не называет метку прогона — роняет загрузку', () => {
    const root = packageRootWithReport('# отчёт без метки\n\nupdate_board, update_sprint\n');

    expect(() => {
      validate([observation()], [], root);
    }).toThrow(/метки прогона "sweep-test"/);
  });

  it('LiveUnreachable метки не имеет — от отчёта требуется только имя инструмента', () => {
    const root = packageRootWithReport('# отчёт без метки\n\nupdate_sprint\n');

    expect(() => {
      validate([], [unreachable()], root);
    }).not.toThrow();
  });

  it('LiveObservation и LiveUnreachable на одну пару роняют загрузку, а не молча приоритезируются', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate([observation()], [unreachable({ tool: 'update_board', property: 'С-4' })], root);
    }).toThrow(/LiveObservation.*LiveUnreachable|LiveUnreachable/s);
  });

  it('две записи на одну пару роняют загрузку — клетка сослалась бы на случайный отчёт', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate([observation(), observation({ readBack: 'другое чтение' })], [], root);
    }).toThrow(/две записи/);
  });

  it('имя с префиксом сервера засчитывается — это каноническая форма корневого CLAUDE.md', () => {
    const root = packageRootWithReport(
      `# отчёт прогона ${RUN_LABEL}\n\nвызван \`fr_yandex_tracker_update_board\`.\n`
    );

    expect(() => {
      validate([observation()], [], root);
    }).not.toThrow();
  });

  it('полное имя MCP-клиента засчитывается — префикс сервера в нём есть', () => {
    const root = packageRootWithReport(
      `# отчёт прогона ${RUN_LABEL}\n\nmcp__tracker__fr_yandex_tracker_update_board\n`
    );

    expect(() => {
      validate([observation()], [], root);
    }).not.toThrow();
  });

  it('отношение «префикс» отсекается и в префиксной форме имени', () => {
    const root = packageRootWithReport(
      `# отчёт прогона ${RUN_LABEL}\n\nfr_yandex_tracker_update_board_column\n`
    );

    expect(() => {
      validate([observation({ tool: 'update_board' })], [], root);
    }).toThrow(/имени инструмента "update_board"/);
  });

  it('afterCommit не похож на хеш коммита — роняет загрузку, иначе правку не прочитать', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate(
        [observation({ fingerprintRestamp: { afterCommit: 'потом', why: 'схема сузилась' } })],
        [],
        root
      );
    }).toThrow(/afterCommit/);
  });

  it('пустое обоснование пере-штамповки роняет загрузку — иначе поле лишь украшение', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate(
        [observation({ fingerprintRestamp: { afterCommit: 'abc1234', why: '   ' } })],
        [],
        root
      );
    }).toThrow(/fingerprintRestamp\.why/);
  });

  it('снятое наблюдение без условия закрытия роняет загрузку', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate([], [], root, [retired({ whatWouldClose: '' })]);
    }).toThrow(/whatWouldClose/);
  });

  it('LiveObservation и RetiredLiveObservation на одну пару роняют загрузку', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate([observation()], [], root, [retired()]);
    }).toThrow(/RetiredLiveObservation/);
  });

  it('снятое наблюдение проходит валидацию, когда наблюдения на эту пару больше нет', () => {
    const root = packageRootWithReport();

    expect(() => {
      validate([], [], root, [retired()]);
    }).not.toThrow();
  });

  it('боевой реестр проходит собственную валидацию', () => {
    expect(() => {
      validateLiveRegistry({
        observations: LIVE_OBSERVATIONS,
        unreachable: LIVE_UNREACHABLE,
        retired: RETIRED_LIVE_OBSERVATIONS,
        validTools: knownToolBaseNames(),
        packageRoot: join(import.meta.dirname, '..', '..'),
      });
    }).not.toThrow();
  });
});

describe('collectStaleLiveUnreachable', () => {
  const record: LiveUnreachable = {
    tool: 'update_sprint',
    property: 'С-5',
    reason: 'дефект D10 жив',
    whatWouldClose: 'починка D10',
    report: 'report.md',
  };

  it('клетка стала `живьём` — запись «недостижимо» устарела', () => {
    const stale = collectStaleLiveUnreachable([record], () => 'живьём');

    expect(stale).toEqual([{ tool: 'update_sprint', property: 'С-5', cellKind: 'живьём' }]);
  });

  it('клетка осталась исключением — запись действует', () => {
    expect(collectStaleLiveUnreachable([record], () => 'исключение')).toEqual([]);
  });
});

describe('снятие наблюдения от начала до конца (пара С-4 + С-5)', () => {
  /**
   * Наблюдения заводятся парами С-4+С-5, поэтому первое же реальное снятие проходит
   * ОБА свойства сразу — а требуют они разного: строка базлайна нужна только С-4.
   */
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir !== undefined) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  function rootWithReport(): string {
    const dir = mkdtempSync(join(tmpdir(), 'live-retire-test-'));
    tempDir = dir;
    mkdirSync(join(dir, 'tests', 'live-runs'), { recursive: true });
    writeFileSync(join(dir, REPORT), `# отчёт прогона ${RUN_LABEL}\n\nupdate_board\n`);
    return dir;
  }

  function retiredPair(): RetiredLiveObservation[] {
    return (['С-4', 'С-5'] as const).map((property) => ({
      tool: 'update_board',
      property,
      runLabel: RUN_LABEL,
      report: REPORT,
      reason: 'схема сузилась, наблюдение относится к другому контракту',
      whatWouldClose: 'повторная живая проба под новой меткой',
    }));
  }

  /** Дыры после снятия: С-5 гейт не сверяет, поэтому дырой становится только С-4. */
  const HOLES = [{ tool: 'update_board', property: 'С-4' as const }];
  /** Снимок пуст: до снятия эта пара держалась наблюдением, а не строкой базлайна. */
  const ORIGIN: ReadonlySet<string> = new Set();

  it('реестр принимает обе записи, когда наблюдений на эти пары больше нет', () => {
    const root = rootWithReport();

    expect(() => {
      validateLiveRegistry({
        observations: [],
        unreachable: [],
        retired: retiredPair(),
        validTools: VALID_TOOLS,
        packageRoot: root,
      });
    }).not.toThrow();
  });

  it('строка базлайна на С-4 (и только на С-4) даёт зелёный гейт', () => {
    const retired = new Set(retiredPair().map((r) => coverageGateKey(r.tool, r.property)));

    const violations = collectCoverageGateViolations(
      HOLES,
      new Set(['update_board[С-4]']),
      retired,
      ORIGIN
    );

    expect(violations).toEqual({
      appeared: [],
      closed: [],
      retiredNotInBaseline: [],
      addedWithoutRetirement: [],
    });
  });

  it('строка на С-5, дописанная «за компанию», даёт вечный красный — её быть не должно', () => {
    const retired = new Set(retiredPair().map((r) => coverageGateKey(r.tool, r.property)));

    const violations = collectCoverageGateViolations(
      HOLES,
      new Set(['update_board[С-4]', 'update_board[С-5]']),
      retired,
      ORIGIN
    );

    expect(violations.closed).toEqual(['update_board[С-5]']);
  });

  it('без строки базлайна С-4 попадает в retiredNotInBaseline, а не в «потеряли тест»', () => {
    const retired = new Set(retiredPair().map((r) => coverageGateKey(r.tool, r.property)));

    const violations = collectCoverageGateViolations(HOLES, ORIGIN, retired, ORIGIN);

    expect(violations.retiredNotInBaseline).toEqual(['update_board[С-4]']);
    expect(violations.appeared).toEqual([]);
  });

  it('текст отказа разводит свойства: С-4 требует строки базлайна, С-5 запрещает', () => {
    const text = formatFingerprintMismatchFailure([
      { tool: 'update_board', property: 'С-4', recorded: 'a1', actual: 'b2' },
      { tool: 'update_board', property: 'С-5', recorded: 'a1', actual: 'b2' },
    ]);

    expect(text).toMatch(/С-4\]: .*нужна строка базлайна/);
    expect(text).toMatch(/С-5\]: .*строка базлайна НЕ нужна/);
  });

  it('запись о снятии устарела, когда пара снова наблюдается живьём', () => {
    const stale = collectStaleRetiredObservations(retiredPair(), () => 'живьём');

    expect(stale).toHaveLength(2);
    expect(collectStaleRetiredObservations(retiredPair(), () => 'не наблюдалось')).toEqual([]);
  });
});

describe('collectFingerprintMismatches', () => {
  const record: LiveObservation = {
    tool: 'update_board',
    property: 'С-4',
    runLabel: RUN_LABEL,
    report: REPORT,
    readBack: 'версия 1→2, чтение подтверждает',
    schemaFingerprint: 'a1b2c3d4e5f6',
  };

  it('отпечаток совпал — расхождений нет', () => {
    expect(collectFingerprintMismatches([record], () => 'a1b2c3d4e5f6')).toEqual([]);
  });

  it('схема инструмента изменилась — расхождение с именем инструмента', () => {
    const mismatches = collectFingerprintMismatches([record], () => 'ffffffffffff');

    expect(mismatches).toEqual([
      {
        tool: 'update_board',
        property: 'С-4',
        recorded: 'a1b2c3d4e5f6',
        actual: 'ffffffffffff',
      },
    ]);
  });

  it('схему прочитать не удалось — это расхождение, а не пропуск', () => {
    const mismatches = collectFingerprintMismatches([record], () => undefined);

    expect(mismatches).toHaveLength(1);
    expect(mismatches[0]?.actual).toBeUndefined();
  });

  it('текст отказа называет инструмент, все ТРИ выхода и оба слепых пятна', () => {
    const text = formatFingerprintMismatchFailure(
      collectFingerprintMismatches([record], () => 'ffffffffffff')
    );

    expect(text).toContain('update_board');
    expect(text).toMatch(/перепроверь инструмент живьём/);
    expect(text).toMatch(/пере-штампуй/);
    expect(text).toMatch(/RetiredLiveObservation/);
    expect(text).toMatch(/МАРШРУТ/);
    expect(text).toMatch(/ФОРМА ОТВЕТА/);
  });

  it('текст отказа несёт причину нечитаемой схемы, а не безымянное «не удалось»', () => {
    const text = formatFingerprintMismatchFailure(
      collectFingerprintMismatches(
        [record],
        () => undefined,
        () => 'TypeError: facade.getX is not a function'
      )
    );

    expect(text).toContain('facade.getX is not a function');
  });
});

describe('retiredLiveKeys', () => {
  it('боевой реестр снятых наблюдений сегодня пуст — ветка достижима, но не задействована', () => {
    expect(retiredLiveKeys()).toEqual(new Set());
  });

  it('ключ снятого наблюдения имеет ту же форму, что ключ храповика', () => {
    const keys = retiredLiveKeys([
      {
        tool: 'update_board',
        property: 'С-4',
        runLabel: 'sweep-test',
        report: REPORT,
        reason: 'контракт изменился',
        whatWouldClose: 'новая проба',
      },
    ]);

    expect(keys).toEqual(new Set(['update_board[С-4]']));
  });
});
