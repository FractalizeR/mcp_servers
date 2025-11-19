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
 *
 * TODO: Рефакторинг - разделить на несколько фасадов по доменам
 */
/* eslint-disable max-lines */

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
  CreateComponentDto,
  UpdateComponentDto,
  ComponentOutput,
  ComponentsListOutput,
  CreateLinkDto,
  AddCommentInput,
  EditCommentInput,
  GetCommentsInput,
  AddWorklogInput,
  UpdateWorklogInput,
  UploadAttachmentInput,
  DownloadAttachmentInput,
  DownloadAttachmentOutput,
  AddChecklistItemInput,
  UpdateChecklistItemInput,
  GetProjectsDto,
  CreateProjectDto,
  ProjectOutput,
  ProjectsListOutput,
  BulkUpdateIssuesInputDto,
  BulkTransitionIssuesInputDto,
  BulkMoveIssuesInputDto,
  CreateFieldDto,
  UpdateFieldDto,
  FieldOutput,
  FieldsListOutput,
  GetBoardsDto,
  GetBoardDto,
  CreateBoardDto,
  UpdateBoardDto,
  BoardOutput,
  BoardsListOutput,
  GetSprintsDto,
  GetSprintDto,
  CreateSprintDto,
  UpdateSprintDto,
  SprintOutput,
  SprintsListOutput,
} from '@tracker_api/dto/index.js';
import type {
  IssueWithUnknownFields,
  ChangelogEntryWithUnknownFields,
  TransitionWithUnknownFields,
  LinkWithUnknownFields,
  CommentWithUnknownFields,
  WorklogWithUnknownFields,
  AttachmentWithUnknownFields,
  ChecklistItemWithUnknownFields,
  BulkChangeOperationWithUnknownFields,
} from '@tracker_api/entities/index.js';
import type {
  UpdateQueueParams,
  ManageQueueAccessParams,
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
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

  // === Project Methods ===

  /**
   * Получает список проектов
   * @param params - параметры запроса (опционально)
   * @returns список проектов
   */
  async getProjects(params?: GetProjectsDto): Promise<ProjectsListOutput> {
    const operation = this.getOperation<{
      execute: (params?: GetProjectsDto) => Promise<ProjectsListOutput>;
    }>('GetProjectsOperation');
    return operation.execute(params);
  }

  /**
   * Получает один проект по ID
   * @param params - параметры запроса (projectId, expand)
   * @returns проект
   */
  async getProject(params: GetProjectParams): Promise<ProjectOutput> {
    const operation = this.getOperation<{
      execute: (params: GetProjectParams) => Promise<ProjectOutput>;
    }>('GetProjectOperation');
    return operation.execute(params);
  }

  /**
   * Создаёт новый проект
   * @param data - данные проекта
   * @returns созданный проект
   */
  async createProject(data: CreateProjectDto): Promise<ProjectOutput> {
    const operation = this.getOperation<{
      execute: (data: CreateProjectDto) => Promise<ProjectOutput>;
    }>('CreateProjectOperation');
    return operation.execute(data);
  }

  /**
   * Обновляет проект
   * @param params - параметры обновления (projectId, data)
   * @returns обновлённый проект
   */
  async updateProject(params: UpdateProjectParams): Promise<ProjectOutput> {
    const operation = this.getOperation<{
      execute: (params: UpdateProjectParams) => Promise<ProjectOutput>;
    }>('UpdateProjectOperation');
    return operation.execute(params);
  }

  /**
   * Удаляет проект
   * @param params - параметры удаления (projectId)
   * @returns void
   */
  async deleteProject(params: DeleteProjectParams): Promise<void> {
    const operation = this.getOperation<{
      execute: (params: DeleteProjectParams) => Promise<void>;
    }>('DeleteProjectOperation');
    return operation.execute(params);
  }

  // === Component Methods ===

  /**
   * Получает список компонентов очереди
   * @param queueId - ключ или ID очереди
   * @returns массив компонентов очереди
   */
  async getComponents(params: { queueId: string }): Promise<ComponentsListOutput> {
    const operation = this.getOperation<{
      execute: (queueId: string) => Promise<ComponentsListOutput>;
    }>('GetComponentsOperation');
    return operation.execute(params.queueId);
  }

  /**
   * Создаёт новый компонент в очереди
   * @param queueId - ключ или ID очереди
   * @param componentData - данные компонента
   * @returns созданный компонент
   */
  async createComponent(params: {
    queueId: string;
    name: string;
    description?: string | undefined;
    lead?: string | undefined;
    assignAuto?: boolean | undefined;
  }): Promise<ComponentOutput> {
    const { queueId, ...componentData } = params;
    const operation = this.getOperation<{
      execute: (queueId: string, data: CreateComponentDto) => Promise<ComponentOutput>;
    }>('CreateComponentOperation');
    return operation.execute(queueId, componentData);
  }

  /**
   * Обновляет существующий компонент
   * @param componentId - ID компонента
   * @param componentData - данные для обновления
   * @returns обновлённый компонент
   */
  async updateComponent(params: {
    componentId: string;
    name?: string | undefined;
    description?: string | undefined;
    lead?: string | undefined;
    assignAuto?: boolean | undefined;
  }): Promise<ComponentOutput> {
    const { componentId, ...componentData } = params;
    const operation = this.getOperation<{
      execute: (componentId: string, data: UpdateComponentDto) => Promise<ComponentOutput>;
    }>('UpdateComponentOperation');
    return operation.execute(componentId, componentData);
  }

  /**
   * Удаляет компонент из очереди
   * @param componentId - ID компонента
   */
  async deleteComponent(params: { componentId: string }): Promise<void> {
    const operation = this.getOperation<{
      execute: (componentId: string) => Promise<void>;
    }>('DeleteComponentOperation');
    return operation.execute(params.componentId);
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

  // === Checklist Methods ===

  /**
   * Получает чеклист задачи
   * @param issueId - идентификатор или ключ задачи
   * @returns массив элементов чеклиста
   */
  async getChecklist(issueId: string): Promise<ChecklistItemWithUnknownFields[]> {
    const operation = this.getOperation<{
      execute: (id: string) => Promise<ChecklistItemWithUnknownFields[]>;
    }>('GetChecklistOperation');
    return operation.execute(issueId);
  }

  /**
   * Добавляет элемент в чеклист задачи
   * @param issueId - идентификатор или ключ задачи
   * @param input - данные элемента
   * @returns созданный элемент чеклиста
   */
  async addChecklistItem(
    issueId: string,
    input: AddChecklistItemInput
  ): Promise<ChecklistItemWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (id: string, data: AddChecklistItemInput) => Promise<ChecklistItemWithUnknownFields>;
    }>('AddChecklistItemOperation');
    return operation.execute(issueId, input);
  }

  /**
   * Обновляет элемент чеклиста
   * @param issueId - идентификатор или ключ задачи
   * @param checklistItemId - идентификатор элемента чеклиста
   * @param input - новые данные элемента
   * @returns обновлённый элемент чеклиста
   */
  async updateChecklistItem(
    issueId: string,
    checklistItemId: string,
    input: UpdateChecklistItemInput
  ): Promise<ChecklistItemWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (
        id: string,
        itemId: string,
        data: UpdateChecklistItemInput
      ) => Promise<ChecklistItemWithUnknownFields>;
    }>('UpdateChecklistItemOperation');
    return operation.execute(issueId, checklistItemId, input);
  }

  /**
   * Удаляет элемент из чеклиста
   * @param issueId - идентификатор или ключ задачи
   * @param checklistItemId - идентификатор элемента чеклиста
   * @returns void
   */
  async deleteChecklistItem(issueId: string, checklistItemId: string): Promise<void> {
    const operation = this.getOperation<{
      execute: (id: string, itemId: string) => Promise<void>;
    }>('DeleteChecklistItemOperation');
    return operation.execute(issueId, checklistItemId);
  }

  // === Worklog Methods ===

  /**
   * Получает список записей времени задачи
   * @param issueId - идентификатор или ключ задачи
   * @returns массив записей времени
   */
  async getWorklogs(issueId: string): Promise<WorklogWithUnknownFields[]> {
    const operation = this.getOperation<{
      execute: (id: string) => Promise<WorklogWithUnknownFields[]>;
    }>('GetWorklogsOperation');
    return operation.execute(issueId);
  }

  /**
   * Добавляет запись времени к задаче
   * @param issueId - идентификатор или ключ задачи
   * @param input - данные записи времени
   * @returns созданная запись времени
   */
  async addWorklog(issueId: string, input: AddWorklogInput): Promise<WorklogWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (id: string, data: AddWorklogInput) => Promise<WorklogWithUnknownFields>;
    }>('AddWorklogOperation');
    return operation.execute(issueId, input);
  }

  /**
   * Обновляет запись времени
   * @param issueId - идентификатор или ключ задачи
   * @param worklogId - идентификатор записи времени
   * @param input - новые данные записи времени
   * @returns обновлённая запись времени
   */
  async updateWorklog(
    issueId: string,
    worklogId: string,
    input: UpdateWorklogInput
  ): Promise<WorklogWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (
        id: string,
        wId: string,
        data: UpdateWorklogInput
      ) => Promise<WorklogWithUnknownFields>;
    }>('UpdateWorklogOperation');
    return operation.execute(issueId, worklogId, input);
  }

  /**
   * Удаляет запись времени
   * @param issueId - идентификатор или ключ задачи
   * @param worklogId - идентификатор записи времени
   * @returns void
   */
  async deleteWorklog(issueId: string, worklogId: string): Promise<void> {
    const operation = this.getOperation<{
      execute: (id: string, wId: string) => Promise<void>;
    }>('DeleteWorklogOperation');
    return operation.execute(issueId, worklogId);
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
      execute: (id: string, attId: string, fname: string) => Promise<Buffer>;
      getMetadata: (id: string, attId: string) => Promise<AttachmentWithUnknownFields>;
    }>('DownloadAttachmentOperation');

    // Получаем метаданные файла
    const metadata = await operation.getMetadata(issueId, attachmentId);

    // Скачиваем файл
    const buffer = await operation.execute(issueId, attachmentId, filename);

    // Формируем результат
    const content = input?.returnBase64 ? buffer.toString('base64') : buffer;

    return {
      content,
      metadata,
    };
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
      execute: (id: string, attId: string) => Promise<Buffer>;
      getMetadata: (id: string, attId: string) => Promise<AttachmentWithUnknownFields>;
    }>('GetThumbnailOperation');

    // Получаем метаданные файла
    const metadata = await operation.getMetadata(issueId, attachmentId);

    // Скачиваем миниатюру
    const buffer = await operation.execute(issueId, attachmentId);

    // Формируем результат
    const content = input?.returnBase64 ? buffer.toString('base64') : buffer;

    return {
      content,
      metadata,
    };
  }

  // === Bulk Change Methods ===

  /**
   * Выполняет массовое обновление задач
   *
   * ВАЖНО: Операция выполняется асинхронно на сервере.
   * Метод возвращает информацию об операции (включая operationId).
   * Для проверки статуса используй getBulkChangeStatus(operationId).
   *
   * @param params - параметры массового обновления (issues + values)
   * @returns информация о запущенной операции
   *
   * @example
   * ```typescript
   * const operation = await facade.bulkUpdateIssues({
   *   issues: ['QUEUE-1', 'QUEUE-2', 'QUEUE-3'],
   *   values: {
   *     priority: 'minor',
   *     tags: { add: ['bug'] }
   *   }
   * });
   * // Проверить статус позже
   * const status = await facade.getBulkChangeStatus(operation.id);
   * ```
   */
  async bulkUpdateIssues(
    params: BulkUpdateIssuesInputDto
  ): Promise<BulkChangeOperationWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (p: BulkUpdateIssuesInputDto) => Promise<BulkChangeOperationWithUnknownFields>;
    }>('BulkUpdateIssuesOperation');
    return operation.execute(params);
  }

  /**
   * Выполняет массовую смену статусов задач
   *
   * ВАЖНО: Операция выполняется асинхронно на сервере.
   * Метод возвращает информацию об операции (включая operationId).
   * Для проверки статуса используй getBulkChangeStatus(operationId).
   *
   * @param params - параметры массового перехода (issues + transition + values)
   * @returns информация о запущенной операции
   *
   * @example
   * ```typescript
   * // Простой переход
   * const operation = await facade.bulkTransitionIssues({
   *   issues: ['QUEUE-1', 'QUEUE-2'],
   *   transition: 'start_progress'
   * });
   *
   * // С установкой resolution
   * const operation = await facade.bulkTransitionIssues({
   *   issues: ['QUEUE-1', 'QUEUE-2'],
   *   transition: 'close',
   *   values: { resolution: 'fixed' }
   * });
   * ```
   */
  async bulkTransitionIssues(
    params: BulkTransitionIssuesInputDto
  ): Promise<BulkChangeOperationWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (p: BulkTransitionIssuesInputDto) => Promise<BulkChangeOperationWithUnknownFields>;
    }>('BulkTransitionIssuesOperation');
    return operation.execute(params);
  }

  /**
   * Выполняет массовое перемещение задач между очередями
   *
   * ВАЖНО: Операция выполняется асинхронно на сервере.
   * Метод возвращает информацию об операции (включая operationId).
   * Для проверки статуса используй getBulkChangeStatus(operationId).
   *
   * @param params - параметры массового перемещения (issues + queue + values)
   * @returns информация о запущенной операции
   *
   * @example
   * ```typescript
   * // Простое перемещение
   * const operation = await facade.bulkMoveIssues({
   *   issues: ['QUEUE1-1', 'QUEUE1-2'],
   *   queue: 'QUEUE2'
   * });
   *
   * // С сохранением всех полей
   * const operation = await facade.bulkMoveIssues({
   *   issues: ['QUEUE1-1', 'QUEUE1-2'],
   *   queue: 'QUEUE2',
   *   moveAllFields: true
   * });
   * ```
   */
  async bulkMoveIssues(
    params: BulkMoveIssuesInputDto
  ): Promise<BulkChangeOperationWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (p: BulkMoveIssuesInputDto) => Promise<BulkChangeOperationWithUnknownFields>;
    }>('BulkMoveIssuesOperation');
    return operation.execute(params);
  }

  /**
   * Получает текущий статус bulk операции
   *
   * Используется для мониторинга прогресса асинхронных операций
   * (bulkUpdateIssues, bulkTransitionIssues, bulkMoveIssues).
   *
   * @param operationId - идентификатор операции (из response.id при создании)
   * @returns актуальная информация о статусе операции
   *
   * @example
   * ```typescript
   * const status = await facade.getBulkChangeStatus('12345');
   * console.log(`Статус: ${status.status}, прогресс: ${status.progress}%`);
   * console.log(`Обработано: ${status.processedIssues}/${status.totalIssues}`);
   *
   * // Polling с ожиданием завершения
   * async function waitForCompletion(operationId: string) {
   *   while (true) {
   *     const status = await facade.getBulkChangeStatus(operationId);
   *     if (status.status === 'COMPLETED' || status.status === 'FAILED') {
   *       return status;
   *     }
   *     await new Promise(resolve => setTimeout(resolve, 2000));
   *   }
   * }
   * ```
   */
  async getBulkChangeStatus(operationId: string): Promise<BulkChangeOperationWithUnknownFields> {
    const operation = this.getOperation<{
      execute: (id: string) => Promise<BulkChangeOperationWithUnknownFields>;
    }>('GetBulkChangeStatusOperation');
    return operation.execute(operationId);
  }

  // === Field Methods ===

  /**
   * Получает список всех полей трекера
   * @returns массив всех полей (системных и кастомных)
   */
  async getFields(): Promise<FieldsListOutput> {
    const operation = this.getOperation<{ execute: () => Promise<FieldsListOutput> }>(
      'GetFieldsOperation'
    );
    return operation.execute();
  }

  /**
   * Получает поле по ID
   * @param fieldId - идентификатор поля
   * @returns данные поля
   */
  async getField(fieldId: string): Promise<FieldOutput> {
    const operation = this.getOperation<{ execute: (id: string) => Promise<FieldOutput> }>(
      'GetFieldOperation'
    );
    return operation.execute(fieldId);
  }

  /**
   * Создает кастомное поле
   * @param input - данные для создания поля
   * @returns созданное поле
   */
  async createField(input: CreateFieldDto): Promise<FieldOutput> {
    const operation = this.getOperation<{
      execute: (input: CreateFieldDto) => Promise<FieldOutput>;
    }>('CreateFieldOperation');
    return operation.execute(input);
  }

  /**
   * Обновляет поле
   * @param fieldId - идентификатор поля
   * @param input - данные для обновления
   * @returns обновленное поле
   */
  async updateField(fieldId: string, input: UpdateFieldDto): Promise<FieldOutput> {
    const operation = this.getOperation<{
      execute: (id: string, input: UpdateFieldDto) => Promise<FieldOutput>;
    }>('UpdateFieldOperation');
    return operation.execute(fieldId, input);
  }

  /**
   * Удаляет поле
   * @param fieldId - идентификатор поля
   */
  async deleteField(fieldId: string): Promise<void> {
    const operation = this.getOperation<{ execute: (id: string) => Promise<void> }>(
      'DeleteFieldOperation'
    );
    return operation.execute(fieldId);
  }

  // === Board Methods ===

  /**
   * Получает список всех досок
   * @param params - параметры запроса (опционально)
   * @returns массив досок
   */
  async getBoards(params?: GetBoardsDto): Promise<BoardsListOutput> {
    const operation = this.getOperation<{
      execute: (params?: GetBoardsDto) => Promise<BoardsListOutput>;
    }>('GetBoardsOperation');
    return operation.execute(params);
  }

  /**
   * Получает доску по ID
   * @param boardId - идентификатор доски
   * @param params - дополнительные параметры (localized)
   * @returns данные доски
   */
  async getBoard(boardId: string, params?: Omit<GetBoardDto, 'boardId'>): Promise<BoardOutput> {
    const operation = this.getOperation<{
      execute: (params: GetBoardDto) => Promise<BoardOutput>;
    }>('GetBoardOperation');
    return operation.execute({ boardId, ...params });
  }

  /**
   * Создает новую доску
   * @param input - данные для создания доски
   * @returns созданная доска
   */
  async createBoard(input: CreateBoardDto): Promise<BoardOutput> {
    const operation = this.getOperation<{
      execute: (input: CreateBoardDto) => Promise<BoardOutput>;
    }>('CreateBoardOperation');
    return operation.execute(input);
  }

  /**
   * Обновляет доску
   * @param boardId - идентификатор доски
   * @param input - данные для обновления
   * @returns обновленная доска
   */
  async updateBoard(boardId: string, input: Omit<UpdateBoardDto, 'boardId'>): Promise<BoardOutput> {
    const operation = this.getOperation<{
      execute: (input: UpdateBoardDto) => Promise<BoardOutput>;
    }>('UpdateBoardOperation');
    return operation.execute({ boardId, ...input });
  }

  /**
   * Удаляет доску
   * @param boardId - идентификатор доски
   */
  async deleteBoard(boardId: string): Promise<void> {
    const operation = this.getOperation<{
      execute: (params: { boardId: string }) => Promise<void>;
    }>('DeleteBoardOperation');
    return operation.execute({ boardId });
  }

  // === Sprint Methods ===

  /**
   * Получает список спринтов доски
   * @param boardId - идентификатор доски
   * @returns массив спринтов
   */
  async getSprints(boardId: string): Promise<SprintsListOutput> {
    const operation = this.getOperation<{
      execute: (params: GetSprintsDto) => Promise<SprintsListOutput>;
    }>('GetSprintsOperation');
    return operation.execute({ boardId });
  }

  /**
   * Получает спринт по ID
   * @param sprintId - идентификатор спринта
   * @returns данные спринта
   */
  async getSprint(sprintId: string): Promise<SprintOutput> {
    const operation = this.getOperation<{
      execute: (params: GetSprintDto) => Promise<SprintOutput>;
    }>('GetSprintOperation');
    return operation.execute({ sprintId });
  }

  /**
   * Создает новый спринт
   * @param input - данные для создания спринта
   * @returns созданный спринт
   */
  async createSprint(input: CreateSprintDto): Promise<SprintOutput> {
    const operation = this.getOperation<{
      execute: (input: CreateSprintDto) => Promise<SprintOutput>;
    }>('CreateSprintOperation');
    return operation.execute(input);
  }

  /**
   * Обновляет спринт
   * @param sprintId - идентификатор спринта
   * @param input - данные для обновления
   * @returns обновленный спринт
   */
  async updateSprint(
    sprintId: string,
    input: Omit<UpdateSprintDto, 'sprintId'>
  ): Promise<SprintOutput> {
    const operation = this.getOperation<{
      execute: (input: UpdateSprintDto) => Promise<SprintOutput>;
    }>('UpdateSprintOperation');
    return operation.execute({ sprintId, ...input });
  }
}
