import { PingTool } from '#tools/helpers/ping/index.js';

// Pages
import { GetPageTool } from '#tools/api/pages/get/index.js';
import { GetPageByIdTool } from '#tools/api/pages/get-by-id/index.js';
import { CreatePageTool } from '#tools/api/pages/create/index.js';
import { UpdatePageTool } from '#tools/api/pages/update/index.js';
import { DeletePageTool } from '#tools/api/pages/delete/index.js';
import { ClonePageTool } from '#tools/api/pages/clone/index.js';
import { AppendContentTool } from '#tools/api/pages/append/index.js';

// Grids
import { CreateGridTool } from '#tools/api/grids/create/index.js';
import { GetGridTool } from '#tools/api/grids/get/index.js';
import { UpdateGridTool } from '#tools/api/grids/update/index.js';
import { DeleteGridTool } from '#tools/api/grids/delete/index.js';
import { CloneGridTool } from '#tools/api/grids/clone/index.js';
import { AddRowsTool } from '#tools/api/grids/rows/add/index.js';
import { RemoveRowsTool } from '#tools/api/grids/rows/remove/index.js';
import { MoveRowsTool } from '#tools/api/grids/rows/move/index.js';
import { AddColumnsTool } from '#tools/api/grids/columns/add/index.js';
import { RemoveColumnsTool } from '#tools/api/grids/columns/remove/index.js';
import { MoveColumnsTool } from '#tools/api/grids/columns/move/index.js';
import { UpdateCellsTool } from '#tools/api/grids/cells/update/index.js';

// Resources
import { GetResourcesTool } from '#tools/api/resources/get/index.js';

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

  // Grids
  CreateGridTool,
  GetGridTool,
  UpdateGridTool,
  DeleteGridTool,
  CloneGridTool,
  AddRowsTool,
  RemoveRowsTool,
  MoveRowsTool,
  AddColumnsTool,
  RemoveColumnsTool,
  MoveColumnsTool,
  UpdateCellsTool,

  // Resources
  GetResourcesTool,
] as const;
