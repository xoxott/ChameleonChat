// 时间槽相关工具函数

export const getCurrentTimeSlot = () => Math.floor(Date.now() / (1000 * 60))

export const formatTime = (timeSlot: number) => new Date(timeSlot * 60 * 1000).toLocaleString()

export const formatTimeFromTimestamp = (timestamp: number) => new Date(timestamp).toLocaleString()

export const getExpiryTime = (timeSlot: number) => new Date((timeSlot + 1) * 60 * 1000).toLocaleString()

export const getExpiryTimeFromTimestamp = (encryptTimestamp: number) => {
  const expiryTimestamp = encryptTimestamp + 60 * 1000 // 加密时间 + 60秒
  return new Date(expiryTimestamp).toLocaleString()
}

export const isExpired = (timeSlot: number) => {
  const currentTimeSlot = getCurrentTimeSlot()
  return currentTimeSlot > timeSlot
}

export const isExpiredFromTimestamp = (encryptTimestamp: number) => {
  const expiryTimestamp = encryptTimestamp + 60 * 1000
  return Date.now() > expiryTimestamp
}

export const getTimeRemaining = (timeSlot: number) => {
  const expiryTime = (timeSlot + 1) * 60 * 1000
  const now = Date.now()
  const remaining = expiryTime - now
  if (remaining <= 0) return 'EXPIRED'
  const seconds = Math.floor(remaining / 1000)
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

export const getTimeRemainingFromTimestamp = (encryptTimestamp: number) => {
  const expiryTimestamp = encryptTimestamp + 60 * 1000
  const now = Date.now()
  const remaining = expiryTimestamp - now
  if (remaining <= 0) return 'EXPIRED'
  const seconds = Math.floor(remaining / 1000)
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}
