/**
 * Утилиты для валидации и парсинга IPv4 подсетей.
 * Поддерживаемые форматы ввода:
 *   - CIDR:       10.0.0.0/8, 192.168.1.0/24
 *   - Маска:      10.0.0.0/255.0.0.0
 *   - Range:      10.0.0.1-10.0.0.254
 *   - Shorthand:  192.168.1 → 192.168.1.0/24
 *   - Host:       10.0.0.1 → 10.0.0.1/32
 */

export interface ParseResult {
  ok: boolean;
  cidr?: string;       // Нормализованный CIDR
  error?: string;
  original: string;
}

/**
 * Проверяет что строка — валидный IPv4 адрес
 */
function isValidIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return !isNaN(n) && n >= 0 && n <= 255 && p === String(n);
  });
}

/**
 * IP → число (uint32)
 */
function ipToUint32(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Число → IP
 */
function uint32ToIp(n: number): string {
  return `${(n >>> 24) & 0xff}.${(n >>> 16) & 0xff}.${(n >>> 8) & 0xff}.${n & 0xff}`;
}

/**
 * Маска в нотации /N
 */
function maskToCidr(mask: string): number | null {
  const n = ipToUint32(mask);
  // Проверяем что маска непрерывная (111...000...)
  const bits = (~n >>> 0).toString(2);
  if (!/^0*$/.test(bits)) return null; // не непрерывная
  return 32 - bits.length;
}

/**
 * CIDR → количество хостов
 */
function cidrHosts(prefix: number): number {
  return 1 << (32 - prefix);
}

/**
 * Проверяет что network address корректный для данного prefix
 * (т.е. все host bits = 0)
 */
function isNetworkAddress(ip: string, prefix: number): boolean {
  const n = ipToUint32(ip);
  const hostMask = cidrHosts(prefix) - 1;
  return (n & hostMask) === 0;
}

/**
 * Парсит одну строку ввода в CIDR.
 * Поддерживает: CIDR, маска, range, shorthand, host.
 */
export function parseSubnetInput(input: string): ParseResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Пустой ввод", original: input };

  // --- Range: 10.0.0.1-10.0.0.254 ---
  if (raw.includes("-") && !raw.includes("/")) {
    const parts = raw.split("-");
    if (parts.length === 2) {
      const start = parts[0].trim();
      const end = parts[1].trim();
      if (!isValidIPv4(start)) return { ok: false, error: `Невалидный IP: ${start}`, original: input };
      if (!isValidIPv4(end)) return { ok: false, error: `Невалидный IP: ${end}`, original: input };
      const startN = ipToUint32(start);
      const endN = ipToUint32(end);
      if (startN > endN) return { ok: false, error: "Начало диапазона больше конца", original: input };

      // Находим минимальный CIDR покрывающий диапазон
      // Для простоты: если range = целая подсеть — вернуть её CIDR
      const diff = endN - startN + 1;
      // Проверяем выравнивание на степень 2
      if ((startN & (diff - 1)) === 0 && (diff & (diff - 1)) === 0) {
        const prefix = 32 - Math.log2(diff);
        return { ok: true, cidr: `${uint32ToIp(startN)}/${prefix}`, original: input };
      }
      // Иначе: возвращаем /32 для каждого адреса? Нет — ругаемся
      return {
        ok: false,
        error: `Диапазон не выровнен на подсеть. Используйте CIDR или сократите диапазон.`,
        original: input,
      };
    }
  }

  // --- CIDR: 10.0.0.0/8 или 10.0.0.0/255.0.0.0 ---
  if (raw.includes("/")) {
    const [ipPart, prefixPart] = raw.split("/", 2);
    const ip = ipPart.trim();
    const prefixStr = prefixPart.trim();

    if (!isValidIPv4(ip)) return { ok: false, error: `Невалидный IP: ${ip}`, original: input };

    let prefix: number;
    if (prefixStr.includes(".")) {
      // Маска в нотации 255.0.0.0
      const cidr = maskToCidr(prefixStr);
      if (cidr === null) return { ok: false, error: `Невалидная маска: ${prefixStr}`, original: input };
      prefix = cidr;
    } else {
      prefix = Number(prefixStr);
      if (isNaN(prefix) || prefix < 0 || prefix > 32) {
        return { ok: false, error: `Невалидный prefix: ${prefixStr}`, original: input };
      }
    }

    if (!isNetworkAddress(ip, prefix)) {
      // Автокоррекция: округляем до network address
      const n = ipToUint32(ip);
      const hostMask = cidrHosts(prefix) - 1;
      const networkN = (n & ~hostMask) >>> 0;
      const corrected = uint32ToIp(networkN);
      return { ok: true, cidr: `${corrected}/${prefix}`, original: input };
    }

    return { ok: true, cidr: `${ip}/${prefix}`, original: input };
  }

  // --- Shorthand или host ---
  // 192.168.1 → 192.168.1.0/24
  // 10.0 → 10.0.0.0/16
  // 10 → 10.0.0.0/8
  const dotParts = raw.split(".");
  if (dotParts.length < 4 && dotParts.every((p) => !isNaN(Number(p)) && Number(p) >= 0 && Number(p) <= 255)) {
    const zeros = 4 - dotParts.length;
    const fullIp = [...dotParts, ...Array(zeros).fill("0")].join(".");
    const prefix = dotParts.length * 8;
    return { ok: true, cidr: `${fullIp}/${prefix}`, original: input };
  }

  // Обычный IP → /32
  if (isValidIPv4(raw)) {
    return { ok: true, cidr: `${raw}/32`, original: input };
  }

  return { ok: false, error: `Невалидный ввод: ${raw}`, original: input };
}

/**
 * Форматирует CIDR для красивого отображения
 */
export function formatCidr(cidr: string): string {
  const [ip, prefix] = cidr.split("/");
  const p = Number(prefix);
  if (p === 32) return ip; // хост — без маски
  return cidr;
}

/**
 * Описание подсети для tooltip
 */
export function describeCidr(cidr: string): string {
  const [, prefix] = cidr.split("/");
  const p = Number(prefix);
  if (p === 32) return "Один хост";
  const hosts = cidrHosts(p);
  if (hosts <= 256) return `${hosts} адресов`;
  if (hosts <= 65536) return `${(hosts / 1024).toFixed(0)}K адресов`;
  return `${(hosts / 1048576).toFixed(0)}M адресов`;
}