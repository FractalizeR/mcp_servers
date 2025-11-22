import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '#config';

describe('Retry Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.YANDEX_TRACKER_TOKEN = 'test-token';
    process.env.YANDEX_ORG_ID = 'test-org';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use default retry values when not specified', () => {
    const config = loadConfig();
    expect(config.retryAttempts).toBe(3);
    expect(config.retryMinDelay).toBe(1000);
    expect(config.retryMaxDelay).toBe(10000);
  });

  it('should load custom retry values', () => {
    process.env.YANDEX_TRACKER_RETRY_ATTEMPTS = '5';
    process.env.YANDEX_TRACKER_RETRY_MIN_DELAY = '2000';
    process.env.YANDEX_TRACKER_RETRY_MAX_DELAY = '20000';

    const config = loadConfig();
    expect(config.retryAttempts).toBe(5);
    expect(config.retryMinDelay).toBe(2000);
    expect(config.retryMaxDelay).toBe(20000);
  });

  it('should use defaults for invalid retry attempts', () => {
    process.env.YANDEX_TRACKER_RETRY_ATTEMPTS = '-1';
    const config = loadConfig();
    expect(config.retryAttempts).toBe(3);
  });

  it('should cap retry attempts at 10', () => {
    process.env.YANDEX_TRACKER_RETRY_ATTEMPTS = '100';
    const config = loadConfig();
    expect(config.retryAttempts).toBe(3);
  });

  it('should use defaults for invalid min delay', () => {
    process.env.YANDEX_TRACKER_RETRY_MIN_DELAY = '50'; // Below minimum
    const config = loadConfig();
    expect(config.retryMinDelay).toBe(1000);
  });

  it('should use defaults for min delay above maximum', () => {
    process.env.YANDEX_TRACKER_RETRY_MIN_DELAY = '10000'; // Above maximum
    const config = loadConfig();
    expect(config.retryMinDelay).toBe(1000);
  });

  it('should use defaults for invalid max delay', () => {
    process.env.YANDEX_TRACKER_RETRY_MAX_DELAY = '500'; // Below minimum
    const config = loadConfig();
    expect(config.retryMaxDelay).toBe(10000);
  });

  it('should use defaults for max delay above maximum', () => {
    process.env.YANDEX_TRACKER_RETRY_MAX_DELAY = '100000'; // Above maximum
    const config = loadConfig();
    expect(config.retryMaxDelay).toBe(10000);
  });

  it('should handle zero retry attempts', () => {
    process.env.YANDEX_TRACKER_RETRY_ATTEMPTS = '0';
    const config = loadConfig();
    expect(config.retryAttempts).toBe(0);
  });

  it('should handle non-numeric retry attempts', () => {
    process.env.YANDEX_TRACKER_RETRY_ATTEMPTS = 'invalid';
    const config = loadConfig();
    expect(config.retryAttempts).toBe(3);
  });

  it('should handle non-numeric delay values', () => {
    process.env.YANDEX_TRACKER_RETRY_MIN_DELAY = 'invalid';
    process.env.YANDEX_TRACKER_RETRY_MAX_DELAY = 'invalid';
    const config = loadConfig();
    expect(config.retryMinDelay).toBe(1000);
    expect(config.retryMaxDelay).toBe(10000);
  });

  it('should handle boundary values for retry attempts', () => {
    process.env.YANDEX_TRACKER_RETRY_ATTEMPTS = '10'; // Maximum
    const config = loadConfig();
    expect(config.retryAttempts).toBe(10);
  });

  it('should handle boundary values for min delay', () => {
    process.env.YANDEX_TRACKER_RETRY_MIN_DELAY = '100'; // Minimum
    const config = loadConfig();
    expect(config.retryMinDelay).toBe(100);

    process.env.YANDEX_TRACKER_RETRY_MIN_DELAY = '5000'; // Maximum
    const config2 = loadConfig();
    expect(config2.retryMinDelay).toBe(5000);
  });

  it('should handle boundary values for max delay', () => {
    process.env.YANDEX_TRACKER_RETRY_MAX_DELAY = '1000'; // Minimum
    const config = loadConfig();
    expect(config.retryMaxDelay).toBe(1000);

    process.env.YANDEX_TRACKER_RETRY_MAX_DELAY = '60000'; // Maximum
    const config2 = loadConfig();
    expect(config2.retryMaxDelay).toBe(60000);
  });
});
