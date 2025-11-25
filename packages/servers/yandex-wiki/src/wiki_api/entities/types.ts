/**
 * Helper тип для поддержки неизвестных полей API
 */
export type WithUnknownFields<T> = T & { readonly [key: string]: unknown };
