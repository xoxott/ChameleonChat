/**
 * 统一时间源：从公共时间 API 同步时间，避免不同设备本地时钟差异导致加解密时间槽不一致
 */

const SLOT_MS = 60 * 1000 // 1 分钟

/** 多源 fallback，任一成功即用 */
const TIME_API_URLS = [
  "https://worldtimeapi.org/api/timezone/Etc/UTC",
  "https://worldtimeapi.org/api/ip",
]

let offsetMs = 0
let synced = false

/**
 * 从远程时间 API 拉取当前时间，计算与本机的偏移并缓存。
 * 失败时保持 offset=0（等价于用本地时间），不抛错。
 */
export async function syncTime(): Promise<void> {
  const localBefore = Date.now()
  for (const url of TIME_API_URLS) {
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) })
      if (!res.ok) continue
      const data = (await res.json()) as { unixtime?: number; unixtime_ms?: number }
      const serverMs = data.unixtime_ms ?? (data.unixtime != null ? data.unixtime * 1000 : NaN)
      if (!Number.isFinite(serverMs)) continue
      // 用请求前后本地时间的中间值近似“请求发出时刻”的本地时间，减小 RTT 影响
      const localAfter = Date.now()
      const localMid = (localBefore + localAfter) / 2
      offsetMs = serverMs - localMid
      synced = true
      return
    } catch {
      continue
    }
  }
  // 全部失败：不修改 offset，相当于继续用本地时间
}

/**
 * 若尚未同步则先执行一次 syncTime()，再返回基于统一时间源的当前时间槽。
 * 用于 initRatchet 等需要“当前槽”且必须用统一时间的场景。
 */
export async function getSyncedTimeSlotAsync(): Promise<number> {
  if (!synced) await syncTime()
  return getSyncedTimeSlot()
}

/**
 * 当前时间槽（基于已缓存的偏移，不发起请求）。
 * 未同步过时等价于本地时间槽。
 */
export function getSyncedTimeSlot(): number {
  return Math.floor((Date.now() + offsetMs) / SLOT_MS)
}

/**
 * 统一时间源下的当前时间戳（毫秒），用于展示或其它逻辑。
 */
export function getSyncedTimestamp(): number {
  return Date.now() + offsetMs
}

export function isTimeSynced(): boolean {
  return synced
}
