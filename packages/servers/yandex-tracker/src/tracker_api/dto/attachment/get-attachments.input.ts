/**
 * DTO параметров получения списка файлов задачи (list).
 *
 * Используется в GetAttachmentsOperation / IssueAttachmentService.getAttachments[Many].
 *
 * ВАЖНО: эндпоинт `/v3/issues/{issueId}/attachments` НЕ пагинируется — API
 * отдаёт все вложения за один ответ (подтверждено сырыми заголовками: нет
 * `Link rel="next"`). Поэтому параметров пагинации/курсора у DTO нет.
 *
 * API: GET /v3/issues/{issueId}/attachments
 */
export interface GetAttachmentsInput {
  /**
   * Зарезервировано под будущие параметры запроса (например, expand).
   *
   * Сейчас вложения возвращаются целиком одним ответом — дополнительных полей
   * нет. Интерфейс сохранён для совместимости сигнатур operation/facade.
   */
  readonly [key: string]: never;
}
