import type { ConfigPromptDefinition } from '@fractalizer/mcp-cli';
import type { YandexTrackerMCPConfig } from './types.js';
import { DEFAULT_LOG_LEVEL } from '#constants';

/**
 * Промпты сбора доменной конфигурации Yandex Tracker.
 *
 * Порядок важен: `orgType` спрашивается перед `orgId`, чтобы пользователь
 * понимал, какой именно идентификатор он сейчас вводит (Я360 vs Yandex Cloud).
 */
export const ytConfigPrompts: ConfigPromptDefinition<YandexTrackerMCPConfig>[] = [
  {
    name: 'token',
    type: 'password',
    message: 'OAuth токен Яндекс.Трекера:',
    mask: '*',
    validate: (value): string | true => {
      if (typeof value !== 'string' || value.length === 0) {
        return 'Токен обязателен';
      }
      return true;
    },
  },
  {
    name: 'orgType',
    type: 'select',
    message: 'Тип организации:',
    choices: [
      { name: 'Яндекс 360 для бизнеса', value: 'yandex360' },
      { name: 'Yandex Cloud Organization', value: 'cloud' },
    ],
    default: (saved) => saved?.orgType ?? 'yandex360',
  },
  {
    name: 'orgId',
    type: 'input',
    message: 'ID организации (для выбранного типа):',
    default: (saved) => saved?.orgId,
    validate: (value): string | true => {
      if (typeof value !== 'string' || value.length === 0) {
        return 'ID организации обязателен';
      }
      return true;
    },
  },
  {
    name: 'apiBase',
    type: 'input',
    message: 'Базовый URL API (необязательно, Enter для пропуска):',
    default: (saved) => saved?.apiBase,
  },
  {
    name: 'logLevel',
    type: 'select',
    message: 'Уровень логирования:',
    choices: [
      { name: 'Debug', value: 'debug' },
      { name: 'Info', value: 'info' },
      { name: 'Warning', value: 'warn' },
      { name: 'Error', value: 'error' },
    ],
    default: (saved) => saved?.logLevel ?? DEFAULT_LOG_LEVEL,
  },
];
