import type { ConfigPromptDefinition } from '@fractalizer/mcp-cli';
import type { YandexTrackerMCPConfig } from './types.js';
import { DEFAULT_LOG_LEVEL } from '../constants.js';

export const ytConfigPrompts: ConfigPromptDefinition<YandexTrackerMCPConfig>[] = [
  {
    name: 'token',
    type: 'password',
    message: 'OAuth токен Яндекс.Трекера:',
    mask: '*',
    validate: (value: string | number | Record<string, string> | undefined): string | true => {
      if (typeof value !== 'string' || value.length === 0) {
        return 'Токен обязателен';
      }
      return true;
    },
  },
  {
    name: 'orgId',
    type: 'input',
    message: 'ID организации:',
    default: (saved) => saved?.orgId,
    validate: (value: string | number | Record<string, string> | undefined): string | true => {
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
    type: 'list',
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
