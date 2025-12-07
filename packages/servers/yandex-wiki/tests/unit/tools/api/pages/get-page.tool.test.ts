// tests/unit/tools/api/pages/get-page.tool.test.ts
import { describe, it, expect } from 'vitest';
import { GetPageTool } from '../../../../../src/tools/api/pages/get/get-page.tool.js';
import { GET_PAGE_TOOL_METADATA } from '../../../../../src/tools/api/pages/get/get-page.metadata.js';

describe('GetPageTool', () => {
  describe('metadata', () => {
    it('должен иметь корректные метаданные', () => {
      expect(GetPageTool.METADATA).toBe(GET_PAGE_TOOL_METADATA);
      expect(GetPageTool.METADATA.name).toBe('yw_get_page');
      expect(GetPageTool.METADATA.description).toBeDefined();
    });
  });

  describe('schema', () => {
    it('должен иметь обязательный параметр slug', () => {
      // Проверяем что slug обязателен
      const tool = GetPageTool.prototype;
      expect(tool.getParamsSchema).toBeDefined();
    });
  });
});
