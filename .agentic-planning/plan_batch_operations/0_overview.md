# План: Batch Operations Support

## Цель
Добавить batch support во все tools, которые работают с одним issueId, позволяя обрабатывать несколько задач за один вызов.

## Прогресс

### ✅ Завершено

| Tool | Commit | Дата |
|------|--------|------|
| add-worklog | `feat(worklog): добавить batch support в add-worklog tool` | — |
| delete-comment | `feat(comments): добавить batch support в delete-comment tool` | — |
| edit-comment | `feat(comments): добавить batch support в edit-comment tool` | — |
| get-attachments | `feat(attachments): добавить batch support в get-attachments tool` | — |
| get-checklist | `feat(checklists): добавить batch support в get-checklist tool` | — |
| add-checklist-item | `feat(checklists): добавить batch support в add-checklist-item tool` | — |

### ⏳ Ожидает выполнения

| Tool | Приоритет | Тип операции |
|------|-----------|--------------|
| update-checklist-item | HIGH | POST (items array) |
| delete-checklist-item | HIGH | DELETE (items array) |

---

## Архитектурные паттерны

### Batch Schema Patterns

**GET операции (issueIds array):**
```typescript
export const GetChecklistParamsSchema = z.object({
  issueIds: z.array(IssueKeySchema).min(1),
  fields: FieldsSchema,
});
```

**POST/PATCH операции (items array):**
```typescript
export const AddChecklistItemParamsSchema = z.object({
  items: z.array(z.object({
    issueId: IssueKeySchema,
    text: z.string(),
    // ... other fields
  })).min(1),
  fields: FieldsSchema,
});
```

### Operation executeMany Pattern

```typescript
async executeMany(
  items: Array<{ issueId: string; /* params */ }>
): Promise<BatchResult<string, T>> {
  if (items.length === 0) {
    this.logger.warn('OperationName: пустой массив элементов');
    return [];
  }
  this.logger.info(`Operation description ${items.length} tasks: ${items.map(i => i.issueId).join(', ')}`);

  const operations = items.map(({ issueId, ...params }) => ({
    key: issueId,
    fn: async () => this.execute(issueId, params),
  }));

  return this.parallelExecutor.executeParallel(operations, 'operation name');
}
```

### Tool execute Pattern

```typescript
async execute(params: ToolCallParams): Promise<ToolResult> {
  const validation = this.validateParams(params, Schema);
  if (!validation.success) return validation.error;

  const { items, fields } = validation.data;

  try {
    ResultLogger.logOperationStart(this.logger, 'Operation name', items.length, fields);
    const results = await this.facade.operationMany(items);
    const processedResults = BatchResultProcessor.process(
      results,
      (item: T) => ResponseFieldFilter.filter<T>(item, fields)
    );
    ResultLogger.logBatchResults(this.logger, 'Operation completed', {...}, processedResults);

    return this.formatSuccess({
      total: items.length,
      successful: processedResults.successful.length,
      failed: processedResults.failed.length,
      items: processedResults.successful.map(...),
      errors: processedResults.failed.map(...),
      fieldsReturned: fields,
    });
  } catch (error) {
    return this.formatError('Error message', error);
  }
}
```

### Required Changes per Tool

1. **Operation** - добавить executeMany с ParallelExecutor
2. **Service** - добавить proxy метод xxxMany
3. **Facade** - добавить proxy метод xxxMany
4. **Schema** - изменить на items[] array
5. **Tool** - использовать BatchResultProcessor
6. **Metadata** - добавить "batch" tag
7. **Unit tests** - обновить для batch API
8. **Integration tests** - обновить для batch API
9. **Workflow tests** - обновить вызовы инструмента
