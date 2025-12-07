/**
 * Mock factories for TickTick unit tests
 */

import { vi } from 'vitest';
import type { Logger } from '@mcp-framework/infrastructure/logging/logger.js';
import type { IHttpClient } from '@mcp-framework/infrastructure/http/client/i-http-client.interface.js';
import type { CacheManager } from '@mcp-framework/infrastructure';

/**
 * Create typed mock for Logger
 */
export function createMockLogger(): Logger {
  const childLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
    setAlertingTransport: vi.fn(),
    setLevel: vi.fn(),
  } as unknown as Logger;

  (childLogger.child as ReturnType<typeof vi.fn>).mockReturnValue(childLogger);

  return childLogger;
}

/**
 * Create mock for IHttpClient
 */
export function createMockHttpClient(): IHttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  } as unknown as IHttpClient;
}

/**
 * Create mock for CacheManager
 */
export function createMockCacheManager(): CacheManager {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    has: vi.fn().mockResolvedValue(false),
  } as unknown as CacheManager;
}

/**
 * Create partial mock for TickTickFacade
 * Use for unit testing tools
 */
export function createMockFacade() {
  return {
    // Projects
    getProjects: vi.fn(),
    getProject: vi.fn(),
    getProjectData: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    // Tasks
    getTask: vi.fn(),
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    completeTask: vi.fn(),
    batchCreateTasks: vi.fn(),
    // Convenience methods
    getAllTasks: vi.fn(),
    searchTasks: vi.fn(),
    getTasksByPriority: vi.fn(),
    getTasksDueInRange: vi.fn(),
    getOverdueTasks: vi.fn(),
    getTasksDueToday: vi.fn(),
    getTasksDueTomorrow: vi.fn(),
    getTasksDueInDays: vi.fn(),
    getTasksDueThisWeek: vi.fn(),
  };
}

/**
 * Helper for creating typed partial mock
 */
export function createPartialMock<T>(partial: Partial<T>): T {
  return partial as T;
}
