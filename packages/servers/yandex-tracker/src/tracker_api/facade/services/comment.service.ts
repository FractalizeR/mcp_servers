/**
 * Comment Service - сервис для работы с комментариями задач
 *
 * Ответственность:
 * - Добавление комментария к задаче
 * - Получение списка комментариев задачи
 * - Редактирование комментария
 * - Удаление комментария
 *
 * Архитектура:
 * - Прямая инъекция операций через декораторы (@injectable + @inject)
 * - Нет зависимостей от других сервисов
 * - Делегирование вызовов операциям
 *
 * ВАЖНО: Использует декораторы InversifyJS для DI.
 * В отличие от Operations/Tools (ручная регистрация), новые сервисы
 * используют декораторы для более чистого и type-safe кода.
 */

import { injectable, inject } from 'inversify';
import { AddCommentOperation } from '#tracker_api/api_operations/comment/add-comment.operation.js';
import { GetCommentsOperation } from '#tracker_api/api_operations/comment/get-comments.operation.js';
import { EditCommentOperation } from '#tracker_api/api_operations/comment/edit-comment.operation.js';
import { DeleteCommentOperation } from '#tracker_api/api_operations/comment/delete-comment.operation.js';
import type {
  AddCommentInput,
  EditCommentInput,
  GetCommentsInput,
} from '#tracker_api/dto/index.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';

@injectable()
export class CommentService {
  constructor(
    @inject(AddCommentOperation) private readonly addCommentOp: AddCommentOperation,
    @inject(GetCommentsOperation) private readonly getCommentsOp: GetCommentsOperation,
    @inject(EditCommentOperation) private readonly editCommentOp: EditCommentOperation,
    @inject(DeleteCommentOperation) private readonly deleteCommentOp: DeleteCommentOperation
  ) {}

  /**
   * Добавляет комментарий к задаче
   * @param issueId - идентификатор или ключ задачи
   * @param input - данные комментария
   * @returns созданный комментарий
   */
  async addComment(issueId: string, input: AddCommentInput): Promise<CommentWithUnknownFields> {
    return this.addCommentOp.execute(issueId, input);
  }

  /**
   * Добавляет комментарии к нескольким задачам параллельно
   * @param comments - массив комментариев с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   */
  async addCommentsMany(
    comments: Array<{ issueId: string; text: string; attachmentIds?: string[] | undefined }>
  ): Promise<BatchResult<string, CommentWithUnknownFields>> {
    return this.addCommentOp.executeMany(comments);
  }

  /**
   * Получает список комментариев задачи
   * @param issueId - идентификатор или ключ задачи
   * @param input - параметры запроса (пагинация, expand)
   * @returns массив комментариев
   */
  async getComments(
    issueId: string,
    input?: GetCommentsInput
  ): Promise<CommentWithUnknownFields[]> {
    return this.getCommentsOp.execute(issueId, input);
  }

  /**
   * Получает комментарии для нескольких задач параллельно
   * @param issueIds - массив идентификаторов задач
   * @param input - параметры запроса (применяются ко всем задачам)
   * @returns массив результатов в формате BatchResult
   */
  async getCommentsMany(
    issueIds: string[],
    input?: GetCommentsInput
  ): Promise<BatchResult<string, CommentWithUnknownFields[]>> {
    return this.getCommentsOp.executeMany(issueIds, input);
  }

  /**
   * Редактирует комментарий
   * @param issueId - идентификатор или ключ задачи
   * @param commentId - идентификатор комментария
   * @param input - новые данные комментария
   * @returns обновлённый комментарий
   */
  async editComment(
    issueId: string,
    commentId: string,
    input: EditCommentInput
  ): Promise<CommentWithUnknownFields> {
    return this.editCommentOp.execute(issueId, commentId, input);
  }

  /**
   * Редактирует несколько комментариев параллельно
   * @param comments - массив комментариев для редактирования с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   */
  async editCommentsMany(
    comments: Array<{ issueId: string; commentId: string; text: string }>
  ): Promise<BatchResult<string, CommentWithUnknownFields>> {
    return this.editCommentOp.executeMany(comments);
  }

  /**
   * Удаляет комментарий
   * @param issueId - идентификатор или ключ задачи
   * @param commentId - идентификатор комментария
   * @returns void
   */
  async deleteComment(issueId: string, commentId: string): Promise<void> {
    return this.deleteCommentOp.execute(issueId, commentId);
  }

  /**
   * Удаляет комментарии из нескольких задач параллельно
   * @param comments - массив комментариев для удаления с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   */
  async deleteCommentsMany(
    comments: Array<{ issueId: string; commentId: string }>
  ): Promise<BatchResult<string, void>> {
    return this.deleteCommentOp.executeMany(comments);
  }
}
