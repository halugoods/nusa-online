"use client";

// ============================================================================
// NUS1 Backup Decryption — Browser-side (WebCrypto AES-256-GCM + NUS1 parser)
// ============================================================================
// Decrypts .nus1 / .backup.sqlite.enc files entirely in the browser.
// Pipeline: AES-256-GCM decrypt → gunzip → parse NUS1 archive.
//
// Wire format:
//   encrypted blob = nonce(12) || cipherText(N) || mac(16)
//   key = SHA-256(canonicalUserId UTF-8)
//   inside: NUS1 archive = "NUS1"(4) || fileCount:u32 || [nameLen:u16 | name | dataLen:u32 | data]*
// ============================================================================

/** Parse a NUS1 plaintext archive → Map<filename, bytes> */
export function parseNus1(data: Uint8Array): Map<string, Uint8Array> {
  if (data.length < 8) throw new Error("File terlalu kecil (< 8 byte)");
  if (
    data[0] !== 0x4e ||
    data[1] !== 0x55 ||
    data[2] !== 0x53 ||
    data[3] !== 0x31
  ) {
    throw new Error("Bukan file NUS1 (magic bytes tidak cocok)");
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 4;
  const fileCount = view.getUint32(offset, true);
  offset += 4;

  if (fileCount === 0) throw new Error("Archive kosong (0 file)");
  if (fileCount > 10000) throw new Error(`fileCount tidak wajar: ${fileCount}`);

  const files = new Map<string, Uint8Array>();

  for (let i = 0; i < fileCount; i++) {
    if (offset + 2 > data.length) throw new Error("Truncated entry (nameLen)");
    const nameLen = view.getUint16(offset, true);
    offset += 2;

    if (nameLen === 0 || nameLen > 4096) {
      throw new Error(`nameLen tidak valid: ${nameLen}`);
    }
    if (offset + nameLen > data.length) throw new Error("Truncated entry (name)");

    const name = new TextDecoder().decode(data.slice(offset, offset + nameLen));
    offset += nameLen;

    if (offset + 4 > data.length) throw new Error("Truncated entry (dataLen)");
    const dataLen = view.getUint32(offset, true);
    offset += 4;

    if (dataLen > data.length - offset) {
      throw new Error(`dataLen melebihi sisa buffer: ${dataLen}`);
    }

    files.set(name, data.slice(offset, offset + dataLen));
    offset += dataLen;
  }

  return files;
}

/** Decrypt AES-256-GCM + gunzip → raw bytes (not NUS1 parsed) */
export async function decryptBackupRaw(
  encryptedBytes: Uint8Array,
  canonicalUserId: string
): Promise<Uint8Array> {
  if (encryptedBytes.length < 28) {
    throw new Error("File encrypted terlalu kecil (< 28 byte)");
  }

  // 1. Split: nonce(12) | cipherText(N) | mac(16)
  const nonce = encryptedBytes.slice(0, 12);
  const mac = encryptedBytes.slice(encryptedBytes.length - 16);
  const cipherText = encryptedBytes.slice(12, encryptedBytes.length - 16);

  // 2. Derive key: SHA-256(canonicalUserId)
  const uidBytes = new TextEncoder().encode(canonicalUserId);
  const hash = await crypto.subtle.digest("SHA-256", uidBytes);
  const aesKey = await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // 3. AES-256-GCM decrypt (cipherText || mac → single buffer)
  const cipherTextWithMac = new Uint8Array(cipherText.length + mac.length);
  cipherTextWithMac.set(cipherText, 0);
  cipherTextWithMac.set(mac, cipherText.length);

  let compressed: ArrayBuffer;
  try {
    compressed = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      cipherTextWithMac
    );
  } catch (e: any) {
    throw new Error(
      `Decrypt gagal — UID salah atau file rusak: ${e?.message ?? e}`
    );
  }

  // 4. Gunzip via CompressionStream
  const stream = new Blob([new Uint8Array(compressed)])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Decrypt .nus1 / .backup.sqlite.enc → Map<filename, bytes> */
export async function decryptBackup(
  encryptedBytes: Uint8Array,
  canonicalUserId: string
): Promise<Map<string, Uint8Array>> {
  const rawBytes = await decryptBackupRaw(encryptedBytes, canonicalUserId);
  return parseNus1(rawBytes);
}

/** Convenience: decrypt from a File object (browser) */
export async function decryptBackupFile(
  file: File,
  canonicalUserId: string
): Promise<Map<string, Uint8Array>> {
  const buf = new Uint8Array(await file.arrayBuffer());
  return decryptBackup(buf, canonicalUserId);
}

/** Convenience: decrypt from base64 string */
export async function decryptBackupBase64(
  base64: string,
  canonicalUserId: string
): Promise<Map<string, Uint8Array>> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return decryptBackup(bytes, canonicalUserId);
}
