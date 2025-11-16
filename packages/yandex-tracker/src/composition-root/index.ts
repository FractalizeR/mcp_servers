/**
 * Composition Root
 *
 * Центральная точка создания и конфигурации всех зависимостей приложения.
 * Находится выше всех слоёв архитектуры (infrastructure, tracker_api, mcp).
 */

export { createContainer } from './container.js';
export { TYPES } from './types.js';
