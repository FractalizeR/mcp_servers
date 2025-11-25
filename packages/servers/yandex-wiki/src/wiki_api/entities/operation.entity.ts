/**
 * Тип асинхронной операции
 */
export type OperationType = 'clone' | 'clone_grid' | 'test' | 'export' | 'move';

/**
 * Асинхронная операция (clone, etc.)
 */
export interface AsyncOperation {
  readonly operation: {
    readonly type: OperationType;
    readonly id: string;
  };
  readonly dry_run: boolean;
  readonly status_url: string;
}
