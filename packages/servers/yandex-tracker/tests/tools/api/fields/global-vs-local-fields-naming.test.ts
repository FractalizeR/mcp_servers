/**
 * Регрессионный тест: глобальные поля Трекера (`#tools/api/fields`, пакет
 * 7.2.E) и локальные поля очереди (`#tools/api/queue-local-fields`, пакет
 * 7.2.B) — разные сущности с разной адресацией. Тест фиксирует, что имена и
 * описания инструментов не позволяют их спутать, как этого требует план
 * (`.agentic-planning/plan_mcp_2026_modernization/7.2_api_coverage_parallel.md`,
 * раздел "Пакет 7.2.E").
 */

import { describe, it, expect } from 'vitest';
import {
  GetGlobalFieldsTool,
  GetGlobalFieldTool,
  CreateGlobalFieldTool,
  UpdateGlobalFieldTool,
  DeleteGlobalFieldTool,
} from '#tools/api/fields/index.js';
import {
  GetQueueLocalFieldsTool,
  CreateQueueLocalFieldTool,
  UpdateQueueLocalFieldTool,
} from '#tools/api/queue-local-fields/index.js';

const globalFieldTools = [
  GetGlobalFieldsTool,
  GetGlobalFieldTool,
  CreateGlobalFieldTool,
  UpdateGlobalFieldTool,
  DeleteGlobalFieldTool,
];

const queueLocalFieldTools = [
  GetQueueLocalFieldsTool,
  CreateQueueLocalFieldTool,
  UpdateQueueLocalFieldTool,
];

describe('Глобальные поля vs локальные поля очереди — разграничение', () => {
  it('имена инструментов не пересекаются', () => {
    const globalNames = globalFieldTools.map((t) => t.METADATA.name);
    const localNames = queueLocalFieldTools.map((t) => t.METADATA.name);

    for (const name of globalNames) {
      expect(localNames).not.toContain(name);
    }
    // Различимо по подстроке: global-инструменты содержат "global", а
    // local-инструменты — "local" в имени.
    for (const name of globalNames) {
      expect(name).toMatch(/global_field/);
    }
    for (const name of localNames) {
      expect(name).toMatch(/queue_local_field/);
    }
  });

  it('описания глобальных полей явно упоминают, что это не локальные поля очереди', () => {
    for (const ToolClass of globalFieldTools) {
      const description = ToolClass.METADATA.description;
      expect(description.toLowerCase()).toContain('глобальн');
    }
  });

  it('описания локальных полей очереди явно относятся к очереди', () => {
    for (const ToolClass of queueLocalFieldTools) {
      expect(ToolClass.METADATA.description.toLowerCase()).toContain('очеред');
    }
  });

  it('параметры адресации не смешаны: у глобальных полей нет queueId, у локальных нет fieldId', () => {
    const getGlobalFieldsShape = GetGlobalFieldTool.METADATA;
    expect(getGlobalFieldsShape.redactionAllowlist).toContain('fieldId');
    expect(getGlobalFieldsShape.redactionAllowlist).not.toContain('queueId');

    const getLocalFieldsShape = GetQueueLocalFieldsTool.METADATA;
    expect(getLocalFieldsShape.redactionAllowlist).toContain('queueId');
    expect(getLocalFieldsShape.redactionAllowlist).not.toContain('fieldId');
  });
});
