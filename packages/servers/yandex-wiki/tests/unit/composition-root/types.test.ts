// tests/unit/composition-root/types.test.ts
import { describe, it, expect } from 'vitest';
import { TOOL_SYMBOLS, OPERATION_SYMBOLS, TYPES } from '../../../src/composition-root/types.js';

describe('DI Symbols', () => {
  describe('TOOL_SYMBOLS', () => {
    it('должен создать символы для всех tool классов', () => {
      expect(TOOL_SYMBOLS).toBeDefined();
      expect(typeof TOOL_SYMBOLS).toBe('object');

      // Проверяем что символы созданы
      for (const [className, symbol] of Object.entries(TOOL_SYMBOLS)) {
        expect(className).toBeTruthy();
        expect(typeof symbol).toBe('symbol');
      }
    });

    it('должен создать уникальные символы', () => {
      const symbols = Object.values(TOOL_SYMBOLS);
      const uniqueSymbols = new Set(symbols);

      expect(symbols.length).toBe(uniqueSymbols.size);
    });

    it('символы должны иметь правильный namespace префикс', () => {
      for (const [className, symbol] of Object.entries(TOOL_SYMBOLS)) {
        const symbolKey = Symbol.keyFor(symbol);
        expect(symbolKey).toBe(`tool:${className}`);
      }
    });

    it('должен содержать хотя бы один tool symbol', () => {
      expect(Object.keys(TOOL_SYMBOLS).length).toBeGreaterThan(0);
    });
  });

  describe('OPERATION_SYMBOLS', () => {
    it('должен создать символы для всех operation классов', () => {
      expect(OPERATION_SYMBOLS).toBeDefined();
      expect(typeof OPERATION_SYMBOLS).toBe('object');

      // Проверяем что символы созданы
      for (const [className, symbol] of Object.entries(OPERATION_SYMBOLS)) {
        expect(className).toBeTruthy();
        expect(typeof symbol).toBe('symbol');
      }
    });

    it('должен создать уникальные символы', () => {
      const symbols = Object.values(OPERATION_SYMBOLS);
      const uniqueSymbols = new Set(symbols);

      expect(symbols.length).toBe(uniqueSymbols.size);
    });

    it('символы должны иметь правильный namespace префикс', () => {
      for (const [className, symbol] of Object.entries(OPERATION_SYMBOLS)) {
        const symbolKey = Symbol.keyFor(symbol);
        expect(symbolKey).toBe(`operation:${className}`);
      }
    });

    it('должен содержать хотя бы один operation symbol', () => {
      expect(Object.keys(OPERATION_SYMBOLS).length).toBeGreaterThan(0);
    });
  });

  describe('TYPES', () => {
    it('должен содержать все необходимые DI токены', () => {
      expect(TYPES.ServerConfig).toBeDefined();
      expect(TYPES.Logger).toBeDefined();
      expect(TYPES.HttpClient).toBeDefined();
      expect(TYPES.RetryStrategy).toBeDefined();
      expect(TYPES.CacheManager).toBeDefined();
      expect(TYPES.YandexWikiFacade).toBeDefined();
      expect(TYPES.ToolRegistry).toBeDefined();
      expect(TYPES.ToolSearchEngine).toBeDefined();
    });

    it('токены инфраструктуры должны быть символами', () => {
      expect(typeof TYPES.ServerConfig).toBe('symbol');
      expect(typeof TYPES.Logger).toBe('symbol');
      expect(typeof TYPES.HttpClient).toBe('symbol');
      expect(typeof TYPES.CacheManager).toBe('symbol');
    });

    it('должен включать автоматически сгенерированные OPERATION_SYMBOLS', () => {
      for (const [className, symbol] of Object.entries(OPERATION_SYMBOLS)) {
        expect(TYPES).toHaveProperty(className);
        expect(TYPES[className as keyof typeof TYPES]).toBe(symbol);
      }
    });

    it('должен включать автоматически сгенерированные TOOL_SYMBOLS', () => {
      for (const [className, symbol] of Object.entries(TOOL_SYMBOLS)) {
        expect(TYPES).toHaveProperty(className);
        expect(TYPES[className as keyof typeof TYPES]).toBe(symbol);
      }
    });

    it('все значения TYPES должны быть уникальными символами', () => {
      const allSymbols = Object.values(TYPES);
      const uniqueSymbols = new Set(allSymbols);

      expect(allSymbols.length).toBe(uniqueSymbols.size);
      allSymbols.forEach((sym) => {
        expect(typeof sym).toBe('symbol');
      });
    });
  });
});
