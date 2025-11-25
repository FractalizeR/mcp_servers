import { PingTool } from '#tools/helpers/ping/index.js';
import { GetPageTool } from '#tools/api/pages/get/index.js';
import { GetPageByIdTool } from '#tools/api/pages/get-by-id/index.js';
import { CreatePageTool } from '#tools/api/pages/create/index.js';
import { UpdatePageTool } from '#tools/api/pages/update/index.js';
import { DeletePageTool } from '#tools/api/pages/delete/index.js';
import { ClonePageTool } from '#tools/api/pages/clone/index.js';
import { AppendContentTool } from '#tools/api/pages/append/index.js';

/**
 * Все Tool классы для автоматической регистрации в DI
 *
 * Для добавления нового tool - просто добавь класс в массив
 */
export const TOOL_CLASSES = [
  // Helpers
  PingTool,

  // Pages
  GetPageTool,
  GetPageByIdTool,
  CreatePageTool,
  UpdatePageTool,
  DeletePageTool,
  ClonePageTool,
  AppendContentTool,
] as const;
