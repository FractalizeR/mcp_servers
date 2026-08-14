/**
 * Контрактный тест: Entity API (Goal/Project/Portfolio, `/v3/entities/...`) не
 * смешивается с legacy `/v2/projects` — ни по именам инструментов, ни по
 * описаниям (DoD пакета 7.2.A/7.2.B, п. 2:
 * .agentic-planning/plan_mcp_2026_modernization/7.2_api_coverage_parallel.md).
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

const LEGACY_PROJECT_TOOL_NAMES = [
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

describe('Entity API vs legacy /v2/projects — контракт разделения', () => {
  it('ни один инструмент Entity API не называется так же, как legacy-инструмент проектов', () => {
    const overlap = ENTITY_API_TOOL_NAMES.filter((n) => LEGACY_PROJECT_TOOL_NAMES.includes(n));
    expect(overlap).toEqual([]);
  });

  it('все инструменты Entity API существуют в реестре и READ/WRITE-инструменты для CRUD явно упоминают отличие от /v2/projects', () => {
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
        `Описание ${ToolClass.METADATA.name} должно явно отличать Entity API от legacy /v2/projects`
      ).toMatch(/v2\/projects|legacy/i);
    }
  });

  it('legacy-инструменты проектов существуют и не претендуют быть Entity API', () => {
    for (const shortName of LEGACY_PROJECT_TOOL_NAMES) {
      const ToolClass = findByShortName(shortName);
      expect(ToolClass.METADATA.description).not.toMatch(/entity api/i);
    }
  });

  it('все инструменты Entity API зарегистрированы в реестре ровно один раз', () => {
    for (const shortName of ENTITY_API_TOOL_NAMES) {
      const matches = TOOL_CLASSES.filter((tc) => tc.METADATA.name.endsWith(`_${shortName}`));
      expect(matches, `Инструмент "${shortName}"`).toHaveLength(1);
    }
  });
});
