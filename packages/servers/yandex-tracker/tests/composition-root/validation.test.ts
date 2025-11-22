/**
 * Unit тесты для валидации DI регистраций
 *
 * Проверяет защиту от коллизий имён классов в DI системе.
 */

import { describe, it, expect } from 'vitest';
import { validateUniqueClassNames, validateDIRegistrations } from '#composition-root/validation.js';

describe('DI Validation', () => {
  describe('validateUniqueClassNames', () => {
    it('should pass for unique class names', () => {
      class Tool1 {}
      class Tool2 {}
      class Tool3 {}

      expect(() => {
        validateUniqueClassNames([Tool1, Tool2, Tool3], 'Tool');
      }).not.toThrow();
    });

    it('should throw for duplicate class names', () => {
      // Эмулируем дубликаты через Object.defineProperty
      const Tool1 = class {};
      const Tool2 = class {};
      Object.defineProperty(Tool1, 'name', { value: 'DuplicateTool' });
      Object.defineProperty(Tool2, 'name', { value: 'DuplicateTool' });

      expect(() => {
        validateUniqueClassNames([Tool1, Tool2], 'Tool');
      }).toThrow('Duplicate Tool class names detected: DuplicateTool');
    });

    it('should detect multiple duplicates', () => {
      const Tool1 = class {};
      const Tool2 = class {};
      const Tool3 = class {};
      const Tool4 = class {};

      Object.defineProperty(Tool1, 'name', { value: 'SameName1' });
      Object.defineProperty(Tool2, 'name', { value: 'SameName1' });
      Object.defineProperty(Tool3, 'name', { value: 'SameName2' });
      Object.defineProperty(Tool4, 'name', { value: 'SameName2' });

      expect(() => {
        validateUniqueClassNames([Tool1, Tool2, Tool3, Tool4], 'Operation');
      }).toThrow('Duplicate Operation class names detected: SameName1, SameName2');
    });

    it('should include type in error message', () => {
      const Op1 = class {};
      const Op2 = class {};
      Object.defineProperty(Op1, 'name', { value: 'Duplicate' });
      Object.defineProperty(Op2, 'name', { value: 'Duplicate' });

      expect(() => {
        validateUniqueClassNames([Op1, Op2], 'Operation');
      }).toThrow('Duplicate Operation class names detected');

      expect(() => {
        validateUniqueClassNames([Op1, Op2], 'Tool');
      }).toThrow('Duplicate Tool class names detected');
    });
  });

  describe('validateDIRegistrations', () => {
    it('should validate all DI registrations on container creation', () => {
      // Этот тест проверяет, что реальные определения из definitions/ валидны
      expect(() => {
        validateDIRegistrations();
      }).not.toThrow();
    });
  });

  describe('Integration: Real definitions', () => {
    it('should have no duplicate tool names in TOOL_CLASSES', async () => {
      const { TOOL_CLASSES } = await import('#composition-root/definitions/tool-definitions.js');

      expect(() => {
        validateUniqueClassNames(TOOL_CLASSES, 'Tool');
      }).not.toThrow();
    });

    it('should have no duplicate operation names in OPERATION_CLASSES', async () => {
      const { OPERATION_CLASSES } = await import(
        '#composition-root/definitions/operation-definitions.js'
      );

      expect(() => {
        validateUniqueClassNames(OPERATION_CLASSES, 'Operation');
      }).not.toThrow();
    });
  });
});
