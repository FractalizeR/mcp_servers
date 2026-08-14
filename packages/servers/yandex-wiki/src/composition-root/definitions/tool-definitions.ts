import { PingTool } from '#tools/ping.tool.js';

// Pages
import { GetPageTool } from '#tools/api/pages/get/index.js';
import { GetPageByIdTool } from '#tools/api/pages/get-by-id/index.js';
import { CreatePageTool } from '#tools/api/pages/create/index.js';
import { UpdatePageTool } from '#tools/api/pages/update/index.js';
import { DeletePageTool } from '#tools/api/pages/delete/index.js';
import { ClonePageTool } from '#tools/api/pages/clone/index.js';
import { AppendContentTool } from '#tools/api/pages/append/index.js';
import { DiffPageTool } from '#tools/api/pages/diff/index.js';
import { GetDescendantsTool } from '#tools/api/pages/descendants/index.js';
import { GetDescendantsByIdTool } from '#tools/api/pages/descendants-by-id/index.js';

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

// Raw API (escape hatch)
import { RawApiRequestTool } from '#tools/api/raw/index.js';

// Search
import { SearchTool } from '#tools/api/search/index.js';

// Comments
import { GetCommentsTool } from '#tools/api/comments/get/index.js';
import { GetCommentThreadTool } from '#tools/api/comments/thread/index.js';
import { CreateCommentTool } from '#tools/api/comments/create/index.js';
import { DeleteCommentTool } from '#tools/api/comments/delete/index.js';

// Page Access
import { AddPageAccessTool } from '#tools/api/page-access/add/index.js';
import { UpdatePageAccessTool } from '#tools/api/page-access/update/index.js';
import { RemovePageAccessTool } from '#tools/api/page-access/remove/index.js';
import { RemoveAllPageAccessTool } from '#tools/api/page-access/remove-all/index.js';

// Attachments
import { UploadAttachmentTool } from '#tools/api/attachments/upload/index.js';
import { DownloadAttachmentTool } from '#tools/api/attachments/download/index.js';

/**
 * Все Tool классы для автоматической регистрации в DI
 *
 * Для добавления нового tool - просто добавь класс в массив
 */
export const TOOL_CLASSES = [
  // System
  PingTool,

  // Pages
  GetPageTool,
  GetPageByIdTool,
  CreatePageTool,
  UpdatePageTool,
  DeletePageTool,
  ClonePageTool,
  AppendContentTool,
  DiffPageTool,
  GetDescendantsTool,
  GetDescendantsByIdTool,

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

  // Raw API (escape hatch)
  RawApiRequestTool,

  // Search
  SearchTool,

  // Comments
  GetCommentsTool,
  GetCommentThreadTool,
  CreateCommentTool,
  DeleteCommentTool,

  // Page Access
  AddPageAccessTool,
  UpdatePageAccessTool,
  RemovePageAccessTool,
  RemoveAllPageAccessTool,

  // Attachments
  UploadAttachmentTool,
  DownloadAttachmentTool,
] as const;
