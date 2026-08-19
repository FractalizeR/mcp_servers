/**
 * Команда `list`: показать инструменты сервера и их класс.
 */

import { classify, type ToolSummary } from '../write-policy/index.js';
import type { CliIo } from './io.js';
import { openSessionContext, type RunCliDeps } from './session-context.js';
import type { ListCliCommand } from './types.js';

function toListEntry(tool: ToolSummary): Record<string, unknown> {
  return {
    name: tool.name,
    class: classify(tool),
    title: tool.title,
    readOnly: tool.readOnly,
    destructive: tool.destructive,
    hasPathArgs: tool.hasPathArgs,
  };
}

function printText(io: CliIo, tools: readonly ToolSummary[]): void {
  for (const tool of tools) {
    io.stdout(`${tool.name} | ${classify(tool)} | ${tool.title ?? ''}\n`);
  }
}

function printJson(io: CliIo, tools: readonly ToolSummary[]): void {
  io.stdout(`${JSON.stringify(tools.map(toListEntry), null, 2)}\n`);
}

export async function runListCommand(
  cmd: ListCliCommand,
  io: CliIo,
  deps: RunCliDeps
): Promise<number> {
  const opened = await openSessionContext(cmd.global, deps);
  if (opened.outcome === 'failed') {
    io.stderr(`${opened.message}\n`);
    return opened.exitCode;
  }

  const { context, cleanup } = opened;
  try {
    const tools = cmd.writableOnly
      ? context.tools.filter((tool) => classify(tool) !== 'read')
      : context.tools;
    if (cmd.json) {
      printJson(io, tools);
    } else {
      printText(io, tools);
    }
    return 0;
  } finally {
    await cleanup();
  }
}
