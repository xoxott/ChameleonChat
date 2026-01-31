// 默认配置值
export const DEFAULT_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
export const DEFAULT_PASSPHRASE = 'default passphrase'
export const getDefaultTimeSlot = () => Math.floor(Date.now() / (1000 * 60)) // 每分钟一个时间槽
