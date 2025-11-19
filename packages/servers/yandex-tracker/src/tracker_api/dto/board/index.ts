/**
 * Board DTO - экспорт типов для работы с досками
 */

// Input DTOs
export type { GetBoardsDto } from './get-boards.dto.js';
export type { GetBoardDto } from './get-board.dto.js';
export type {
  CreateBoardDto,
  CreateBoardColumnDto,
  CreateBoardFilterDto,
} from './create-board.dto.js';
export type { UpdateBoardDto } from './update-board.dto.js';
export type { DeleteBoardDto } from './delete-board.dto.js';

// Output DTOs
export type { BoardOutput } from './board.output.js';
export type { BoardsListOutput } from './boards-list.output.js';
