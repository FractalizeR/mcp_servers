/**
 * Генератор предупреждений для опасных операций
 *
 * Responsibilities:
 * - Создание стандартизированных предупреждений для ИИ агентов
 * - Добавление предупреждений в description инструментов
 * - Централизованное управление текстом предупреждений
 *
 * Usage:
 * - BaseToolDefinition.wrapWithSafetyWarning() использует этот класс
 * - Автоматически добавляет предупреждение если requiresExplicitUserConsent: true
 */

/**
 * Генератор предупреждений безопасности для tool descriptions
 */
export class SafetyWarningBuilder {
  /**
   * Создать стандартное предупреждение для description
   *
   * Предупреждает ИИ агента о необходимости явного запроса пользователя
   * перед выполнением опасных операций
   *
   * @param systemName - Название системы (опционально, по умолчанию 'системе')
   * @returns Форматированное предупреждение
   *
   * @example
   * SafetyWarningBuilder.buildWarning('Яндекс.Трекере')
   * SafetyWarningBuilder.buildWarning('GitHub')
   * SafetyWarningBuilder.buildWarning() // 'системе'
   */
  static buildWarning(systemName: string = 'системе'): string {
    return (
      '\n\n' +
      '⚠️ КРИТИЧЕСКИ ВАЖНО:\n' +
      `Этот инструмент ИЗМЕНЯЕТ данные пользователя в ${systemName}.\n` +
      'Используй его ТОЛЬКО если:\n' +
      '1. Пользователь ЯВНО попросил выполнить эту операцию\n' +
      '2. Ты полностью уверен в корректности параметров\n' +
      '3. У тебя есть ВСЕ необходимые данные (не используй placeholder/dummy значения)\n' +
      '\n' +
      'НИКОГДА не используй этот инструмент:\n' +
      '- "На всякий случай" или "чтобы проверить"\n' +
      '- Если пользователь попросил только ПРОСМОТРЕТЬ данные\n' +
      '- Если не уверен в правильности параметров - СПРОСИ пользователя'
    );
  }

  /**
   * Добавить предупреждение к существующему описанию
   *
   * @param originalDescription - Оригинальное описание инструмента
   * @param requiresConsent - Требует ли инструмент явного согласия пользователя
   * @param systemName - Название системы (опционально, по умолчанию 'системе')
   * @returns Описание с предупреждением (если requiresConsent === true)
   */
  static addWarningToDescription(
    originalDescription: string,
    requiresConsent: boolean = false,
    systemName: string = 'системе'
  ): string {
    if (!requiresConsent) {
      return originalDescription;
    }
    return originalDescription + this.buildWarning(systemName);
  }
}
