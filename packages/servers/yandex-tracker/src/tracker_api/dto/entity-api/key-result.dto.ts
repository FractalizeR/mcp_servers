/**
 * DTO для операций с Key Results цели (Goal.keyResultItems)
 *
 * Форма подтверждена референсным клиентом
 * (`Goal._build_key_result_item`/`_normalize_key_result`, добавлено 2026-08-10).
 */

export interface KeyResultItemInputDto {
  /** Тип key result'а: завершение (binary) или измеряемая метрика (value) */
  type: 'binary' | 'value';

  /** Текст key result'а */
  text: string;

  /** Исполнитель (login/uid) */
  assignee?: string | undefined;

  /** Дедлайн в формате YYYY-MM-DD */
  deadline?: string | undefined;

  /** Прогресс (для type='value') */
  progress?:
    | {
        start: number;
        end: number;
        current?: number | undefined;
      }
    | undefined;

  /** Признак завершения (для type='binary') */
  achieved?: boolean | undefined;
}

export interface GetGoalKeyResultsDto {
  /** Идентификатор цели (Goal) */
  goalId: string;
}

export interface AddGoalKeyResultDto {
  /** Идентификатор цели (Goal) */
  goalId: string;

  /** Добавляемый key result (существующие id не меняются) */
  item: KeyResultItemInputDto;
}

export interface SetGoalKeyResultsDto {
  /** Идентификатор цели (Goal) */
  goalId: string;

  /** Полный список key results — заменяет прежний целиком (id перегенерируются API) */
  items: KeyResultItemInputDto[];
}

export interface ClearGoalKeyResultsDto {
  /** Идентификатор цели (Goal) */
  goalId: string;
}
