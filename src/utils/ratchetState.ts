/**
 * Ratchet 状态：单向推进，不存 seed，过期时间槽的 key 无法再推导。
 * 时间槽基于本地时间 + 回拨检测（syncTime），回拨时拒绝加解密。
 * 注：state_T = KDF(seed, T)，助记词泄露可推导任意槽；若需「链式不可跳」需用相对时间槽并接受首次较慢。
 */

import { mnemonicToSeed } from "./cryptoSeed"
import { getDetectedTimeSlot, getDetectedTimeSlotAsync } from "./syncTime"

const SLOT_NEXT_LABEL = "chameleon_slot_next_v1"

async function kdfSlotFromSeed(seed: Uint8Array, timeSlot: number): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const data = new Uint8Array([...seed, ...encoder.encode(String(timeSlot))])
  const hash = await crypto.subtle.digest("SHA-256", data)
  return new Uint8Array(hash)
}

async function kdfSlotNext(prevSlotState: Uint8Array): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const data = new Uint8Array([...prevSlotState, ...encoder.encode(SLOT_NEXT_LABEL)])
  const hash = await crypto.subtle.digest("SHA-256", data)
  return new Uint8Array(hash)
}

let ratchetState: {
  previousSlotState: Uint8Array | null
  currentSlotState: Uint8Array | null
  currentTimeSlot: number | null
} = {
  previousSlotState: null,
  currentSlotState: null,
  currentTimeSlot: null,
}

/** 清空内存中的 slot 状态，回拨锁死后不再持有任何可解密密钥 */
function wipeRatchetState(): void {
  ratchetState = {
    previousSlotState: null,
    currentSlotState: null,
    currentTimeSlot: null,
  }
}

/**
 * 用助记词初始化 ratchet，只推导当前与上一时间槽状态，不保留 seed。
 * 若检测到时间回拨或本设备已锁死，会清空密钥并抛错，本设备永久不可解密。
 */
export async function initRatchet(mnemonic: string, passphrase = ""): Promise<void> {
  try {
    const T = await getDetectedTimeSlotAsync()
    const seed = await mnemonicToSeed(mnemonic, passphrase)
    const prev = await kdfSlotFromSeed(seed, T - 1)
    const curr = await kdfSlotFromSeed(seed, T)
    ratchetState = {
      previousSlotState: prev,
      currentSlotState: curr,
      currentTimeSlot: T,
    }
  } catch (e) {
    if (e instanceof Error && e.message === "TIME_ROLLBACK_DETECTED") {
      wipeRatchetState()
    }
    throw e
  }
}

export async function ensureRatchetAdvanced(): Promise<void> {
  if (ratchetState.currentTimeSlot === null || ratchetState.currentSlotState === null) return
  let T: number
  try {
    T = getDetectedTimeSlot()
  } catch (e) {
    if (e instanceof Error && e.message === "TIME_ROLLBACK_DETECTED") {
      wipeRatchetState()
    }
    throw e
  }
  if (T <= ratchetState.currentTimeSlot) return
  let prev = ratchetState.previousSlotState
  let curr = ratchetState.currentSlotState
  let slot = ratchetState.currentTimeSlot
  while (slot !== null && slot < T) {
    prev = curr
    curr = await kdfSlotNext(prev!)
    slot = slot + 1
  }
  ratchetState.previousSlotState = prev
  ratchetState.currentSlotState = curr
  ratchetState.currentTimeSlot = slot
}

export function getSlotState(timeSlot: number): Uint8Array | null {
  if (ratchetState.currentTimeSlot === null) return null
  const T = ratchetState.currentTimeSlot
  if (timeSlot === T && ratchetState.currentSlotState) return ratchetState.currentSlotState
  if (timeSlot === T - 1 && ratchetState.previousSlotState)
    return ratchetState.previousSlotState
  return null
}

export function getCurrentRatchetTimeSlot(): number | null {
  return ratchetState.currentTimeSlot
}

export function getRatchetState(): typeof ratchetState {
  return ratchetState
}
