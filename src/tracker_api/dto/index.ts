/**
 * Data Transfer Objects (DTO)
 *
 * ВАЖНО: DTO используются для type-safe отправки данных в API.
 * Содержат known поля + index signature [key: string]: unknown
 * для поддержки кастомных полей Яндекс.Трекера.
 */
export type {
  CreateIssueDto,
  UpdateIssueDto,
  SearchIssuesDto,
  FindIssuesInputDto,
} from './issue/index.js';
