/**
 * AES-GCM 加解密及 Base64 辅助
 */

export interface CipherObject {
  iv: string
  data: string
  tag: string
}

export function arrayBufferToBase64(buffer: Uint8Array): string {
  const binary = String.fromCharCode(...buffer)
  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  return new Uint8Array(binary.split("").map((char) => char.charCodeAt(0)))
}

export async function aesEncrypt(key: CryptoKey, plaintext: string): Promise<CipherObject> {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encoder.encode(plaintext)
  )

  const encryptedArray = new Uint8Array(encrypted)
  const tag = encryptedArray.slice(-16)
  const data = encryptedArray.slice(0, -16)

  return {
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(data),
    tag: arrayBufferToBase64(tag),
  }
}

export async function aesDecrypt(key: CryptoKey, cipherObj: CipherObject): Promise<string> {
  const iv = base64ToArrayBuffer(cipherObj.iv)
  const data = base64ToArrayBuffer(cipherObj.data)
  const tag = base64ToArrayBuffer(cipherObj.tag)

  const encrypted = new Uint8Array(data.length + tag.length)
  encrypted.set(data, 0)
  encrypted.set(tag, data.length)

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    encrypted
  )

  return new TextDecoder().decode(decrypted)
}
