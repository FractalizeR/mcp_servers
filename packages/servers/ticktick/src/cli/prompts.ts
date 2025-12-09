import type { ConfigPromptDefinition } from '@fractalizer/mcp-cli';
import type { TickTickMCPConfig } from './types.js';
import { DEFAULT_LOG_LEVEL } from '../constants.js';

export const ticktickConfigPrompts: ConfigPromptDefinition<TickTickMCPConfig>[] = [
  {
    name: 'clientId',
    type: 'input',
    message: 'OAuth Client ID (из TickTick Developer Portal):',
    validate: (value: string | number | Record<string, string> | undefined): string | true => {
      if (typeof value !== 'string' || value.length === 0) {
        return 'Client ID обязателен';
      }
      return true;
    },
  },
  {
    name: 'clientSecret',
    type: 'password',
    message: 'OAuth Client Secret:',
    mask: '*',
    validate: (value: string | number | Record<string, string> | undefined): string | true => {
      if (typeof value !== 'string' || value.length === 0) {
        return 'Client Secret обязателен';
      }
      return true;
    },
  },
  {
    name: 'redirectUri',
    type: 'input',
    message: 'OAuth Redirect URI (необязательно, Enter для значения по умолчанию):',
    default: (saved) => saved?.redirectUri ?? 'http://localhost:8080/callback',
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
