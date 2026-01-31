/**
 * 本地时间源 + 时间回拨检测：检测到时钟被拨回则永久锁死本设备，
 * 持久化锁标志、不再提供时间槽，本设备上任何人（含助记词）都无法再解密。
 */

const SLOT_MS = 60 * 1000 // 1 分钟
const ROLLBACK_LOCK_KEY = "chameleon_rollback_lock"

/** 已观测到的最大时间槽，用于检测回拨 */
let lastSeenTimeSlot: number = -1

function isRollbackLocked(): boolean {
  if (typeof localStorage === "undefined") return false
  return localStorage.getItem(ROLLBACK_LOCK_KEY) !== null
}

/**
 * 检测到回拨时写入持久锁，之后本设备永远不再提供时间槽。
 */
function setRollbackLock(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ROLLBACK_LOCK_KEY, String(lastSeenTimeSlot))
  }
}

/**
 * 基于本地时间计算当前时间槽。若曾检测到回拨（已锁）则直接抛 LOCKED_BY_ROLLBACK；
 * 若本次发现回拨则持久化锁、抛 TIME_ROLLBACK_DETECTED，调用方清空密钥后本设备永久不可解密。
 */
export function getDetectedTimeSlot(): number {
  if (isRollbackLocked()) {
    throw new Error("LOCKED_BY_ROLLBACK")
  }
  const current = Math.floor(Date.now() / SLOT_MS)
  if (current < lastSeenTimeSlot) {
    setRollbackLock()
    throw new Error("TIME_ROLLBACK_DETECTED")
  }
  lastSeenTimeSlot = current
  return current
}

/**
 * 异步形式，供 initRatchet 等调用；逻辑与 getDetectedTimeSlot 一致。
 */
export async function getDetectedTimeSlotAsync(): Promise<number> {
  return getDetectedTimeSlot()
}
