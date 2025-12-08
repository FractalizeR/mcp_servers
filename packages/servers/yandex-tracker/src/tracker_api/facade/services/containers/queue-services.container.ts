/**
 * Queue Services Container
 *
 * Группирует сервисы для работы с очередями:
 * - QueueService (CRUD queues, fields, access)
 * - ComponentService (queue components)
 *
 * Паттерн: Parameter Object для сокращения параметров конструктора Facade.
 */

import { injectable, inject } from 'inversify';
import { QueueService } from '../queue.service.js';
import { ComponentService } from '../component.service.js';

@injectable()
export class QueueServicesContainer {
  constructor(
    @inject(QueueService) readonly queue: QueueService,
    @inject(ComponentService) readonly component: ComponentService
  ) {}
}
