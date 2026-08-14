/**
 * Тесты `findUnreachableLeaves()` (пакет 7.1.E плана модернизации MCP
 * 2026-07-28).
 *
 * Главный сценарий — регрессия дефекта "голый поиск true": поле-boolean
 * должно считаться НЕДОСТИЖИМЫМ, если в haystack есть `true` где-то ещё, но
 * не именно `"fieldName":true` — это ровно та ошибка, которую совершила
 * первая версия Трекер-теста до исправления (см. план 7.1.E).
 */

import { describe, it, expect } from 'vitest';
import {
  findUnreachableLeaves,
  describeUnreachableLeaf,
} from '../../../src/testing/schema-reachability/find-unreachable-leaves.js';
import type { ReachabilityLeaf } from '../../../src/testing/schema-reachability/generate-reachability-sample.js';

function leaves(entries: Record<string, ReachabilityLeaf>): Map<string, ReachabilityLeaf> {
  return new Map(Object.entries(entries));
}

describe('findUnreachableLeaves', () => {
  it('scalar-лист считается достигшим wire, если его value — подстрока haystack', () => {
    const result = findUnreachableLeaves(
      '{"summary":"probe_summary"}',
      leaves({ summary: { kind: 'scalar', value: 'probe_summary', fieldName: 'summary' } })
    );
    expect(result).toHaveLength(0);
  });

  it('scalar-лист считается НЕ достигшим wire, если value нигде не встречается', () => {
    const result = findUnreachableLeaves(
      '{"other":"value"}',
      leaves({ summary: { kind: 'scalar', value: 'probe_summary', fieldName: 'summary' } })
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.path).toBe('summary');
  });

  it('scalar-лист совпадает по значению независимо от имени JSON-ключа (переименование в DTO)', () => {
    // Схема поля называется body_location, но операция форвардит значение
    // 1:1 под ключом location — value-based matching не завязан на имя ключа.
    const result = findUnreachableLeaves(
      '{"body":{"location":"before"}}',
      leaves({ body_location: { kind: 'scalar', value: 'before', fieldName: 'body_location' } })
    );
    expect(result).toHaveLength(0);
  });

  describe('boolean — регрессия "голого true"', () => {
    it('boolean-лист достигает wire только при точной паре "fieldName":true', () => {
      const result = findUnreachableLeaves(
        '{"isSilent":true}',
        leaves({ isSilent: { kind: 'boolean', value: 'true', fieldName: 'isSilent' } })
      );
      expect(result).toHaveLength(0);
    });

    it('boolean-лист НЕ считается достигшим, если true принадлежит другому полю', () => {
      // haystack содержит true, но не для ЭТОГО поля — голый substring-поиск
      // "true" ошибочно засчитал бы это как совпадение (баг первой версии
      // Трекер-теста). Проверка пары должна его отловить.
      const result = findUnreachableLeaves(
        '{"otherField":true}',
        leaves({ isSilent: { kind: 'boolean', value: 'true', fieldName: 'isSilent' } })
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.path).toBe('isSilent');
    });

    it('boolean-лист достигает wire в форме query-строки fieldName=true', () => {
      const result = findUnreachableLeaves(
        'GET /v3/issues?isSilent=true',
        leaves({ isSilent: { kind: 'boolean', value: 'true', fieldName: 'isSilent' } })
      );
      expect(result).toHaveLength(0);
    });

    it('boolean(false)-лист требует пару "fieldName":false, а не совпадает с любым false', () => {
      const reached = findUnreachableLeaves(
        '{"recursive":false}',
        leaves({ recursive: { kind: 'boolean', value: 'false', fieldName: 'recursive' } })
      );
      expect(reached).toHaveLength(0);

      const notReached = findUnreachableLeaves(
        '{"otherFlag":false}',
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
        '{"anchor":{"fallback":true}}',
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
        '{"anchor_fallback":true}',
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
      '{}',
      leaves({ fields: { kind: 'scalar', value: 'probe_fields', fieldName: 'fields' } }),
      [{ path: 'fields', reason: 'клиентская фильтрация ответа, в API не отправляется' }]
    );
    expect(result).toHaveLength(0);
  });

  it('исключение по конкретному path не затрагивает другие листья с тем же значением-заглушкой', () => {
    const result = findUnreachableLeaves(
      '{}',
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
    });
    expect(message).toContain('create_issue');
    expect(message).toContain('summary');
    expect(message).toContain('probe_summary');
  });
});
