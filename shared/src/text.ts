/** Форма слова для числа: pluralRu(5, ['трава', 'травы', 'трав']) → 'трав'. */
export function pluralRu(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

/** Число со словом: countRu(21, ['трава', 'травы', 'трав']) → '21 трава'. */
export function countRu(n: number, forms: readonly [string, string, string]): string {
  return `${n} ${pluralRu(n, forms)}`;
}

/** Версия базы YYYYMMDDHHmm (UTC) → «18.10.2026 01:41 UTC». */
export function contentVersionDate(version: number): string {
  const s = String(version).padStart(12, '0');
  return `${s.slice(6, 8)}.${s.slice(4, 6)}.${s.slice(0, 4)} ${s.slice(8, 10)}:${s.slice(10, 12)} UTC`;
}
