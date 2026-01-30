import { decryptChatToText, DecryptParams } from '../ChameleonChat'
import { getCurrentTimeSlot } from '../constants'

const MAX_MSG_INDEX = 10
const MAX_TIME_SLOT_OFFSET = 2

export async function decryptWithRetry(
  params: Omit<DecryptParams, 'timeSlot' | 'msgIndex'>,
  configTimeSlot: number
): Promise<string> {
  const currentTimeSlot = getCurrentTimeSlot()
  const timeSlotsToTry = [
    currentTimeSlot,
    currentTimeSlot - 1,
    currentTimeSlot - 2,
    configTimeSlot
  ]
  const uniqueTimeSlots = Array.from(new Set(timeSlotsToTry))
  const msgIndicesToTry = Array.from({ length: MAX_MSG_INDEX + 1 }, (_, i) => i)

  let lastError: Error | null = null

  for (const slot of uniqueTimeSlots) {
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

  throw lastError || new Error('Decryption failed with all time slots and msg indices')
}
