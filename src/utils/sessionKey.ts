/**
 * 从 seed/timeSlot/msgIndex 或 slotState/msgIndex 派生 AES-GCM 会话密钥
 */

export async function deriveSessionKey(
  seed: Uint8Array,
  timeSlot: number,
  msgIndex: number
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const data = new Uint8Array([
    ...seed,
    ...encoder.encode(String(timeSlot)),
    ...encoder.encode(String(msgIndex)),
  ])
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = new Uint8Array(hashBuffer)
  return crypto.subtle.importKey("raw", hashArray, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ])
}

export async function deriveSessionKeyFromState(
  slotState: Uint8Array,
  msgIndex: number
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const data = new Uint8Array([...slotState, ...encoder.encode(String(msgIndex))])
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = new Uint8Array(hashBuffer)
  return crypto.subtle.importKey("raw", hashArray, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ])
}
