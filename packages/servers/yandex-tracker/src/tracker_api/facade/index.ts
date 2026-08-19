export { YandexTrackerFacade } from './yandex-tracker.facade.js';
export * from './services/index.js';

// Ошибка — часть контракта facade.transitionIssue(): вызывающий обязан отличить
// «переход не выполнен» от «выполнен, но состояние не дочитано». Класс объявлен
// в операции, которая его бросает, и публикуется здесь, чтобы потребители facade
// не тянулись в api_operations.
export { IssueRefetchAfterTransitionError } from '#tracker_api/api_operations/issue/transitions/transition-issue.operation.js';
