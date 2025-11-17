import { describe, expect, it } from 'vitest';
import { buildToolName } from '../../../../src/tools/common/utils/tool-name.js';

describe('buildToolName', () => {
  describe('без префикса', () => {
    it('должен вернуть имя без изменений', () => {
      expect(buildToolName('ping')).toBe('ping');
    });

    it('должен работать с именами в snake_case', () => {
      expect(buildToolName('get_issues')).toBe('get_issues');
    });

    it('должен работать с именами в kebab-case', () => {
      expect(buildToolName('search-tools')).toBe('search-tools');
    });
  });

  describe('с префиксом', () => {
    it('должен добавлять префикс к имени', () => {
      expect(buildToolName('ping', 'my_app_')).toBe('my_app_ping');
    });

    it('должен работать с префиксом и именем в snake_case', () => {
      expect(buildToolName('get_issues', 'tracker_')).toBe('tracker_get_issues');
    });

    it('должен работать с пустым префиксом', () => {
      expect(buildToolName('ping', '')).toBe('ping');
    });

    it('должен работать с префиксом без разделителя', () => {
      expect(buildToolName('ping', 'app')).toBe('appping');
    });
  });

  describe('edge cases', () => {
    it('должен работать с пустым именем', () => {
      expect(buildToolName('')).toBe('');
    });

    it('должен работать с пустым именем и префиксом', () => {
      expect(buildToolName('', 'prefix_')).toBe('prefix_');
    });
  });
});
