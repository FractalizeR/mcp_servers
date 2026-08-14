import { z } from 'zod';
import { PageIdSchema } from '#common/schemas/index.js';

export const DiffPageParamsSchema = z.object({
  idx: PageIdSchema,
  newContent: z
    .string()
    .describe('Предлагаемое новое содержимое страницы для сравнения с текущим (не сохраняется)'),
});

export type DiffPageParams = z.infer<typeof DiffPageParamsSchema>;

const LineDiffEntryOutputSchema = z.object({
  op: z.enum(['equal', 'remove', 'add']),
  text: z.string(),
  oldLineNumber: z.number().int().optional(),
  newLineNumber: z.number().int().optional(),
});

/**
 * Данные успешного результата (см. DiffPageTool.execute).
 *
 * `newContent` НЕ входит в результат — не дублируем пользовательский текст,
 * который агент и так передал во входных параметрах; сам diff (поле `lines`)
 * неизбежно несёт фрагменты обоих текстов и остаётся вне redactionAllowlist
 * ЛОГА вызова (см. diff-page.metadata.ts), но это отдельный контур
 * (результат tool call, а не redacted-лог параметров).
 */
export const DiffPageOutputDataSchema = z.object({
  pageId: z.number(),
  slug: z.string().optional(),
  title: z.string().optional(),
  hasChanges: z.boolean(),
  summary: z.object({
    linesAdded: z.number().int().min(0),
    linesRemoved: z.number().int().min(0),
    linesUnchanged: z.number().int().min(0),
  }),
  lines: z.array(LineDiffEntryOutputSchema),
});
