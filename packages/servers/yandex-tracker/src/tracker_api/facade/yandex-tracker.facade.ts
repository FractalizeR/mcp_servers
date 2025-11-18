/**
 * Фасад для работы с API Яндекс.Трекера
 *
 * Ответственность (SRP):
 * - ТОЛЬКО делегирование вызовов операциям
 * - НЕТ бизнес-логики (всё в операциях)
 * - НЕТ ручной инициализации (извлекается из DI контейнера)
 *
 * КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ:
 * - Ленивая инициализация через DI контейнер (вместо new)
 * - Масштабируется до 50+ операций БЕЗ изменения Facade
 * - Удалён двойной retry (исправлена проблема 9 попыток)
 *
 * Паттерн: Facade Pattern + Lazy Initialization
 */

import type { Container } from 'inversify';

// Types
import type { PingResult } from '@tracker_api/api_operations/user/ping.operation.js';
import type { BatchIssueResult } from '@tracker_api/api_operations/issue/get-issues.operation.js';
import type { FindIssuesResult } from '@tracker_api/api_operations/issue/find/index.js';
import type {
  FindIssuesInputDto,
  CreateIssueDto,
  UpdateIssueDto,
  ExecuteTransitionDto,
  GetQueuesDto,
  GetQueueDto,
  CreateQueueDto,
  GetQueueFieldsDto,
  QueueOutput,
  QueuesListOutput,
  QueueFieldsOutput,
  QueuePermissionsOutput,
  CreateLinkDto,
  AddCommentInput,
  EditCommentInput,
  GetCommentsInput,
  UploadAttachmentInput,
  DownloadAttachmentInput,
  DownloadAttachmentOutput,
} from '@tracker_api/dto/index.js';
import type {
  IssueWithUnknownFields,
  ChangelogEntryWithUnknownFields,
  TransitionWithUnknownFields,
  LinkWithUnknownFields,
  CommentWithUnknownFields,
  AttachmentWithUnknownFields,
} from '@tracker_api/entities/index.js';
import type {
  UpdateQueueParams,
  ManageQueueAccessParams,
} from '@tracker_api/api_operations/index.js';

export class YandexTrackerFacade {
  constructor(private readonly container: Container) {}

  /**
   * Helper для ленивого получения операции из DI контейнера
   * @private
   */
  private getOperation<T>(operationName: string): T {
    return this.container.get<T>(Symbol.for(operationName));
  }

  // === User Methods ===

  /**
   * Проверяет подключение к API Яндекс.Трекера
   * @returns результат проверки
   */
  async ping(): Promise<PingResult> {
    const operation = this.getOperation<{ execute: () => Promise<PingResult> }>('PingOperation');
    return operation.execute();
  }

  // === Issue Methods - Batch ===

  /**
   * Получает несколько задач параллельно
   * @param issueKeys - массив ключей задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async getIssues(issueKeys: string[]): Promise<BatchIssueResult[]> {
    const operation = this.getOperation<{
      execute: (keys: string[]) => Promise<BatchIssueResult[]>;
    }>('GetIssuesOperation');
    return operation.execute(issueKeys);
  }

  // === Issue Methods - Search ===

  /**
   * Ищет задачи по заданным критериям
   * @param params - параметры поиска (query/filter/keys/queue)
   * @returns массив найденных задач
   */
  async findIssues(params: FindIssuesInputDto): Promise<FindIssuesResult> {
    const operation = this.getOperation<{
      execute: (params: FindIssuesInputDto) => Promise<FindIssuesResult>;
    }>('FindIssuesOperation');
    return operation.execute(params);
  }

  // === Issue Methods - Create/Update ===

  /**
   * Создаёт новую задачу
   * @param issueData - данные задачи
   * @returns созданная задача
   */
  async createIssue(issueData: CreateIssueDto): Promise<IssueWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (data: CreateIssueDto) => Promise<IssueWithUnknownFields>;
    }>('CreateIssueOperation');
    return operation.execute(issueData);
  }

  /**
   * Обновляет существующую задачу
   * @param issueKey - ключ задачи
   * @param updateData - данные для обновления
   * @returns обновлённая задача
   */
  async updateIssue(issueKey: string, updateData: UpdateIssueDto): Promise<IssueWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (key: string, data: UpdateIssueDto) => Promise<IssueWithUnknownFields>;
    }>('UpdateIssueOperation');
    return operation.execute(issueKey, updateData);
  }

  // === Issue Methods - Changelog ===

  /**
   * Получает историю изменений задачи
   * @param issueKey - ключ задачи
   * @returns массив записей истории
   */
  async getIssueChangelog(issueKey: string): Promise<ChangelogEntryWithUnknownFields[]> {
    const operation = this.getOperation<{
      execute: (key: string) => Promise<ChangelogEntryWithUnknownFields[]>;
    }>('GetIssueChangelogOperation');
    return operation.execute(issueKey);
  }

  // === Issue Methods - Transitions ===

  /**
   * Получает доступные переходы статусов для задачи
   * @param issueKey - ключ задачи
   * @returns массив доступных переходов
   */
  async getIssueTransitions(issueKey: string): Promise<TransitionWithUnknownFields[]> {
    const operation = this.getOperation<{
      execute: (key: string) => Promise<TransitionWithUnknownFields[]>;
    }>('GetIssueTransitionsOperation');
    return operation.execute(issueKey);
  }

  /**
   * Выполняет переход задачи в другой статус
   * @param issueKey - ключ задачи
   * @param transitionId - идентификатор перехода
   * @param transitionData - дополнительные данные (опционально)
   * @returns обновлённая задача
   */
  async transitionIssue(
    issueKey: string,
    transitionId: string,
    transitionData?: ExecuteTransitionDto
  ): Promise<IssueWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (
        key: string,
        id: string,
        data?: ExecuteTransitionDto
      ) => Promise<IssueWithUnknownFields>;
    }>('TransitionIssueOperation');
    return operation.execute(issueKey, transitionId, transitionData);
  }

  // === Queue Methods ===

  /**
   * Получает список очередей с пагинацией
   * @param params - параметры запроса (perPage, page, expand)
   * @returns массив очередей
   */
  async getQueues(params?: GetQueuesDto): Promise<QueuesListOutput> {
    const operation = this.getOperation<{
      execute: (params?: GetQueuesDto) => Promise<QueuesListOutput>;
    }>('GetQueuesOperation');
    return operation.execute(params);
  }

  /**
   * Получает одну очередь по ID или ключу
   * @param params - параметры запроса (queueId, expand)
   * @returns очередь с полными данными
   */
  async getQueue(params: GetQueueDto): Promise<QueueOutput> {
    const operation = this.getOperation<{
      execute: (params: GetQueueDto) => Promise<QueueOutput>;
    }>('GetQueueOperation');
    return operation.execute(params);
  }

  /**
   * Создаёт новую очередь
   * @param queueData - данные очереди
   * @returns созданная очередь
   */
  async createQueue(queueData: CreateQueueDto): Promise<QueueOutput> {
    const operation = this.getOperation<{
      execute: (data: CreateQueueDto) => Promise<QueueOutput>;
    }>('CreateQueueOperation');
    return operation.execute(queueData);
  }

  /**
   * Обновляет существующую очередь
   * @param params - параметры (queueId и updates)
   * @returns обновлённая очередь
   */
  async updateQueue(params: UpdateQueueParams): Promise<QueueOutput> {
    const operation = this.getOperation<{
      execute: (params: UpdateQueueParams) => Promise<QueueOutput>;
    }>('UpdateQueueOperation');
    return operation.execute(params);
  }

  /**
   * Получает список обязательных полей очереди
   * @param params - параметры запроса (queueId)
   * @returns массив полей очереди
   */
  async getQueueFields(params: GetQueueFieldsDto): Promise<QueueFieldsOutput> {
    const operation = this.getOperation<{
      execute: (params: GetQueueFieldsDto) => Promise<QueueFieldsOutput>;
    }>('GetQueueFieldsOperation');
    return operation.execute(params);
  }

  /**
   * Управляет правами доступа к очереди
   * @param params - параметры (queueId и accessData)
   * @returns массив прав доступа
   */
  async manageQueueAccess(params: ManageQueueAccessParams): Promise<QueuePermissionsOutput> {
    const operation = this.getOperation<{
      execute: (params: ManageQueueAccessParams) => Promise<QueuePermissionsOutput>;
    }>('ManageQueueAccessOperation');
    return operation.execute(params);
  }

  // === Issue Methods - Links ===

  /**
   * Получает все связи для указанной задачи
   * @param issueId - ключ или ID задачи
   * @returns массив связей задачи
   */
  async getIssueLinks(issueId: string): Promise<LinkWithUnknownFields[]> {
    const operation = this.getOperation<{
      execute: (id: string) => Promise<LinkWithUnknownFields[]>;
    }>('GetIssueLinksOperation');
    return operation.execute(issueId);
  }

  /**
   * Создаёт связь между текущей и указанной задачей
   * @param issueId - ключ или ID текущей задачи
   * @param linkData - параметры связи (relationship и issue)
   * @returns созданная связь
   */
  async createLink(issueId: string, linkData: CreateLinkDto): Promise<LinkWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (id: string, data: CreateLinkDto) => Promise<LinkWithUnknownFields>;
    }>('CreateLinkOperation');
    return operation.execute(issueId, linkData);
  }

  /**
   * Удаляет связь между задачами
   * @param issueId - ключ или ID задачи
   * @param linkId - ID связи для удаления
   */
  async deleteLink(issueId: string, linkId: string): Promise<void> {
    const operation = this.getOperation<{
      execute: (id: string, linkId: string) => Promise<void>;
    }>('DeleteLinkOperation');
    return operation.execute(issueId, linkId);
  }

  // === Comment Methods ===

  /**
   * Добавляет комментарий к задаче
   * @param issueId - идентификатор или ключ задачи
   * @param input - данные комментария
   * @returns созданный комментарий
   */
  async addComment(issueId: string, input: AddCommentInput): Promise<CommentWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (id: string, data: AddCommentInput) => Promise<CommentWithUnknownFields>;
    }>('AddCommentOperation');
    return operation.execute(issueId, input);
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
    const operation = this.getOperation<{
      execute: (id: string, data?: GetCommentsInput) => Promise<CommentWithUnknownFields[]>;
    }>('GetCommentsOperation');
    return operation.execute(issueId, input);
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
    const operation = this.getOperation<{
      execute: (
        id: string,
        cId: string,
        data: EditCommentInput
      ) => Promise<CommentWithUnknownFields>;
    }>('EditCommentOperation');
    return operation.execute(issueId, commentId, input);
  }

  /**
   * Удаляет комментарий
   * @param issueId - идентификатор или ключ задачи
   * @param commentId - идентификатор комментария
   * @returns void
   */
  async deleteComment(issueId: string, commentId: string): Promise<void> {
    const operation = this.getOperation<{
      execute: (id: string, cId: string) => Promise<void>;
    }>('DeleteCommentOperation');
    return operation.execute(issueId, commentId);
  }

  // === Issue Methods - Attachments ===

  /**
   * Получает список всех прикрепленных файлов задачи
   * @param issueId - ключ или ID задачи
   * @returns массив прикрепленных файлов
   */
  async getAttachments(issueId: string): Promise<AttachmentWithUnknownFields[]> {
    const operation = this.getOperation<{
      execute: (id: string) => Promise<AttachmentWithUnknownFields[]>;
    }>('GetAttachmentsOperation');
    return operation.execute(issueId);
  }

  /**
   * Загружает файл в задачу
   * @param issueId - ключ или ID задачи
   * @param input - параметры загрузки файла (filename, file, mimetype)
   * @returns информация о загруженном файле
   */
  async uploadAttachment(
    issueId: string,
    input: UploadAttachmentInput
  ): Promise<AttachmentWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (id: string, input: UploadAttachmentInput) => Promise<AttachmentWithUnknownFields>;
    }>('UploadAttachmentOperation');
    return operation.execute(issueId, input);
  }

  /**
   * Скачивает прикрепленный файл из задачи
   * @param issueId - ключ или ID задачи
   * @param attachmentId - ID прикрепленного файла
   * @param filename - имя файла
   * @param input - опции скачивания (saveToPath, returnBase64)
   * @returns содержимое файла и метаданные
   */
  async downloadAttachment(
    issueId: string,
    attachmentId: string,
    filename: string,
    input?: DownloadAttachmentInput
  ): Promise<DownloadAttachmentOutput> {
    const operation = this.getOperation<{
      execute: (
        id: string,
        attId: string,
        fname: string,
        input?: DownloadAttachmentInput
      ) => Promise<DownloadAttachmentOutput>;
    }>('DownloadAttachmentOperation');
    return operation.execute(issueId, attachmentId, filename, input);
  }

  /**
   * Удаляет прикрепленный файл из задачи
   * @param issueId - ключ или ID задачи
   * @param attachmentId - ID прикрепленного файла
   */
  async deleteAttachment(issueId: string, attachmentId: string): Promise<void> {
    const operation = this.getOperation<{
      execute: (id: string, attId: string) => Promise<void>;
    }>('DeleteAttachmentOperation');
    return operation.execute(issueId, attachmentId);
  }

  /**
   * Получает миниатюру прикрепленного изображения
   * @param issueId - ключ или ID задачи
   * @param attachmentId - ID прикрепленного файла (должно быть изображение)
   * @param input - опции скачивания (saveToPath, returnBase64)
   * @returns содержимое миниатюры и метаданные
   */
  async getThumbnail(
    issueId: string,
    attachmentId: string,
    input?: DownloadAttachmentInput
  ): Promise<DownloadAttachmentOutput> {
    const operation = this.getOperation<{
      execute: (
        id: string,
        attId: string,
        input?: DownloadAttachmentInput
      ) => Promise<DownloadAttachmentOutput>;
    }>('GetThumbnailOperation');
    return operation.execute(issueId, attachmentId, input);
  }
}
