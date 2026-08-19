/**
 * Контур секретов dev-интерфейса: маскирование значений env во всём выводе.
 * @packageDocumentation
 */

export { createMasker, maskJsonValue, type Masker, type MaskerSources } from './masker.js';
export {
  getActiveMasker,
  installSecretGuard,
  type SecretGuardOptions,
  type UninstallSecretGuard,
} from './process-guard.js';
