/**
 * `ResourceProvider` для задач TickTick (пакет 5.1.C.ticktick плана
 * модернизации MCP 2026-07-28).
 *
 * Схема URI — `ticktick://task/{id}`, спроектирована планом (раздел 5.1.B).
 *
 * ПОЧЕМУ `readResource` ИДЁТ ЧЕРЕЗ `getAllTasks()`, А НЕ ЧЕРЕЗ ПРЯМОЙ GET.
 *
 * TickTick Open API v1 не даёт «получить задачу по одному только taskId» —
 * `GET /project/{projectId}/task/{taskId}` требует ОБА идентификатора (см.
 * `get-task.operation.ts`). Схема URI ресурса, однако, задана планом как
 * `ticktick://task/{id}` — без `projectId`. Поэтому единственный способ
 * разрешить произвольный `ticktick://task/{id}` (в т.ч. НЕ попавший в
 * `resources/list` — обязательное свойство контракта, см. `resource-provider.ts`
 * framework) — пройти по всем проектам через `TickTickFacade.getAllTasks()` и
 * найти задачу по `id`. Это то же самое агрегирование, что `getAllTasks()`
 * уже делает для `get_all_tasks`/`search_tasks`/etc — каждый `GetProjectDataOperation`
 * кеширован per-project (см. `get-project-data.operation.ts`), поэтому
 * повторные чтения ресурсов не бьют по API заново, пока кеш не истёк.
 *
 * `listResources` использует тот же `getAllTasks()` — единый источник
 * данных для списка и для чтения, никакого расхождения между тем, что видно
 * в `resources/list`, и тем, что разрешается напрямую.
 */

import type {
  ResourceProvider,
  ResourceListPage,
  McpResource,
  McpResourceContents,
  McpResourceTemplate,
} from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import { paginateOffset } from './pagination.js';

/** Размер страницы `resources/list` этого провайдера. */
const PAGE_SIZE = 50;

/** Префикс схемы URI задач TickTick. */
const TASK_URI_PREFIX = 'ticktick://task/';

/** Построить URI ресурса задачи по её идентификатору. */
export function buildTaskResourceUri(taskId: string): string {
  return `${TASK_URI_PREFIX}${encodeURIComponent(taskId)}`;
}

/**
 * Распарсить `id` задачи из URI своей схемы.
 *
 * @returns `id`, либо `undefined`, если `uri` не принадлежит схеме
 *   `ticktick://task/{id}` этого провайдера.
 */
function parseTaskId(uri: string): string | undefined {
  if (!uri.startsWith(TASK_URI_PREFIX)) {
    return undefined;
  }
  const rawId = uri.slice(TASK_URI_PREFIX.length);
  if (rawId.length === 0) {
    return undefined;
  }
  return decodeURIComponent(rawId);
}

function toMcpResource(task: TaskWithUnknownFields): McpResource {
  // name — машиночитаемый идентификатор (task.id), title — человекочитаемый
  // заголовок; та же конвенция, что и в task-resource-link.ts (не дублируем
  // заголовок в оба поля).
  return {
    uri: buildTaskResourceUri(task.id),
    name: task.id,
    ...(task.title ? { title: task.title } : {}),
    mimeType: 'application/json',
  };
}

function toMcpResourceContents(task: TaskWithUnknownFields): McpResourceContents {
  return {
    uri: buildTaskResourceUri(task.id),
    mimeType: 'application/json',
    text: JSON.stringify(task, null, 2),
  };
}

export class TaskResourceProvider implements ResourceProvider {
  public readonly id = 'ticktick-tasks';

  constructor(private readonly facade: TickTickFacade) {}

  async listResources(cursor?: string): Promise<ResourceListPage> {
    const tasks = await this.facade.getAllTasks();
    const page = paginateOffset(tasks, cursor, PAGE_SIZE);

    return {
      resources: page.items.map(toMcpResource),
      ...(page.nextCursor !== undefined ? { nextCursor: page.nextCursor } : {}),
    };
  }

  async readResource(uri: string): Promise<readonly McpResourceContents[] | undefined> {
    const taskId = parseTaskId(uri);
    if (taskId === undefined) {
      return undefined;
    }

    // Систематическая ошибка (сеть/авторизация) и «задачи с таким id нет»
    // здесь неразличимы без разбора конкретного класса ошибки API — оба
    // случая сводятся к `undefined` (см. заголовок файла и контракт
    // `ResourceProvider.readResource` — undefined не является ошибкой на
    // уровне ОДНОГО провайдера, `ResourceRegistry` решает дальше).
    let tasks: readonly TaskWithUnknownFields[];
    try {
      tasks = await this.facade.getAllTasks();
    } catch {
      return undefined;
    }

    const task = tasks.find((t) => t.id === taskId);
    return task === undefined ? undefined : [toMcpResourceContents(task)];
  }

  listTemplates(): readonly McpResourceTemplate[] {
    return [
      {
        uriTemplate: `${TASK_URI_PREFIX}{id}`,
        name: 'ticktick-task',
        title: 'Задача TickTick',
        description: 'Одна задача TickTick по её идентификатору',
        mimeType: 'application/json',
      },
    ];
  }
}
