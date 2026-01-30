import React from 'react'
import { Message } from '../types'

interface MessageItemProps {
  message: Message
  onCopy: (text: string, type: string) => void
  onDecrypt: (encryptedText: string, messageId: number) => void
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onCopy, onDecrypt }) => {
  return (
    <div className={`message ${message.sender}`}>
      <div className="message-content">
        <span className="message-text">
          {message.sender === 'user' && message.encryptedText ? (
            <>
              <div className="message-plaintext">{'>>> PLAINTEXT: '}{message.text}</div>
              <div className="message-encrypted">
                <div className="encrypted-header">
                  <span className="encrypted-label">{'>>> ENCRYPTED:'}</span>
                  <button
                    className="copy-btn-small"
                    onClick={() => onCopy(message.encryptedText!, 'Encrypted text')}
                    title="Copy encrypted text"
                  >
                    📋 COPY
                  </button>
                </div>
                <div className="encrypted-text">{message.encryptedText}</div>
              </div>
              <button
                className="decrypt-btn"
                onClick={() => onDecrypt(message.encryptedText!, message.id)}
              >
                {'>>> DECRYPT'}
              </button>
            </>
          ) : (
            <pre className="terminal-text">{message.text}</pre>
          )}
        </span>
        <span className="message-time">{message.time}</span>
      </div>
    </div>
  )
}
