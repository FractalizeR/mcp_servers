import type { Board, BoardWithUnknownFields } from '#tracker_api/entities/board.entity.js';
import type { Sprint, SprintWithUnknownFields } from '#tracker_api/entities/sprint.entity.js';

export function createBoardFixture(overrides?: Partial<Board>): BoardWithUnknownFields {
  const id = overrides?.id ?? '1';
  return {
    id,
    self: `https://api.tracker.yandex.net/v3/boards/${id}`,
    version: 1,
    name: 'Test Board',
    ...overrides,
  };
}

export function createSprintFixture(overrides?: Partial<Sprint>): SprintWithUnknownFields {
  const id = overrides?.id ?? '1';
  return {
    id,
    self: `https://api.tracker.yandex.net/v3/sprints/${id}`,
    version: 1,
    name: 'Test Sprint',
    ...overrides,
  };
}
