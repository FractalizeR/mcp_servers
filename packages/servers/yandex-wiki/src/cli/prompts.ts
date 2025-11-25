import type { ConfigPromptDefinition } from '@mcp-framework/cli';
import type { YandexWikiMCPConfig } from './types.js';
import { DEFAULT_LOG_LEVEL } from '../constants.js';

export const ywConfigPrompts: ConfigPromptDefinition<YandexWikiMCPConfig>[] = [
  {
    name: 'token',
    type: 'password',
    message: 'OAuth токен Yandex Wiki:',
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
