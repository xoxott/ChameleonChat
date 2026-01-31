import { decryptChatToText } from './chatCrypto'

/**
 * 解密入口：内部会尝试当前槽与上一槽 + msgIndex 0..10
 */
export const decryptWithRetry = decryptChatToText
