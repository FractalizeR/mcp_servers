# Migration Guide — MCP Framework & Yandex Tracker

**Руководство по миграции между версиями**

---

## v2.x → v2.y: Обязательный параметр `fields`

### Breaking Change

Все MCP tools теперь требуют обязательный параметр `fields: string[]`.

**ДО:**
```typescript
await client.callTool('get_projects', { perPage: 10 });
```

**ПОСЛЕ:**
```typescript
await client.callTool('get_projects', {
  perPage: 10,
  fields: ['id', 'name', 'description']  // ← обязательно
});
```

### Затронутые tools (26)

- **Checklists:** `add_checklist_item`, `get_checklist`, `update_checklist_item`
- **Comments:** `add_comment`, `edit_comment`, `get_comments`
- **Components:** `create_component`, `get_components`, `update_component`
- **Attachments:** `get_attachments`, `upload_attachment`
- **Links:** `create_link`, `get_issue_links`
- **Projects:** `create_project`, `get_project`, `get_projects`, `update_project`
- **Queues:** `create_queue`, `get_queue`, `get_queues`, `get_queue_fields`, `manage_queue_access`, `update_queue`
- **Worklogs:** `add_worklog`, `get_worklogs`, `update_worklog`

### Миграция

1. Добавьте параметр `fields` во все вызовы перечисленных tools
2. Укажите минимальный набор нужных полей для экономии контекста
3. Используйте вложенные поля: `['assignee.login', 'status.key']`

### Преимущества

- Экономия контекста Claude на 80-90%
- Быстрее обработка ответов
- Явное управление возвращаемыми данными

---

## См. также

- **Корневой CLAUDE.md:** [CLAUDE.md](./CLAUDE.md)
- **Yandex Tracker README:** [packages/servers/yandex-tracker/README.md](packages/servers/yandex-tracker/README.md)
- **Архитектура:** [ARCHITECTURE.md](./ARCHITECTURE.md)
