#!/usr/bin/env node
import fs from 'fs';
import { glob } from 'glob';

// Find all .tool.ts files
const files = await glob('./packages/servers/yandex-tracker/src/tools/**/*.tool.ts');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Remove buildDefinition method (including /** @deprecated */ comment)
  // Pattern matches:
  // - Optional @deprecated JSDoc comment
  // - protected buildDefinition() method
  // - Method body with braces
  content = content.replace(
    /  \/\*\*[\s\S]*?@deprecated[\s\S]*?\*\/\s*protected buildDefinition\(\): ToolDefinition \{[\s\S]*?\n  \}\n\n?/g,
    ''
  );

  // Also remove non-deprecated buildDefinition (fallback)
  content = content.replace(
    /  protected buildDefinition\(\): ToolDefinition \{[\s\S]*?\n  \}\n\n?/g,
    ''
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Processed: ${file}`);
}

console.log(`\nProcessed ${files.length} files`);
