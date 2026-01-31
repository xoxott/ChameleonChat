import { decryptChatToText, DecryptParams } from '../ChameleonChat'
import { getCurrentTimeSlot } from './timeUtils'

const MAX_MSG_INDEX = 10
// 过期时间：60秒（1分钟）
const EXPIRY_TIME_MS = 60 * 1000

/**
 * 检查时间槽是否已过期
 * 由于时间槽是每分钟一个，我们需要检查该时间槽的最晚可能加密时间是否已超过60秒
 */
function isTimeSlotExpired(timeSlot: number): boolean {
  const now = Date.now()
  // 时间槽的最晚可能加密时间 = (timeSlot + 1) * 60 * 1000 - 1
  // 即下一个时间槽开始时间的前1毫秒
  const latestEncryptTime = (timeSlot + 1) * 60 * 1000 - 1
  // 如果最晚加密时间距离现在超过60秒，则认为该时间槽已过期
  return (now - latestEncryptTime) > EXPIRY_TIME_MS
}

export async function decryptWithRetry(
  params: Omit<DecryptParams, 'timeSlot' | 'msgIndex'>,
  configTimeSlot: number
): Promise<string> {
  const currentTimeSlot = getCurrentTimeSlot()
  const now = Date.now()
  
  // 构建要尝试的时间槽列表
  const timeSlotsToTry: number[] = []
  
  // 1. 添加当前时间槽（肯定未过期）
  timeSlotsToTry.push(currentTimeSlot)
  
  // 2. 添加上一个时间槽（如果未过期）
  // 上一个时间槽的最晚加密时间是当前时间槽的开始时间 - 1毫秒
  // 如果这个时间距离现在不超过60秒，说明上一个时间槽的密文可能还在有效期内
  const prevTimeSlot = currentTimeSlot - 1
  if (!isTimeSlotExpired(prevTimeSlot)) {
    timeSlotsToTry.push(prevTimeSlot)
  }
  
  // 3. 如果配置的时间槽在有效范围内，也尝试它
  if (configTimeSlot !== currentTimeSlot && configTimeSlot !== prevTimeSlot) {
    if (!isTimeSlotExpired(configTimeSlot) && configTimeSlot >= currentTimeSlot - 1) {
      timeSlotsToTry.push(configTimeSlot)
    }
  }
  
  // 去重并排序（从最新到最旧）
  const uniqueTimeSlots = Array.from(new Set(timeSlotsToTry)).sort((a, b) => b - a)
  const msgIndicesToTry = Array.from({ length: MAX_MSG_INDEX + 1 }, (_, i) => i)

  // 如果没有有效的时间槽可以尝试，直接抛出错误
  if (uniqueTimeSlots.length === 0) {
    throw new Error('The encrypted text has expired (older than 1 minute) and cannot be decrypted.')
  }

  let lastError: Error | null = null
  let triedSlots: number[] = []

  for (const slot of uniqueTimeSlots) {
    // 再次检查时间槽是否已过期（防止在循环过程中过期）
    if (isTimeSlotExpired(slot)) {
      continue
    }
    
    triedSlots.push(slot)
    for (const msgIdx of msgIndicesToTry) {
      try {
        return await decryptChatToText({
          ...params,
          timeSlot: slot,
          msgIndex: msgIdx
        })
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
      }
    }
  }

  // 如果所有尝试都失败，提供更详细的错误信息
  if (triedSlots.length === 0) {
    throw new Error('The encrypted text has expired (older than 1 minute) and cannot be decrypted.')
  }

  throw lastError || new Error(`Decryption failed with all time slots [${triedSlots.join(', ')}] and msg indices [0-${MAX_MSG_INDEX}]. The encrypted text may have expired or the mnemonic/passphrase is incorrect.`)
}
