import type { ConnectError, ConnectErrorCode } from "../typing/bindings";

/** Действие, которое UI предлагает выполнить после сбоя подключения. */
export type ConnectErrorAction = "retry" | "edit" | "logs";

export interface ConnectErrorView {
  message: string;
  hints: string[];
  actions: ConnectErrorAction[];
}

/**
 * Текст и подсказки для UI выбираются по стабильному коду ошибки,
 * поэтому формулировки в логах демонов на них не влияют.
 */
const VIEWS: Record<ConnectErrorCode, ConnectErrorView> = {
  ike_auth_failed: {
    message: "Сервер отклонил аутентификацию IKE",
    hints: [
      "Проверьте общий ключ (PSK) в параметрах подключения",
      "Ключ должен совпадать с ключом, заданным на сервере",
    ],
    actions: ["edit", "retry", "logs"],
  },
  ike_no_proposal: {
    message: "Сервер не принял набор алгоритмов шифрования",
    hints: [
      "Параметры IKE на сервере не совпадают с нашими",
      "Требуется уточнить настройки у администратора сервера",
    ],
    actions: ["logs", "edit"],
  },
  ike_ts_unacceptable: {
    message: "Сервер отклонил подсети туннеля",
    hints: [
      "Проверьте подсети раздельного туннелирования",
      "Сервер может разрешать только определённые сети",
    ],
    actions: ["edit", "logs"],
  },
  ike_cert_untrusted: {
    message: "Сертификат или ключ сервера не прошёл проверку",
    hints: ["Сервер использует ключ, которому приложение не доверяет"],
    actions: ["logs"],
  },
  ike_peer_unreachable: {
    message: "Сервер не отвечает на запросы IKE",
    hints: [
      "Проверьте адрес сервера и доступ в интернет",
      "Файрвол или провайдер может блокировать UDP 500 и 4500",
    ],
    actions: ["retry", "edit"],
  },
  ppp_negotiation_failed: {
    message: "PPP-согласование не завершилось",
    hints: [
      "IPSec установлен, но туннель PPP не поднялся",
      "Проверьте логи сессии и настройки сервера",
    ],
    actions: ["retry", "logs"],
  },
  ppp_peer_auth_failed: {
    message: "Сервер не прошёл проверку подлинности на этапе PPP",
    hints: ["Учётная запись на сервере настроена неправильно"],
    actions: ["logs"],
  },
  ppp_our_auth_failed: {
    message: "Сервер отклонил имя пользователя или пароль",
    hints: [
      "Проверьте логин и пароль в параметрах подключения",
      "Убедитесь, что учётная запись активна на сервере",
    ],
    actions: ["edit", "retry", "logs"],
  },
  ppp_peer_dead: {
    message: "Сервер оборвал PPP-соединение",
    hints: ["Сервер перестал отвечать на эхо-запросы канала"],
    actions: ["retry", "logs"],
  },
  ppp_killed: {
    message: "Демон PPP завершён принудительно",
    hints: ["Процесс pppd был убит после запуска, проверьте логи сессии"],
    actions: ["retry", "logs"],
  },
  stack_failed: {
    message: "Локальные VPN-демоны не запустились",
    hints: [
      "Не стартовал charon или xl2tpd",
      "Перезапустите приложение, при повторе переустановите helper",
    ],
    actions: ["retry", "logs"],
  },
  unknown: {
    message: "Не удалось подключиться",
    hints: ["Причина сбоя не распознана, откройте логи сессии"],
    actions: ["logs", "retry"],
  },
};

export function connectErrorView(error: ConnectError): ConnectErrorView {
  return VIEWS[error.code] ?? VIEWS.unknown;
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
