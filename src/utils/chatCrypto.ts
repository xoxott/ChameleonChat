/**
 * 聊天加解密门面：组合 ratchet、AES、转义表，对外暴露 encrypt/decrypt API
 */

import {
  aesEncrypt,
  aesDecrypt,
  CipherObject,
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "./aesCrypto"
import {
  generateEscapeTableFromState,
  bytesToSymbols,
  symbolsToBytes,
} from "./escapeTable"
import { deriveSessionKeyFromState } from "./sessionKey"
import {
  initRatchet,
  ensureRatchetAdvanced,
  getSlotState,
  getCurrentRatchetTimeSlot,
  getRatchetState,
} from "./ratchetState"

const MAX_MSG_INDEX_RETRY = 10

export { initRatchet, getCurrentRatchetTimeSlot }

/**
 * 加密：使用当前 ratchet 状态（不传 mnemonic，不存 seed）。
 * 必须先调用 initRatchet(mnemonic, passphrase)。
 */
export async function encryptTextToChat(
  plaintext: string,
  msgIndex: number
): Promise<string> {
  const state = getRatchetState()
  if (state.currentSlotState === null || state.currentTimeSlot === null) {
    throw new Error("Ratchet not initialized. Call initRatchet(mnemonic, passphrase) first.")
  }
  await ensureRatchetAdvanced()
  const slotState = getRatchetState().currentSlotState!
  const key = await deriveSessionKeyFromState(slotState, msgIndex)
  const cipherObj = await aesEncrypt(key, plaintext)
  const ivBytes = base64ToArrayBuffer(cipherObj.iv)
  const dataBytes = base64ToArrayBuffer(cipherObj.data)
  const tagBytes = base64ToArrayBuffer(cipherObj.tag)
  const bytes = new Uint8Array(ivBytes.length + dataBytes.length + tagBytes.length)
  bytes.set(ivBytes, 0)
  bytes.set(dataBytes, ivBytes.length)
  bytes.set(tagBytes, ivBytes.length + dataBytes.length)
  const table = await generateEscapeTableFromState(slotState, msgIndex)
  return bytesToSymbols(bytes, table)
}

/**
 * 解密：仅尝试当前槽与上一槽 + msgIndex 0..MAX，不传 mnemonic。
 * 过期槽的状态已丢弃，数学上无法再解。
 */
export async function decryptChatToText(chatText: string): Promise<string> {
  const state = getRatchetState()
  if (state.currentTimeSlot === null) {
    throw new Error("Ratchet not initialized. Call initRatchet(mnemonic, passphrase) first.")
  }
  const T = state.currentTimeSlot
  const slotsToTry = [T, T - 1]
  const msgIndicesToTry = Array.from(
    { length: MAX_MSG_INDEX_RETRY + 1 },
    (_, i) => i
  )
  let lastError: Error | null = null
  for (const slot of slotsToTry) {
    const slotState = getSlotState(slot)
    if (!slotState) continue
    for (const msgIdx of msgIndicesToTry) {
      try {
        const table = await generateEscapeTableFromState(slotState, msgIdx)
        const bytes = symbolsToBytes(chatText, table)
        if (bytes.length < 28) continue
        const ivBytes = bytes.slice(0, 12)
        const tagBytes = bytes.slice(bytes.length - 16)
        const dataBytes = bytes.slice(12, bytes.length - 16)
        const iv = arrayBufferToBase64(ivBytes)
        const tag = arrayBufferToBase64(tagBytes)
        const data = arrayBufferToBase64(dataBytes)
        const cipherObj: CipherObject = { iv, data, tag }
        const key = await deriveSessionKeyFromState(slotState, msgIdx)
        return await aesDecrypt(key, cipherObj)
      } catch (e) {
        lastError = e instanceof Error ? e : new Error("Unknown error")
      }
    }
  }
  throw (
    lastError ??
    new Error(
      "Decryption failed. The encrypted text may have expired (older than 2 minutes) or ratchet was re-initialized."
    )
  )
}
