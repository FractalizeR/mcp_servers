/**
 * Определения всех Operations
 *
 * ВАЖНО: При добавлении новой Operation:
 * 1. Импортируй класс Operation
 * 2. Добавь его в массив OPERATION_CLASSES
 * 3. Всё остальное произойдёт автоматически (DI регистрация)
 */

import { PingOperation } from '@tracker_api/api_operations/user/ping.operation.js';
import {
  GetIssuesOperation,
  FindIssuesOperation,
  CreateIssueOperation,
  UpdateIssueOperation,
  GetIssueChangelogOperation,
  GetIssueTransitionsOperation,
  TransitionIssueOperation,
} from '@tracker_api/api_operations/issue/index.js';

/**
 * Массив всех Operation классов в проекте
 *
 * КОНВЕНЦИЯ ИМЕНОВАНИЯ:
 * - Класс ДОЛЖЕН заканчиваться на "Operation"
 * - Symbol автоматически создаётся как Symbol.for(ClassName)
 * - Пример: PingOperation → Symbol.for('PingOperation')
 */
export const OPERATION_CLASSES = [
  PingOperation,
  GetIssuesOperation,
  FindIssuesOperation,
  CreateIssueOperation,
  UpdateIssueOperation,
  GetIssueChangelogOperation,
  GetIssueTransitionsOperation,
  TransitionIssueOperation,
] as const;

/**
 * Тип для Operation классов (type-safe)
 */
export type OperationClass = (typeof OPERATION_CLASSES)[number];
