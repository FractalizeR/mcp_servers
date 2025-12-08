/**
 * Issue Services Container
 *
 * Группирует сервисы для работы с задачами:
 * - IssueService (CRUD, transitions, changelog)
 * - IssueLinkService (links between issues)
 * - IssueAttachmentService (file attachments)
 * - CommentService (issue comments)
 * - ChecklistService (issue checklists)
 * - WorklogService (time tracking)
 *
 * Паттерн: Parameter Object для сокращения параметров конструктора Facade.
 */

import { injectable, inject } from 'inversify';
import { IssueService } from '../issue.service.js';
import { IssueLinkService } from '../issue-link.service.js';
import { IssueAttachmentService } from '../issue-attachment.service.js';
import { CommentService } from '../comment.service.js';
import { ChecklistService } from '../checklist.service.js';
import { WorklogService } from '../worklog.service.js';

@injectable()
export class IssueServicesContainer {
  constructor(
    @inject(IssueService) readonly issue: IssueService,
    @inject(IssueLinkService) readonly link: IssueLinkService,
    @inject(IssueAttachmentService) readonly attachment: IssueAttachmentService,
    @inject(CommentService) readonly comment: CommentService,
    @inject(ChecklistService) readonly checklist: ChecklistService,
    @inject(WorklogService) readonly worklog: WorklogService
  ) {}
}
