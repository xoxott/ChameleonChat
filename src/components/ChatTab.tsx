import React from 'react'
import { Message } from '../types'
import { MessageItem } from './MessageItem'

interface ChatTabProps {
  messages: Message[]
  inputValue: string
  isProcessing: boolean
  onInputChange: (value: string) => void
  onSend: () => void
  onCopy: (text: string, type: string) => void
  onDecryptMessage: (encryptedText: string, messageId: number) => void
}

export const ChatTab: React.FC<ChatTabProps> = ({
  messages,
  inputValue,
  isProcessing,
  onInputChange,
  onSend,
  onCopy,
  onDecryptMessage
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="chat-container">
      <div className="messages terminal-box">
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            onCopy={onCopy}
            onDecrypt={onDecryptMessage}
          />
        ))}
        {isProcessing && (
          <div className="processing">
            <span className="blink">{'>>> PROCESSING'}</span>
          </div>
        )}
      </div>

      <div className="input-area terminal-box">
        <div className="input-prompt">{'>>> '}</div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type message..."
          className="message-input terminal-input"
        />
        <button onClick={onSend} className="send-button terminal-btn" disabled={isProcessing}>
          {isProcessing ? '>>> PROCESSING...' : '>>> SEND'}
        </button>
      </div>
    </div>
  )
}
