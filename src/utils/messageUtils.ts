import { Message } from '../types'

let messageIdCounter = 0

export const createMessage = (
  text: string,
  sender: Message['sender'],
  encryptedText?: string
): Message => ({
  id: ++messageIdCounter,
  text,
  encryptedText,
  sender,
  time: new Date().toLocaleTimeString()
})

export const createErrorMessage = (text: string): Message => 
  createMessage(`>>> ERROR: ${text}`, 'system')

export const createSuccessMessage = (text: string): Message => 
  createMessage(`>>> ${text}`, 'bot')
