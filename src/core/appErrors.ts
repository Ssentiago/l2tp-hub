import i18n from "./i18n";
import type { AppError, AppErrorCode } from "../typing/bindings";

/** Разбирает значение из отклонённого invoke в структурную ошибку команды. */
export function toAppError(reason: unknown): AppError | undefined {
  if (typeof reason !== "object" || reason === null) return undefined;
  const candidate = reason as Partial<AppError>;
  if (typeof candidate.code !== "string") return undefined;
  return {
    code: candidate.code as AppErrorCode,
    detail: typeof candidate.detail === "string" ? candidate.detail : null,
  };
}

/**
 * Локализованное сообщение об ошибке команды для UI. Шаблон выбирается по
 * коду ошибки, техническая деталь подставляется в него. Значения вне
 * структурной ошибки отдаются как есть.
 */
export function appErrorMessage(reason: unknown): string {
  const error = toAppError(reason);
  if (!error) {
    if (reason instanceof Error) return reason.message;
    return typeof reason === "string" ? reason : String(reason);
  }
  return i18n.t(`commandErrors.${error.code}`, { detail: error.detail ?? "" });
}
