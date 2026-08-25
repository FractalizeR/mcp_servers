/**
 * Контрактный тест: Entity API (Goal/Project/Portfolio, `/v3/entities/{type}`)
 * не смешивается с коллекцией проектов (`/v3/projects`, инструменты
 * `get_projects`/`create_project`/...) — ни по именам инструментов, ни по
 * описаниям (DoD пакета 7.2.A/7.2.B, п. 2:
 * .agentic-planning/plan_mcp_2026_modernization/7.2_api_coverage_parallel.md).
 *
 * ВАЖНО: после миграции на API v3 обе коллекции лежат на `/v3/...` — версия
 * пути больше не различает их. Различение проверяется по фактическому пути
 * коллекции (`/v3/entities/` у Entity API, `/v3/projects` у legacy-проектов),
 * а не по слову "legacy" или версии в тексте описания (находка код-ревью
 * этапа 4.1: регулярка `/v2\/projects|legacy/i` проходила только за счёт
 * слова "legacy" и не проверяла реальное отличие путей).
 */

import { describe, it, expect } from 'vitest';
import { TOOL_CLASSES } from '#composition-root/definitions/tool-definitions.js';

const ENTITY_API_TOOL_NAMES = [
  'find_entities',
  'get_entity',
  'create_entity',
  'update_entity',
  'delete_entity',
  'get_goal_key_results',
  'add_goal_key_result',
  'set_goal_key_results',
  'clear_goal_key_results',
];

const PROJECTS_COLLECTION_TOOL_NAMES = [
  'get_projects',
  'get_project',
  'create_project',
  'update_project',
  'delete_project',
];

function findByShortName(shortName: string) {
  const ToolClass = TOOL_CLASSES.find((tc) => tc.METADATA.name.endsWith(`_${shortName}`));
  if (!ToolClass) {
    throw new Error(`Tool "${shortName}" не найден в TOOL_CLASSES`);
  }
  return ToolClass;
}

describe('Entity API vs коллекция /v3/projects — контракт разделения', () => {
  it('ни один инструмент Entity API не называется так же, как инструмент коллекции /v3/projects', () => {
    const overlap = ENTITY_API_TOOL_NAMES.filter((n) => PROJECTS_COLLECTION_TOOL_NAMES.includes(n));
    expect(overlap).toEqual([]);
  });

  it('READ/WRITE-инструменты Entity API для CRUD явно называют путь /v3/entities/', () => {
    const crudNeedingDisambiguation = [
      'find_entities',
      'get_entity',
      'create_entity',
      'update_entity',
      'delete_entity',
    ];

    for (const shortName of crudNeedingDisambiguation) {
      const ToolClass = findByShortName(shortName);
      const description = ToolClass.METADATA.description;

      expect(
        description,
        `Описание ${ToolClass.METADATA.name} должно называть путь /v3/entities/, ` +
          'отличающий Entity API от коллекции /v3/projects'
      ).toMatch(/\/v3\/entities\//i);
    }
  });

  it('инструменты коллекции /v3/projects существуют и не претендуют быть Entity API', () => {
    for (const shortName of PROJECTS_COLLECTION_TOOL_NAMES) {
      const ToolClass = findByShortName(shortName);
      expect(ToolClass.METADATA.description).not.toMatch(/\/v3\/entities\//i);
    }
  });

  it('все инструменты Entity API зарегистрированы в реестре ровно один раз', () => {
    for (const shortName of ENTITY_API_TOOL_NAMES) {
      const matches = TOOL_CLASSES.filter((tc) => tc.METADATA.name.endsWith(`_${shortName}`));
      expect(matches, `Инструмент "${shortName}"`).toHaveLength(1);
    }
  });
});
