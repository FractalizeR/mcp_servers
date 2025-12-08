/**
 * Core Services Container
 *
 * Группирует базовые сервисы для YandexTrackerFacade:
 * - UserService (ping, user info)
 * - FieldService (fields management)
 *
 * Паттерн: Parameter Object для сокращения параметров конструктора Facade.
 */

import { injectable, inject } from 'inversify';
import { UserService } from '../user.service.js';
import { FieldService } from '../field.service.js';

@injectable()
export class CoreServicesContainer {
  constructor(
    @inject(UserService) readonly user: UserService,
    @inject(FieldService) readonly field: FieldService
  ) {}
}
