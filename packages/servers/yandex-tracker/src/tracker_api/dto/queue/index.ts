/**
 * Queue DTO модуль - экспорт всех DTO для работы с очередями
 */

// Input DTO
export type { GetQueuesDto } from './get-queues.dto.js';
export type { GetQueueDto } from './get-queue.dto.js';
export type { CreateQueueDto } from './create-queue.dto.js';
export type { UpdateQueueDto } from './update-queue.dto.js';
export type { GetQueueFieldsDto } from './get-queue-fields.dto.js';
export type { ManageQueueAccessDto, AccessAction } from './manage-queue-access.dto.js';

// Output DTO
export type { QueueOutput } from './queue.output.js';
export type { QueuesListOutput } from './queues-list.output.js';
export type { QueueFieldsOutput } from './queue-fields.output.js';
export type { QueuePermissionsOutput } from './queue-permissions.output.js';

// DTO Factories (runtime code for coverage)
export {
  createGetQueuesDto,
  createGetQueueDto,
  createMinimalCreateQueueDto,
  createFullCreateQueueDto,
  createUpdateQueueDto,
  createGetQueueFieldsDto,
  createAddQueueAccessDto,
  createRemoveQueueAccessDto,
} from './dto.factories.js';
