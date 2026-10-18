import * as Crypto from 'expo-crypto';

/** Скачивает файл целиком; отклоняется при ошибке сети, таймауте и HTTP не 2xx. */
export async function fetchBytes(url: string, timeoutMs: number): Promise<Uint8Array> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** sha256 в виде строки из 64 шестнадцатеричных символов в нижнем регистре. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // Копия гарантирует буфер типа ArrayBuffer, которого требует BufferSource.
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
