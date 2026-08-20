/**
 * Тесты `findUnreachableLeaves()` (пакет 7.1.E плана модернизации MCP
 * 2026-07-28; привязка к целевому запросу — фикс слепого пятна, найденного
 * позже эмпирически на `complete_task`, см. заголовок
 * `find-unreachable-leaves.ts`).
 *
 * Два независимых сценария регрессии:
 * - "голый поиск true": поле-boolean должно считаться НЕДОСТИЖИМЫМ, если в
 *   haystack есть `true` где-то ещё, но не именно `"fieldName":true" — это
 *   ровно та ошибка, которую совершила первая версия Трекер-теста до
 *   исправления (см. план 7.1.E).
 * - "любой вызов вместо целевого": маркер, доехавший до ПОДГОТОВИТЕЛЬНОГО
 *   вызова (например, `GET` перед записью), но не до ЦЕЛЕВОГО (последнего
 *   мутирующего) запроса, должен считаться НЕДОСТИЖИМЫМ — это ровно тот
 *   дефект, который пропускала проверка до привязки к цели
 *   (`complete_task`: `projectId` доезжал до подготовительного `GET`, но не
 *   до целевого `POST .../complete`).
 */

import { describe, it, expect } from 'vitest';
import {
  findUnreachableLeaves,
  describeUnreachableLeaf,
  selectTargetCalls,
} from '../../../src/testing/schema-reachability/find-unreachable-leaves.js';
import type { ReachabilityLeaf } from '../../../src/testing/schema-reachability/generate-reachability-sample.js';
import type {
  RecordedCall,
  HttpClientMethodName,
} from '../../../src/testing/schema-reachability/http-client-call-recorder.js';

function leaves(entries: Record<string, ReachabilityLeaf>): Map<string, ReachabilityLeaf> {
  return new Map(Object.entries(entries));
}

/** Один накопленный вызов для теста — по умолчанию `get` (не мутирующий). */
function call(serialized: string, method: HttpClientMethodName = 'get'): RecordedCall {
  return { method, serialized };
}

describe('findUnreachableLeaves', () => {
  it('scalar-лист считается достигшим wire, если его value — подстрока haystack', () => {
    const result = findUnreachableLeaves(
      [call('{"summary":"probe_summary"}')],
      leaves({ summary: { kind: 'scalar', value: 'probe_summary', fieldName: 'summary' } })
    );
    expect(result).toHaveLength(0);
  });

  it('scalar-лист считается НЕ достигшим wire, если value нигде не встречается', () => {
    const result = findUnreachableLeaves(
      [call('{"other":"value"}')],
      leaves({ summary: { kind: 'scalar', value: 'probe_summary', fieldName: 'summary' } })
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.path).toBe('summary');
    expect(result[0]?.foundInNonTargetCall).toBe(false);
  });

  it('scalar-лист совпадает по значению независимо от имени JSON-ключа (переименование в DTO)', () => {
    // Схема поля называется body_location, но операция форвардит значение
    // 1:1 под ключом location — value-based matching не завязан на имя ключа.
    const result = findUnreachableLeaves(
      [call('{"body":{"location":"before"}}')],
      leaves({ body_location: { kind: 'scalar', value: 'before', fieldName: 'body_location' } })
    );
    expect(result).toHaveLength(0);
  });

  describe('boolean — регрессия "голого true"', () => {
    it('boolean-лист достигает wire только при точной паре "fieldName":true', () => {
      const result = findUnreachableLeaves(
        [call('{"isSilent":true}')],
        leaves({ isSilent: { kind: 'boolean', value: 'true', fieldName: 'isSilent' } })
      );
      expect(result).toHaveLength(0);
    });

    it('boolean-лист НЕ считается достигшим, если true принадлежит другому полю', () => {
      // haystack содержит true, но не для ЭТОГО поля — голый substring-поиск
      // "true" ошибочно засчитал бы это как совпадение (баг первой версии
      // Трекер-теста). Проверка пары должна его отловить.
      const result = findUnreachableLeaves(
        [call('{"otherField":true}')],
        leaves({ isSilent: { kind: 'boolean', value: 'true', fieldName: 'isSilent' } })
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe('isSilent');
    });

    it('boolean-лист достигает wire в форме query-строки fieldName=true', () => {
      const result = findUnreachableLeaves(
        [call('GET /v3/issues?isSilent=true')],
        leaves({ isSilent: { kind: 'boolean', value: 'true', fieldName: 'isSilent' } })
      );
      expect(result).toHaveLength(0);
    });

    it('boolean(false)-лист требует пару "fieldName":false, а не совпадает с любым false', () => {
      const reached = findUnreachableLeaves(
        [call('{"recursive":false}')],
        leaves({ recursive: { kind: 'boolean', value: 'false', fieldName: 'recursive' } })
      );
      expect(reached).toHaveLength(0);

      const notReached = findUnreachableLeaves(
        [call('{"otherFlag":false}')],
        leaves({ recursive: { kind: 'boolean', value: 'false', fieldName: 'recursive' } })
      );
      expect(notReached).toHaveLength(1);
    });
  });

  describe('wireFieldName — переименованный ключ на wire (только для boolean)', () => {
    it('boolean-лист с wireFieldName проверяется под ДРУГИМ именем ключа', () => {
      // Пример: схема anchor_fallback форвардится как data.anchor.fallback —
      // ключ на wire "fallback", а не "anchor_fallback".
      const result = findUnreachableLeaves(
        [call('{"anchor":{"fallback":true}}')],
        leaves({
          anchor_fallback: { kind: 'boolean', value: 'true', fieldName: 'anchor_fallback' },
        }),
        [
          {
            path: 'anchor_fallback',
            wireFieldName: 'fallback',
            reason: 'форвардится 1:1 под другим ключом',
          },
        ]
      );
      expect(result).toHaveLength(0);
    });

    it('boolean-лист с wireFieldName НЕ засчитывается по СТАРОМУ (схемному) имени ключа', () => {
      const result = findUnreachableLeaves(
        [call('{"anchor_fallback":true}')],
        leaves({
          anchor_fallback: { kind: 'boolean', value: 'true', fieldName: 'anchor_fallback' },
        }),
        [
          {
            path: 'anchor_fallback',
            wireFieldName: 'fallback',
            reason: 'форвардится 1:1 под другим ключом',
          },
        ]
      );
      expect(result).toHaveLength(1);
    });
  });

  it('исключение по path пропускает лист без проверки (даже если он реально не достижим)', () => {
    const result = findUnreachableLeaves(
      [call('{}')],
      leaves({ fields: { kind: 'scalar', value: 'probe_fields', fieldName: 'fields' } }),
      [{ path: 'fields', reason: 'клиентская фильтрация ответа, в API не отправляется' }]
    );
    expect(result).toHaveLength(0);
  });

  it('исключение по конкретному path не затрагивает другие листья с тем же значением-заглушкой', () => {
    const result = findUnreachableLeaves(
      [call('{}')],
      leaves({
        fields: { kind: 'scalar', value: 'probe_fields', fieldName: 'fields' },
        summary: { kind: 'scalar', value: 'probe_summary', fieldName: 'summary' },
      }),
      [{ path: 'fields', reason: 'клиентская фильтрация ответа' }]
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.path).toBe('summary');
  });

  it('describeUnreachableLeaf формирует читаемое сообщение с именем инструмента и путём', () => {
    const message = describeUnreachableLeaf('create_issue', {
      path: 'summary',
      leaf: { kind: 'scalar', value: 'probe_summary', fieldName: 'summary' },
      foundInNonTargetCall: false,
    });
    expect(message).toContain('create_issue');
    expect(message).toContain('summary');
    expect(message).toContain('probe_summary');
  });

  describe('привязка к ЦЕЛЕВОМУ запросу (регрессия complete_task)', () => {
    it('маркер, доехавший ТОЛЬКО до подготовительного GET, но не до целевого POST — недостижим', () => {
      // Воспроизводит реальный дефект: GET .../task/{taskId} (подготовка,
      // содержит projectId в пути), затем POST .../task/{taskId}/complete
      // (цель — БЕЗ projectId, старый баг). Плоский haystack раньше засчитал
      // бы projectId достижимым, потому что он есть в GET.
      const result = findUnreachableLeaves(
        [
          call('["GET","/project/probe_projectId/task/probe_taskId"]', 'get'),
          call('["POST","/task/probe_taskId/complete"]', 'post'),
        ],
        leaves({
          projectId: { kind: 'scalar', value: 'probe_projectId', fieldName: 'projectId' },
          taskId: { kind: 'scalar', value: 'probe_taskId', fieldName: 'taskId' },
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe('projectId');
      // Диагностика должна прямо сказать: нашлось, но не в целевом вызове.
      expect(result[0]?.foundInNonTargetCall).toBe(true);
    });

    it('после фикса (projectId попадает и в целевой POST) — достижимо', () => {
      const result = findUnreachableLeaves(
        [
          call('["GET","/project/probe_projectId/task/probe_taskId"]', 'get'),
          call('["POST","/project/probe_projectId/task/probe_taskId/complete"]', 'post'),
        ],
        leaves({
          projectId: { kind: 'scalar', value: 'probe_projectId', fieldName: 'projectId' },
          taskId: { kind: 'scalar', value: 'probe_taskId', fieldName: 'taskId' },
        })
      );

      expect(result).toHaveLength(0);
    });

    it('маркер, отсутствующий ВЕЗДЕ (не только в целевом) — foundInNonTargetCall: false', () => {
      const result = findUnreachableLeaves(
        [
          call('["GET","/project/x/task/y"]', 'get'),
          call('["POST","/project/x/task/y/complete"]', 'post'),
        ],
        leaves({
          missing: { kind: 'scalar', value: 'probe_missing', fieldName: 'missing' },
        })
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.foundInNonTargetCall).toBe(false);
    });

    it('read-инструмент без единого мутирующего вызова — цель это ВСЕ вызовы (без регрессии для чтения)', () => {
      // Пагинация: несколько GET подряд, маркер общего параметра встречается
      // только в ПЕРВОМ (путь строится один раз, дальше идут Link-based
      // follow-up'ы) — должен засчитаться достижимым, как и раньше.
      const result = findUnreachableLeaves(
        [
          call('["GET","/v3/issues/probe_issueId/comments?perPage=100"]', 'get'),
          call('["GET","/v3/issues/probe_issueId/comments?cursor=abc"]', 'getWithResponse'),
        ],
        leaves({
          issueId: { kind: 'scalar', value: 'probe_issueId', fieldName: 'issueId' },
        })
      );

      expect(result).toHaveLength(0);
    });

    it('последний из НЕСКОЛЬКИХ мутирующих вызовов — целевой (не первый)', () => {
      const result = findUnreachableLeaves(
        [
          call('["POST","/v3/sprints/1/_archive"]', 'post'),
          call('["DELETE","/v3/sprints/1"]', 'delete'),
        ],
        leaves({
          sprintId: { kind: 'scalar', value: '1', fieldName: 'sprintId' },
        })
      );
      // Значение "1" присутствует в обоих (случайно), поэтому просто
      // проверяем поведение selectTargetCalls отдельно ниже — здесь лишь
      // убеждаемся, что findUnreachableLeaves не падает на 2+ мутирующих.
      expect(result).toHaveLength(0);
    });
  });

  describe('selectTargetCalls', () => {
    it('возвращает ВСЕ вызовы, если ни один не мутирующий', () => {
      const all = [call('a', 'get'), call('b', 'getWithResponse')];
      expect(selectTargetCalls(all)).toEqual(all);
    });

    it('возвращает ТОЛЬКО последний мутирующий вызов, если такой есть', () => {
      const target = call('target', 'post');
      const all = [call('prep1', 'get'), call('prep2', 'get'), target];
      expect(selectTargetCalls(all)).toEqual([target]);
    });

    it('игнорирует мутирующие вызовы КРОМЕ последнего', () => {
      const first = call('first-post', 'post');
      const second = call('second-patch', 'patch');
      expect(selectTargetCalls([first, second])).toEqual([second]);
    });

    it('postWithResponse считается мутирующим (create_issue/idempotent POST)', () => {
      const target = call('target', 'postWithResponse');
      expect(selectTargetCalls([call('prep', 'get'), target])).toEqual([target]);
    });

    it('пустой список вызовов — пустой результат (не падает)', () => {
      expect(selectTargetCalls([])).toEqual([]);
    });
  });
});
