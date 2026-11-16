import i18n from "./i18n";
import type { ConnectError, ConnectErrorCode } from "../typing/bindings";

/** Действие, которое UI предлагает выполнить после сбоя подключения. */
export type ConnectErrorAction = "retry" | "edit" | "logs";

export interface ConnectErrorView {
  message: string;
  hints: string[];
  actions: ConnectErrorAction[];
}

/**
 * Действия для каждого кода ошибки. Текст и подсказки берутся из ресурсов
 * локализации по коду, поэтому формулировки в логах демонов на них не влияют.
 */
const ACTIONS: Record<ConnectErrorCode, ConnectErrorAction[]> = {
  ike_auth_failed: ["edit", "retry", "logs"],
  ike_no_proposal: ["logs", "edit"],
  ike_ts_unacceptable: ["edit", "logs"],
  ike_cert_untrusted: ["logs"],
  ike_peer_unreachable: ["retry", "edit"],
  ppp_negotiation_failed: ["retry", "logs"],
  ppp_peer_auth_failed: ["logs"],
  ppp_our_auth_failed: ["edit", "retry", "logs"],
  ppp_peer_dead: ["retry", "logs"],
  ppp_killed: ["retry", "logs"],
  stack_failed: ["retry", "logs"],
  unknown: ["logs", "retry"],
};

export function connectErrorView(error: ConnectError): ConnectErrorView {
  const code: ConnectErrorCode = error.code in ACTIONS ? error.code : "unknown";
  return {
    message: i18n.t(`errors.${code}.message`),
    hints: i18n.t(`errors.${code}.hints`, { returnObjects: true }) as string[],
    actions: ACTIONS[code],
  };
}

/** Разбирает значение из отклонённого invoke в структурную ошибку подключения. */
export function toConnectError(reason: unknown): ConnectError | undefined {
  if (typeof reason !== "object" || reason === null) return undefined;
  const candidate = reason as Partial<ConnectError>;
  if (typeof candidate.code !== "string" || typeof candidate.stage !== "string") return undefined;
  return {
    code: candidate.code as ConnectErrorCode,
    stage: candidate.stage as ConnectError["stage"],
    evidence: Array.isArray(candidate.evidence) ? candidate.evidence : [],
  };
}
