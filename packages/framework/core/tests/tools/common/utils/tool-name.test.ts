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

  describe('с префиксом (с разделителем)', () => {
    it('должен добавлять префикс к имени', () => {
      expect(buildToolName('ping', 'my_app_')).toBe('my_app_ping');
    });

    it('должен работать с префиксом и именем в snake_case', () => {
      expect(buildToolName('get_issues', 'tracker_')).toBe('tracker_get_issues');
    });

    it('должен работать с пустым префиксом', () => {
      expect(buildToolName('ping', '')).toBe('ping');
    });
  });

  describe('автонормализация префикса (без разделителя)', () => {
    it('должен автоматически добавлять разделитель к префиксу', () => {
      expect(buildToolName('ping', 'app')).toBe('app_ping');
    });

    it('должен нормализовать короткий префикс (yw)', () => {
      expect(buildToolName('ping', 'yw')).toBe('yw_ping');
    });

    it('должен нормализовать префикс с именем в snake_case', () => {
      expect(buildToolName('get_page', 'yw')).toBe('yw_get_page');
    });

    it('должен нормализовать длинный префикс', () => {
      expect(buildToolName('ping', 'fr_yandex_tracker')).toBe('fr_yandex_tracker_ping');
    });
  });

  describe('edge cases', () => {
    it('должен работать с пустым именем', () => {
      expect(buildToolName('')).toBe('');
    });

    it('должен работать с пустым именем и префиксом с разделителем', () => {
      expect(buildToolName('', 'prefix_')).toBe('prefix_');
    });

    it('должен работать с пустым именем и префиксом без разделителя', () => {
      expect(buildToolName('', 'prefix')).toBe('prefix_');
    });
  });
});
