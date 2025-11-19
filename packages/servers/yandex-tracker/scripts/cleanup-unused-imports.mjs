#!/usr/bin/env node
/**
 * Скрипт для очистки неиспользуемых импортов buildToolName
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOOLS_DIR = path.join(__dirname, '../src/tools');

async function findToolFiles(dir) {
  const files = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith('.tool.ts')) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);
  return files;
}

async function cleanupFile(filePath) {
  let content = await fs.readFile(filePath, 'utf8');
  let modified = false;

  // Удалить buildToolName из импортов @mcp-framework/core
  const coreImportRegex = /import\s+{\s*([^}]+)\s*}\s+from\s+['"]@mcp-framework\/core['"];/g;

  content = content.replace(coreImportRegex, (match, imports) => {
    const importList = imports.split(',').map(i => i.trim());

    // Проверить, используется ли buildToolName в коде
    if (importList.includes('buildToolName') && !content.includes('buildToolName(')) {
      // Удалить buildToolName
      const filtered = importList.filter(i => i !== 'buildToolName');
      modified = true;

      if (filtered.length === 0) {
        return ''; // Удалить всю строку
      }

      return `import { ${filtered.join(', ')} } from '@mcp-framework/core';`;
    }

    return match;
  });

  if (modified) {
    // Удалить пустые строки после удаления импорта
    content = content.replace(/\n\n\n+/g, '\n\n');

    await fs.writeFile(filePath, content, 'utf8');
    console.log(`✅ Cleaned ${path.basename(filePath)}`);
    return true;
  }

  return false;
}

async function main() {
  console.log('🧹 Cleaning up unused imports...\n');

  const toolFiles = await findToolFiles(TOOLS_DIR);
  let cleanedCount = 0;

  for (const file of toolFiles) {
    if (await cleanupFile(file)) {
      cleanedCount++;
    }
  }

  console.log(`\n✅ Cleaned ${cleanedCount} files`);
}

main().catch(console.error);
