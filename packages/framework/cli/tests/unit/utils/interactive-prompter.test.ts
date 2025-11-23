/**
 * Tests for InteractivePrompter
 */

import { describe, it, expect } from 'vitest';
import { InteractivePrompter } from '../../../src/utils/interactive-prompter.js';
import type { ConfigPromptDefinition, BaseMCPServerConfig } from '../../../src/types.js';

/**
 * Test configuration interface
 */
interface TestConfig extends BaseMCPServerConfig {
  apiKey: string;
  endpoint: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

describe('InteractivePrompter', () => {
  describe('Constructor', () => {
    it('should create prompter with empty config definitions', () => {
      const prompts: ConfigPromptDefinition<TestConfig>[] = [];
      const prompter = new InteractivePrompter(prompts);
      expect(prompter).toBeDefined();
      expect(prompter).toBeInstanceOf(InteractivePrompter);
    });

    it('should create prompter with config definitions', () => {
      const prompts: ConfigPromptDefinition<TestConfig>[] = [
        {
          name: 'apiKey',
          type: 'password',
          message: 'API Key:',
        },
        {
          name: 'endpoint',
          type: 'input',
          message: 'Endpoint URL:',
        },
      ];

      const prompter = new InteractivePrompter(prompts);
      expect(prompter).toBeDefined();
      expect(prompter).toBeInstanceOf(InteractivePrompter);
    });

    it('should create prompter with complex prompt definitions', () => {
      const prompts: ConfigPromptDefinition<TestConfig>[] = [
        {
          name: 'apiKey',
          type: 'password',
          message: 'API Key:',
          mask: '*',
          validate: (value) => (value.length > 0 ? true : 'API key is required'),
        },
        {
          name: 'endpoint',
          type: 'input',
          message: 'Endpoint URL:',
          default: 'https://api.example.com',
        },
        {
          name: 'logLevel',
          type: 'list',
          message: 'Log Level:',
          choices: [
            { name: 'Debug', value: 'debug' },
            { name: 'Info', value: 'info' },
            { name: 'Warning', value: 'warn' },
            { name: 'Error', value: 'error' },
          ],
          default: 'info',
        },
      ];

      const prompter = new InteractivePrompter(prompts);
      expect(prompter).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should enforce type safety for prompt names', () => {
      // This test verifies TypeScript compilation
      const prompts: ConfigPromptDefinition<TestConfig>[] = [
        {
          name: 'apiKey', // ✅ Valid - apiKey exists in TestConfig
          type: 'password',
          message: 'API Key:',
        },
        {
          name: 'endpoint', // ✅ Valid - endpoint exists in TestConfig
          type: 'input',
          message: 'Endpoint:',
        },
        // ❌ This would cause TypeScript error (commented out):
        // {
        //   name: 'nonexistent', // Error: 'nonexistent' is not in TestConfig
        //   type: 'input',
        //   message: 'Test:',
        // },
      ];

      const prompter = new InteractivePrompter(prompts);
      expect(prompter).toBeDefined();
    });

    it('should enforce type safety for default values', () => {
      const prompts: ConfigPromptDefinition<TestConfig>[] = [
        {
          name: 'logLevel',
          type: 'list',
          message: 'Log Level:',
          default: 'info', // ✅ Valid - matches TestConfig['logLevel']
          choices: [
            { name: 'Debug', value: 'debug' },
            { name: 'Info', value: 'info' },
          ],
        },
      ];

      const prompter = new InteractivePrompter(prompts);
      expect(prompter).toBeDefined();
    });
  });

  describe('Static Methods', () => {
    describe('promptClientSelection', () => {
      it('should have promptClientSelection method', () => {
        expect(InteractivePrompter.promptClientSelection).toBeDefined();
        expect(typeof InteractivePrompter.promptClientSelection).toBe('function');
      });

      // Note: Full testing requires mocking inquirer, which is complex
      // This test verifies the method exists and has correct signature
    });

    describe('promptConfirmation', () => {
      it('should have promptConfirmation method', () => {
        expect(InteractivePrompter.promptConfirmation).toBeDefined();
        expect(typeof InteractivePrompter.promptConfirmation).toBe('function');
      });
    });

    describe('promptSelection', () => {
      it('should have promptSelection method', () => {
        expect(InteractivePrompter.promptSelection).toBeDefined();
        expect(typeof InteractivePrompter.promptSelection).toBe('function');
      });
    });
  });

  describe('Integration with inquirer types', () => {
    it('should support all prompt types', () => {
      const prompts: ConfigPromptDefinition<TestConfig>[] = [
        { name: 'apiKey', type: 'input', message: 'Input:' },
        { name: 'apiKey', type: 'password', message: 'Password:' },
        { name: 'apiKey', type: 'confirm', message: 'Confirm:' },
        { name: 'apiKey', type: 'list', message: 'List:', choices: [] },
        { name: 'apiKey', type: 'number', message: 'Number:' },
      ];

      prompts.forEach((prompt) => {
        const prompter = new InteractivePrompter([prompt]);
        expect(prompter).toBeDefined();
      });
    });

    it('should support validation functions', () => {
      const validateApiKey = (value: string): string | true => {
        if (!value || value.length === 0) {
          return 'API key is required';
        }
        if (value.length < 10) {
          return 'API key must be at least 10 characters';
        }
        return true;
      };

      const prompts: ConfigPromptDefinition<TestConfig>[] = [
        {
          name: 'apiKey',
          type: 'password',
          message: 'API Key:',
          validate: validateApiKey,
        },
      ];

      const prompter = new InteractivePrompter(prompts);
      expect(prompter).toBeDefined();
    });

    it('should support conditional prompts with when', () => {
      const prompts: ConfigPromptDefinition<TestConfig>[] = [
        {
          name: 'logLevel',
          type: 'list',
          message: 'Log level:',
          choices: [
            { name: 'Debug', value: 'debug' },
            { name: 'Info', value: 'info' },
          ],
        },
        {
          name: 'endpoint',
          type: 'input',
          message: 'Debug endpoint:',
          when: (answers) => answers.logLevel === 'debug',
        },
      ];

      const prompter = new InteractivePrompter(prompts);
      expect(prompter).toBeDefined();
    });

    it('should support default value functions', () => {
      const prompts: ConfigPromptDefinition<TestConfig>[] = [
        {
          name: 'endpoint',
          type: 'input',
          message: 'Endpoint:',
          default: (savedConfig) => savedConfig?.endpoint ?? 'https://api.example.com',
        },
        {
          name: 'logLevel',
          type: 'list',
          message: 'Log Level:',
          default: (savedConfig) => savedConfig?.logLevel ?? 'info',
          choices: [
            { name: 'Debug', value: 'debug' },
            { name: 'Info', value: 'info' },
          ],
        },
      ];

      const prompter = new InteractivePrompter(prompts);
      expect(prompter).toBeDefined();
    });
  });

  describe('Generic Type Parameter', () => {
    it('should work with different config types', () => {
      interface CustomConfig extends BaseMCPServerConfig {
        username: string;
        password: string;
        region: 'us' | 'eu' | 'asia';
      }

      const prompts: ConfigPromptDefinition<CustomConfig>[] = [
        { name: 'username', type: 'input', message: 'Username:' },
        { name: 'password', type: 'password', message: 'Password:' },
        {
          name: 'region',
          type: 'list',
          message: 'Region:',
          choices: [
            { name: 'US', value: 'us' },
            { name: 'EU', value: 'eu' },
            { name: 'Asia', value: 'asia' },
          ],
        },
      ];

      const prompter = new InteractivePrompter(prompts);
      expect(prompter).toBeDefined();
    });

    it('should work with minimal config', () => {
      interface MinimalConfig extends BaseMCPServerConfig {
        token: string;
      }

      const prompts: ConfigPromptDefinition<MinimalConfig>[] = [
        { name: 'token', type: 'password', message: 'Token:' },
      ];

      const prompter = new InteractivePrompter(prompts);
      expect(prompter).toBeDefined();
    });
  });
});

/**
 * Note: Full integration testing with inquirer requires mocking or E2E tests
 * These unit tests verify:
 * - Type safety and TypeScript compilation
 * - Constructor behavior
 * - Method existence and signatures
 * - Support for all prompt features (validation, when, default, choices)
 *
 * For interactive testing with real prompts, use manual testing or E2E tests
 */
