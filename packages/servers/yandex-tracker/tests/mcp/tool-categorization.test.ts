import { describe, it, expect } from 'vitest';
import { CreateIssueTool } from '#tools/api/issues/create/index.js';
import { GetIssuesTool } from '#tools/api/issues/get/index.js';
import { FindIssuesTool } from '#tools/api/issues/find/index.js';
import { UpdateIssueTool } from '#tools/api/issues/update/index.js';
import { GetIssueChangelogTool } from '#tools/api/issues/changelog/index.js';
import { GetIssueTransitionsTool } from '#tools/api/issues/transitions/get/index.js';
import { TransitionIssueTool } from '#tools/api/issues/transitions/execute/index.js';
import { PingTool } from '#tools/ping.tool.js';
import { IssueUrlTool } from '#tools/helpers/issue-url/index.js';
import { DemoTool } from '#tools/helpers/demo/index.js';

describe('Tool Categorization', () => {
  describe('Issues category', () => {
    it('все Issues tools должны иметь category: issues', () => {
      expect(CreateIssueTool.METADATA.category).toBe('issues');
      expect(GetIssuesTool.METADATA.category).toBe('issues');
      expect(FindIssuesTool.METADATA.category).toBe('issues');
      expect(UpdateIssueTool.METADATA.category).toBe('issues');
      expect(GetIssueChangelogTool.METADATA.category).toBe('issues');
      expect(GetIssueTransitionsTool.METADATA.category).toBe('issues');
      expect(TransitionIssueTool.METADATA.category).toBe('issues');
    });
  });

  describe('System category', () => {
    it('PingTool должен иметь category: system', () => {
      expect(PingTool.METADATA.category).toBe('system');
    });

    it('PingTool должен иметь subcategory: health', () => {
      expect(PingTool.METADATA.subcategory).toBe('health');
    });
  });

  describe('Helpers category', () => {
    it('Helper tools должны иметь category: helpers', () => {
      expect(IssueUrlTool.METADATA.category).toBe('helpers');
      expect(DemoTool.METADATA.category).toBe('helpers');
    });

    it('IssueUrlTool должен иметь subcategory: url', () => {
      expect(IssueUrlTool.METADATA.subcategory).toBe('url');
    });

    it('DemoTool должен иметь subcategory: demo', () => {
      expect(DemoTool.METADATA.subcategory).toBe('demo');
    });
  });

  describe('Critical priority operations', () => {
    it('CRUD операции с задачами должны иметь priority: critical', () => {
      expect(CreateIssueTool.METADATA.priority).toBe('critical');
      expect(GetIssuesTool.METADATA.priority).toBe('critical');
      expect(FindIssuesTool.METADATA.priority).toBe('critical');
      expect(UpdateIssueTool.METADATA.priority).toBe('critical');
    });

    it('System health check tools должны иметь priority: critical', () => {
      expect(PingTool.METADATA.priority).toBe('critical');
    });
  });

  describe('High priority operations', () => {
    it('Workflow операции должны иметь priority: high', () => {
      expect(GetIssueTransitionsTool.METADATA.priority).toBe('high');
      expect(TransitionIssueTool.METADATA.priority).toBe('high');
    });

    it('Changelog должен иметь priority: high', () => {
      expect(GetIssueChangelogTool.METADATA.priority).toBe('high');
    });
  });

  describe('Normal priority operations', () => {
    // Note: PingTool теперь имеет priority: critical (консистентно для всех серверов)
    // System tools критичны для health checks, поэтому priority: critical

    it('Helper tools должны иметь priority: normal или low', () => {
      const issueUrlPriority = IssueUrlTool.METADATA.priority || 'normal';
      expect(['normal', 'low']).toContain(issueUrlPriority);
    });
  });

  describe('Low priority operations', () => {
    it('DemoTool должен иметь priority: low', () => {
      expect(DemoTool.METADATA.priority).toBe('low');
    });
  });

  describe('Subcategories', () => {
    describe('Read operations', () => {
      it('операции чтения должны иметь subcategory: read', () => {
        expect(GetIssuesTool.METADATA.subcategory).toBe('read');
        expect(FindIssuesTool.METADATA.subcategory).toBe('read');
        expect(GetIssueChangelogTool.METADATA.subcategory).toBe('read');
      });
    });

    describe('Write operations', () => {
      it('операции записи должны иметь subcategory: write', () => {
        expect(CreateIssueTool.METADATA.subcategory).toBe('write');
        expect(UpdateIssueTool.METADATA.subcategory).toBe('write');
      });
    });

    describe('Workflow operations', () => {
      it('workflow операции должны иметь subcategory: workflow', () => {
        expect(GetIssueTransitionsTool.METADATA.subcategory).toBe('workflow');
        expect(TransitionIssueTool.METADATA.subcategory).toBe('workflow');
      });
    });
  });

  describe('Tags', () => {
    it('все Issues tools должны иметь tags', () => {
      expect(CreateIssueTool.METADATA.tags).toBeDefined();
      expect(GetIssuesTool.METADATA.tags).toBeDefined();
      expect(FindIssuesTool.METADATA.tags).toBeDefined();
      expect(UpdateIssueTool.METADATA.tags).toBeDefined();
    });

    it('read операции должны иметь теги read/search/query', () => {
      // Get должен иметь 'read'
      expect(GetIssuesTool.METADATA.tags).toContain('read');

      // Find может иметь 'read', 'search' или 'query' (все операции чтения)
      const findTags = FindIssuesTool.METADATA.tags || [];
      expect(findTags.some((tag) => ['read', 'search', 'query'].includes(tag))).toBe(true);

      // Changelog должен иметь 'read'
      expect(GetIssueChangelogTool.METADATA.tags).toContain('read');
    });

    it('write операции должны иметь тег "write"', () => {
      expect(CreateIssueTool.METADATA.tags).toContain('write');
      expect(UpdateIssueTool.METADATA.tags).toContain('write');
    });

    it('workflow операции должны иметь тег "workflow"', () => {
      expect(GetIssueTransitionsTool.METADATA.tags).toContain('workflow');
      expect(TransitionIssueTool.METADATA.tags).toContain('workflow');
    });
  });

  describe('Description prefixes', () => {
    it('Issues tools должны иметь префикс [Issues/...]', () => {
      expect(CreateIssueTool.METADATA.description).toMatch(/^\[Issues\//);
      expect(GetIssuesTool.METADATA.description).toMatch(/^\[Issues\//);
      expect(FindIssuesTool.METADATA.description).toMatch(/^\[Issues\//);
      expect(UpdateIssueTool.METADATA.description).toMatch(/^\[Issues\//);
    });

    it('System tools должны иметь префикс [System/...]', () => {
      expect(PingTool.METADATA.description).toMatch(/^\[System\//);
    });

    it('Helper tools должны иметь префикс [Helpers/...]', () => {
      expect(IssueUrlTool.METADATA.description).toMatch(/^\[Helpers\//);
      expect(DemoTool.METADATA.description).toMatch(/^\[Helpers\//);
    });

    it('Read операции должны иметь префикс [.../Read]', () => {
      expect(GetIssuesTool.METADATA.description).toMatch(/\[Issues\/Read\]/);
      expect(FindIssuesTool.METADATA.description).toMatch(/\[Issues\/Read\]/);
    });

    it('Write операции должны иметь префикс [.../Write]', () => {
      expect(CreateIssueTool.METADATA.description).toMatch(/\[Issues\/Write\]/);
      expect(UpdateIssueTool.METADATA.description).toMatch(/\[Issues\/Write\]/);
    });

    it('Workflow операции должны иметь префикс [.../Workflow]', () => {
      expect(GetIssueTransitionsTool.METADATA.description).toMatch(/\[Issues\/Workflow\]/);
      expect(TransitionIssueTool.METADATA.description).toMatch(/\[Issues\/Workflow\]/);
    });
  });

  describe('Integration: category consistency', () => {
    it('category в METADATA должна соответствовать префиксу в description', () => {
      const tools = [
        CreateIssueTool,
        GetIssuesTool,
        FindIssuesTool,
        UpdateIssueTool,
        GetIssueChangelogTool,
        GetIssueTransitionsTool,
        TransitionIssueTool,
        PingTool,
        IssueUrlTool,
        DemoTool,
      ];

      for (const Tool of tools) {
        const { category, description } = Tool.METADATA;

        // Преобразуем category в заглавный регистр для сравнения
        const categoryCapitalized = category.charAt(0).toUpperCase() + category.slice(1);

        expect(
          description,
          `Description для ${Tool.METADATA.name} должно начинаться с категории [${categoryCapitalized}/...]`
        ).toMatch(new RegExp(`^\\[${categoryCapitalized}\\/`));
      }
    });

    it('subcategory в METADATA должна соответствовать префиксу в description', () => {
      const tools = [
        CreateIssueTool,
        GetIssuesTool,
        FindIssuesTool,
        UpdateIssueTool,
        GetIssueChangelogTool,
        GetIssueTransitionsTool,
        TransitionIssueTool,
        PingTool,
        IssueUrlTool,
        DemoTool,
      ];

      for (const Tool of tools) {
        const { subcategory, description } = Tool.METADATA;

        if (subcategory) {
          // Преобразуем subcategory для сравнения
          // Учитываем аббревиатуры (url → URL)
          let subcategoryFormatted = subcategory.charAt(0).toUpperCase() + subcategory.slice(1);

          // Специальная обработка аббревиатур
          if (subcategory.toLowerCase() === 'url') {
            subcategoryFormatted = 'URL';
          }

          expect(
            description,
            `Description для ${Tool.METADATA.name} должно содержать subcategory [.../${subcategoryFormatted}]`
          ).toMatch(new RegExp(`\\/${subcategoryFormatted}\\]`));
        }
      }
    });
  });
});
