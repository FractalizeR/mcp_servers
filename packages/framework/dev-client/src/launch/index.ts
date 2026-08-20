/**
 * Из чего собирается запуск dev-сессии: локальный бандл + проверка свежести + env.
 * @packageDocumentation
 */

export { resolveLocalBundle, type BundleOutcome } from './resolve-local-bundle.js';
export {
  resolveSecretsEnv,
  type SecretsEnvOutcome,
  type ResolveSecretsEnvOptions,
} from './resolve-secrets-env.js';
export { composeEnv } from './compose-env.js';
export {
  declareWriteRun,
  WRITE_DECLARATION_VAR,
  WRITE_DECLARATION_VALUE,
} from './write-declaration.js';
