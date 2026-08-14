/**
 * Entity API DTO - экспорт типов для работы с Goal/Project/Portfolio
 */

export type { FindEntitiesDto } from './find-entities.dto.js';
export type { GetEntityDto } from './get-entity.dto.js';
export type { CreateEntityDto } from './create-entity.dto.js';
export type { UpdateEntityDto } from './update-entity.dto.js';
export type { DeleteEntityDto } from './delete-entity.dto.js';
export type {
  KeyResultItemInputDto,
  GetGoalKeyResultsDto,
  AddGoalKeyResultDto,
  SetGoalKeyResultsDto,
  ClearGoalKeyResultsDto,
} from './key-result.dto.js';
export type { EntityApiOutput } from './entity.output.js';
