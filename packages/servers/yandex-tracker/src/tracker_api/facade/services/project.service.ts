/**
 * Project Service - сервис для работы с проектами
 *
 * Ответственность:
 * - Получение списка проектов
 * - Получение одного проекта по ID
 * - Создание нового проекта
 * - Обновление проекта
 * - Удаление проекта
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
import { GetProjectsOperation } from '#tracker_api/api_operations/project/get-projects.operation.js';
import { GetProjectOperation } from '#tracker_api/api_operations/project/get-project.operation.js';
import { CreateProjectOperation } from '#tracker_api/api_operations/project/create-project.operation.js';
import { UpdateProjectOperation } from '#tracker_api/api_operations/project/update-project.operation.js';
import { DeleteProjectOperation } from '#tracker_api/api_operations/project/delete-project.operation.js';
import type {
  GetProjectsDto,
  CreateProjectDto,
  ProjectOutput,
  ProjectsListOutput,
} from '#tracker_api/dto/index.js';
import type {
  GetProjectParams,
  UpdateProjectParams,
  DeleteProjectParams,
} from '#tracker_api/api_operations/index.js';

@injectable()
export class ProjectService {
  constructor(
    @inject(GetProjectsOperation)
    private readonly getProjectsOp: GetProjectsOperation,
    @inject(GetProjectOperation)
    private readonly getProjectOp: GetProjectOperation,
    @inject(CreateProjectOperation)
    private readonly createProjectOp: CreateProjectOperation,
    @inject(UpdateProjectOperation)
    private readonly updateProjectOp: UpdateProjectOperation,
    @inject(DeleteProjectOperation)
    private readonly deleteProjectOp: DeleteProjectOperation
  ) {}

  /**
   * Получает список проектов
   * @param params - параметры запроса (опционально)
   * @returns список проектов
   */
  async getProjects(params?: GetProjectsDto): Promise<ProjectsListOutput> {
    return this.getProjectsOp.execute(params);
  }

  /**
   * Получает один проект по ID
   * @param params - параметры запроса (projectId, expand)
   * @returns проект
   */
  async getProject(params: GetProjectParams): Promise<ProjectOutput> {
    return this.getProjectOp.execute(params);
  }

  /**
   * Создаёт новый проект
   * @param data - данные проекта
   * @returns созданный проект
   */
  async createProject(data: CreateProjectDto): Promise<ProjectOutput> {
    return this.createProjectOp.execute(data);
  }

  /**
   * Обновляет проект
   * @param params - параметры обновления (projectId, data)
   * @returns обновлённый проект
   */
  async updateProject(params: UpdateProjectParams): Promise<ProjectOutput> {
    return this.updateProjectOp.execute(params);
  }

  /**
   * Удаляет проект
   * @param params - параметры удаления (projectId)
   * @returns void
   */
  async deleteProject(params: DeleteProjectParams): Promise<void> {
    return this.deleteProjectOp.execute(params);
  }
}
