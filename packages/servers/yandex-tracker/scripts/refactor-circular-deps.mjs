#!/usr/bin/env node
/**
 * Скрипт для автоматизации рефакторинга циркулярных зависимостей
 *
 * Для каждого tool:
 * 1. Находит definition.ts и tool.ts файлы
 * 2. Извлекает METADATA из tool.ts
 * 3. Создает metadata.ts с METADATA
 * 4. Обновляет импорты в definition.ts и tool.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOOLS_DIR = path.join(__dirname, '../src/tools');

/**
 * Найти все definition файлы
 */
async function findDefinitionFiles(dir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith('.definition.ts') && entry.name !== 'ping.definition.ts') {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

/**
 * Извлечь METADATA из tool.ts
 */
function extractMetadata(toolContent) {
  const metadataRegex = /static\s+(?:override\s+)?readonly\s+METADATA\s*=\s*({[\s\S]*?})\s*as\s+const;/;
  const match = toolContent.match(metadataRegex);

  if (!match) {
    return null;
  }

  return match[1];
}

/**
 * Извлечь имя класса Tool из definition файла
 */
function extractToolClassName(definitionContent) {
  // Ищем импорт вида: import { XxxTool } from './xxx.tool.js';
  const importRegex = /import\s+{\s*(\w+Tool)\s*}\s+from\s+['"]\.\/[\w-]+\.tool\.js['"]/;
  const match = definitionContent.match(importRegex);

  if (!match) {
    return null;
  }

  return match[1];
}

/**
 * Создать metadata файл
 */
async function createMetadataFile(toolPath, toolContent, toolClassName) {
  const metadataContent = extractMetadata(toolContent);

  if (!metadataContent) {
    console.log(`⚠️  No METADATA found in ${path.basename(toolPath)}`);
    return null;
  }

  // Извлечь импорты из tool.ts, которые нужны для METADATA
  const imports = [];

  // buildToolName, ToolCategory, ToolPriority всегда нужны
  imports.push(`import { buildToolName, ToolCategory, ToolPriority } from '@mcp-framework/core';`);
  imports.push(`import type { StaticToolMetadata } from '@mcp-framework/core';`);

  // Проверить, нужен ли MCP_TOOL_PREFIX
  if (metadataContent.includes('MCP_TOOL_PREFIX')) {
    // Определить правильный путь к constants
    const toolDir = path.dirname(toolPath);
    const srcDir = path.join(__dirname, '../src');
    const relativePath = path.relative(toolDir, srcDir);
    const constantsPath = path.join(relativePath, 'constants.js').replace(/\\/g, '/');

    imports.push(`import { MCP_TOOL_PREFIX } from '${constantsPath}';`);
  }

  // Создать константу METADATA
  const metadataVarName = toolClassName.replace('Tool', '').replace(/([A-Z])/g, '_$1').toUpperCase().substring(1) + '_TOOL_METADATA';

  const metadataFileContent = `/**
 * Метаданные для ${toolClassName}
 *
 * Вынесены в отдельный файл для разрыва циркулярной зависимости:
 * - definition.ts импортирует metadata (не tool)
 * - tool.ts импортирует metadata (не definition для METADATA)
 *
 * Это разрывает цикл: definition → tool → definition
 */

${imports.join('\n')}

/**
 * Статические метаданные для ${toolClassName}
 */
export const ${metadataVarName}: StaticToolMetadata = ${metadataContent} as const;
`;

  const metadataPath = toolPath.replace('.tool.ts', '.metadata.ts');
  await fs.writeFile(metadataPath, metadataFileContent, 'utf8');

  console.log(`✅ Created ${path.basename(metadataPath)}`);
  return { metadataPath, metadataVarName };
}

/**
 * Обновить definition.ts
 */
async function updateDefinitionFile(definitionPath, toolClassName, metadataVarName) {
  let content = await fs.readFile(definitionPath, 'utf8');

  // Заменить импорт Tool на импорт METADATA
  const toolImportRegex = new RegExp(`import\\s+{\\s*${toolClassName}\\s*}\\s+from\\s+['"]\\.\\/[\\w-]+\\.tool\\.js['"];?`);
  const metadataImport = `import { ${metadataVarName} } from './${path.basename(definitionPath).replace('.definition.ts', '.metadata.js')}';`;

  content = content.replace(toolImportRegex, metadataImport);

  // Заменить использование Tool.METADATA на METADATA_VAR
  content = content.replace(
    new RegExp(`return\\s+${toolClassName}\\.METADATA;`, 'g'),
    `return ${metadataVarName};`
  );

  await fs.writeFile(definitionPath, content, 'utf8');
  console.log(`✅ Updated ${path.basename(definitionPath)}`);
}

/**
 * Обновить tool.ts
 */
async function updateToolFile(toolPath, metadataVarName) {
  let content = await fs.readFile(toolPath, 'utf8');

  // Добавить импорт METADATA (после других импортов)
  const lastImportIndex = content.lastIndexOf('import ');
  const nextLineIndex = content.indexOf('\n', lastImportIndex);

  const metadataImport = `import { ${metadataVarName} } from './${path.basename(toolPath).replace('.tool.ts', '.metadata.js')}';`;

  // Вставить импорт после последнего импорта
  content = content.slice(0, nextLineIndex + 1) + metadataImport + '\n' + content.slice(nextLineIndex + 1);

  // Заменить статический METADATA на импортированный
  const metadataRegex = /static\s+(?:override\s+)?readonly\s+METADATA\s*=\s*{[\s\S]*?}\s*as\s+const;/;
  content = content.replace(metadataRegex, `static override readonly METADATA = ${metadataVarName};`);

  // Удалить неиспользуемые импорты (ToolCategory, ToolPriority, buildToolName, MCP_TOOL_PREFIX)
  // Удаляем только если они импортируются из @mcp-framework/core и больше нигде не используются
  const linesToRemove = [];

  // Проверить, используется ли buildToolName вне METADATA
  if (!content.includes('buildToolName(') || content.match(/buildToolName\(/g).length === 1) {
    linesToRemove.push('buildToolName');
  }

  // Проверить, используется ли ToolCategory вне METADATA
  if (!content.includes('ToolCategory.') || content.split('ToolCategory.').length <= 2) {
    linesToRemove.push('ToolCategory');
  }

  // Проверить, используется ли ToolPriority вне METADATA
  if (!content.includes('ToolPriority.') || content.split('ToolPriority.').length <= 2) {
    linesToRemove.push('ToolPriority');
  }

  // Удалить неиспользуемые импорты из строки импорта
  if (linesToRemove.length > 0) {
    const coreImportRegex = /import\s+{\s*([^}]+)\s*}\s+from\s+['"]@mcp-framework\/core['"];/;
    content = content.replace(coreImportRegex, (match, imports) => {
      let importList = imports.split(',').map(i => i.trim()).filter(i => !linesToRemove.includes(i));

      if (importList.length === 0) {
        return ''; // Удалить всю строку импорта
      }

      return `import { ${importList.join(', ')} } from '@mcp-framework/core';`;
    });
  }

  // Удалить импорт MCP_TOOL_PREFIX если он был
  content = content.replace(/import\s+{\s*MCP_TOOL_PREFIX\s*}\s+from\s+['"][^'"]+constants\.js['"];\n?/g, '');

  await fs.writeFile(toolPath, content, 'utf8');
  console.log(`✅ Updated ${path.basename(toolPath)}`);
}

/**
 * Обработать один tool
 */
async function refactorTool(definitionPath) {
  try {
    const toolPath = definitionPath.replace('.definition.ts', '.tool.ts');

    // Проверить, существует ли tool файл
    try {
      await fs.access(toolPath);
    } catch {
      console.log(`⚠️  No tool file for ${path.basename(definitionPath)}`);
      return false;
    }

    // Проверить, не создан ли уже metadata файл
    const metadataPath = definitionPath.replace('.definition.ts', '.metadata.ts');
    try {
      await fs.access(metadataPath);
      console.log(`⏭️  Skipping ${path.basename(definitionPath)} (metadata already exists)`);
      return false;
    } catch {
      // Metadata не существует, продолжаем
    }

    const definitionContent = await fs.readFile(definitionPath, 'utf8');
    const toolContent = await fs.readFile(toolPath, 'utf8');

    const toolClassName = extractToolClassName(definitionContent);
    if (!toolClassName) {
      console.log(`⚠️  Cannot extract tool class name from ${path.basename(definitionPath)}`);
      return false;
    }

    console.log(`\n🔧 Refactoring ${toolClassName}...`);

    // 1. Создать metadata файл
    const result = await createMetadataFile(toolPath, toolContent, toolClassName);
    if (!result) {
      return false;
    }

    const { metadataVarName } = result;

    // 2. Обновить definition.ts
    await updateDefinitionFile(definitionPath, toolClassName, metadataVarName);

    // 3. Обновить tool.ts
    await updateToolFile(toolPath, metadataVarName);

    console.log(`✅ ${toolClassName} refactored successfully`);
    return true;

  } catch (error) {
    console.error(`❌ Error refactoring ${path.basename(definitionPath)}:`, error.message);
    return false;
  }
}

/**
 * Главная функция
 */
async function main() {
  console.log('🚀 Starting circular dependencies refactoring...\n');

  const definitionFiles = await findDefinitionFiles(TOOLS_DIR);

  console.log(`Found ${definitionFiles.length} definition files\n`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const file of definitionFiles) {
    const result = await refactorTool(file);
    if (result === true) {
      successCount++;
    } else if (result === false) {
      const metadataPath = file.replace('.definition.ts', '.metadata.ts');
      try {
        await fs.access(metadataPath);
        skipCount++;
      } catch {
        failCount++;
      }
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Refactored: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`\n🎉 Done!`);
}

main().catch(console.error);
