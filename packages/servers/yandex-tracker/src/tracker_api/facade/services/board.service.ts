/**
 * Board Service - сервис для работы с досками
 *
 * Ответственность:
 * - Получение списка досок
 * - Получение доски по ID
 * - Создание новой доски
 * - Обновление доски
 * - Удаление доски
 *
 * Архитектура:
 * - Прямая инъекция операций через декораторы (@injectable + @inject)
 * - Нет зависимостей от других сервисов
 * - Делегирование вызовов операциям
 *
 * ВАЖНО: Использует декораторы InversifyJS для DI.
 * В отличие от Operations/Tools (ручная регистрация), новые сервисы
 * используют декораторы для более чистого и type-safe кода.
 */

import { injectable, inject } from 'inversify';
import { GetBoardsOperation } from '#tracker_api/api_operations/board/get-boards.operation.js';
import { GetBoardOperation } from '#tracker_api/api_operations/board/get-board.operation.js';
import { CreateBoardOperation } from '#tracker_api/api_operations/board/create-board.operation.js';
import { UpdateBoardOperation } from '#tracker_api/api_operations/board/update-board.operation.js';
import { DeleteBoardOperation } from '#tracker_api/api_operations/board/delete-board.operation.js';
import type {
  GetBoardsDto,
  GetBoardDto,
  CreateBoardDto,
  UpdateBoardDto,
  BoardOutput,
  BoardsListOutput,
} from '#tracker_api/dto/index.js';

@injectable()
export class BoardService {
  constructor(
    @inject(GetBoardsOperation)
    private readonly getBoardsOp: GetBoardsOperation,
    @inject(GetBoardOperation)
    private readonly getBoardOp: GetBoardOperation,
    @inject(CreateBoardOperation)
    private readonly createBoardOp: CreateBoardOperation,
    @inject(UpdateBoardOperation)
    private readonly updateBoardOp: UpdateBoardOperation,
    @inject(DeleteBoardOperation)
    private readonly deleteBoardOp: DeleteBoardOperation
  ) {}

  /**
   * Получает список всех досок
   * @param params - параметры запроса (опционально)
   * @returns массив досок
   */
  async getBoards(params?: GetBoardsDto): Promise<BoardsListOutput> {
    return this.getBoardsOp.execute(params);
  }

  /**
   * Получает доску по ID
   * @param boardId - идентификатор доски
   * @param params - дополнительные параметры (localized)
   * @returns данные доски
   */
  async getBoard(boardId: string, params?: Omit<GetBoardDto, 'boardId'>): Promise<BoardOutput> {
    return this.getBoardOp.execute({ boardId, ...params });
  }

  /**
   * Создает новую доску
   * @param input - данные для создания доски
   * @returns созданная доска
   */
  async createBoard(input: CreateBoardDto): Promise<BoardOutput> {
    return this.createBoardOp.execute(input);
  }

  /**
   * Обновляет доску
   * @param boardId - идентификатор доски
   * @param input - данные для обновления
   * @returns обновленная доска
   */
  async updateBoard(boardId: string, input: Omit<UpdateBoardDto, 'boardId'>): Promise<BoardOutput> {
    return this.updateBoardOp.execute({ boardId, ...input });
  }

  /**
   * Удаляет доску
   * @param boardId - идентификатор доски
   */
  async deleteBoard(boardId: string): Promise<void> {
    return this.deleteBoardOp.execute({ boardId });
  }
}
