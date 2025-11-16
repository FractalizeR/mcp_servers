// tests/unit/helpers/mock-factories.test.ts
import { describe, it, expect } from 'vitest';
import {
  createMockLogger,
  createMockHttpClient,
  createMockFacade,
} from '../../helpers/mock-factories.js';

describe('Mock Factories', () => {
  describe('createMockLogger', () => {
    it('должен создать logger со всеми методами', () => {
      const logger = createMockLogger();

      expect(logger.debug).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.child).toBeDefined();
    });

    it('child() должен возвращать logger', () => {
      const logger = createMockLogger();
      const child = logger.child({});

      expect(child.debug).toBeDefined();
    });
  });

  describe('createMockHttpClient', () => {
    it('должен создать httpClient со всеми методами', () => {
      const client = createMockHttpClient();

      expect(client.get).toBeDefined();
      expect(client.post).toBeDefined();
      expect(client.patch).toBeDefined();
      expect(client.delete).toBeDefined();
    });
  });

  describe('createMockFacade', () => {
    it('должен создать facade с основными методами', () => {
      const facade = createMockFacade();

      expect(facade.getIssues).toBeDefined();
      expect(facade.findIssues).toBeDefined();
      expect(facade.createIssue).toBeDefined();
    });
  });
});
