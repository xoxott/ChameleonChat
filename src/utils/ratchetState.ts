/**
 * Ratchet 状态：单向推进，不存 seed，过期时间槽的 key 无法再推导。
 * 时间槽基于统一时间源（syncTime），避免多设备时钟差异导致解密失败。
 */

import { mnemonicToSeed } from "./cryptoSeed"
import { getSyncedTimeSlot, getSyncedTimeSlotAsync } from "./syncTime"

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

/**
 * 用助记词初始化 ratchet，只推导当前与上一时间槽状态，不保留 seed。
 * 使用统一时间源确定时间槽，保证多设备一致。
 */
export async function initRatchet(mnemonic: string, passphrase = ""): Promise<void> {
  const seed = await mnemonicToSeed(mnemonic, passphrase)
  const T = await getSyncedTimeSlotAsync()
  const prev = await kdfSlotFromSeed(seed, T - 1)
  const curr = await kdfSlotFromSeed(seed, T)
  ratchetState = {
    previousSlotState: prev,
    currentSlotState: curr,
    currentTimeSlot: T,
  }
}

export async function ensureRatchetAdvanced(): Promise<void> {
  if (ratchetState.currentTimeSlot === null || ratchetState.currentSlotState === null) return
  const T = getSyncedTimeSlot()
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
