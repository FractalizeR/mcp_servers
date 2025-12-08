/**
 * IssueOperations Container
 *
 * Группирует все операции связанные с задачами в один injectable контейнер.
 * Используется для уменьшения количества параметров конструктора IssueService.
 *
 * Паттерн: Parameter Object + Dependency Injection
 */

import { injectable, inject } from 'inversify';
import { GetIssuesOperation } from '#tracker_api/api_operations/issue/get-issues.operation.js';
import { FindIssuesOperation } from '#tracker_api/api_operations/issue/find/find-issues.operation.js';
import { CreateIssueOperation } from '#tracker_api/api_operations/issue/create/create-issue.operation.js';
import { UpdateIssueOperation } from '#tracker_api/api_operations/issue/update/update-issue.operation.js';
import { GetIssueChangelogOperation } from '#tracker_api/api_operations/issue/changelog/get-issue-changelog.operation.js';
import { GetIssueTransitionsOperation } from '#tracker_api/api_operations/issue/transitions/get-issue-transitions.operation.js';
import { TransitionIssueOperation } from '#tracker_api/api_operations/issue/transitions/transition-issue.operation.js';

@injectable()
export class IssueOperationsContainer {
  constructor(
    @inject(GetIssuesOperation) readonly getIssues: GetIssuesOperation,
    @inject(FindIssuesOperation) readonly findIssues: FindIssuesOperation,
    @inject(CreateIssueOperation) readonly createIssue: CreateIssueOperation,
    @inject(UpdateIssueOperation) readonly updateIssue: UpdateIssueOperation,
    @inject(GetIssueChangelogOperation) readonly getIssueChangelog: GetIssueChangelogOperation,
    @inject(GetIssueTransitionsOperation)
    readonly getIssueTransitions: GetIssueTransitionsOperation,
    @inject(TransitionIssueOperation) readonly transitionIssue: TransitionIssueOperation
  ) {}
}
