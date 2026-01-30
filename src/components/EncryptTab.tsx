import React, { useState, useEffect } from 'react'
import { 
  formatTimeFromTimestamp, 
  getExpiryTimeFromTimestamp, 
  getCurrentTimeSlot, 
  isExpiredFromTimestamp, 
  getTimeRemainingFromTimestamp 
} from '../constants'

interface EncryptTabProps {
  encryptInput: string
  encryptOutput: string
  encryptTimeSlot: number | null
  encryptTimestamp: number | null
  encryptMsgIndexUsed: number | null
  decryptInput: string
  decryptOutput: string
  timeSlot: number
  isProcessing: boolean
  onEncryptInputChange: (value: string) => void
  onDecryptInputChange: (value: string) => void
  onEncrypt: () => void
  onDecrypt: () => void
  onClearEncrypt: () => void
  onClearDecrypt: () => void
  onCopy: (text: string, type: string) => void
}

// 加密信息组件
const EncryptionInfo: React.FC<{ 
  timeSlot: number
  encryptTimestamp: number
  msgIndex: number | null
}> = ({ timeSlot, encryptTimestamp, msgIndex }) => {
  const expired = isExpiredFromTimestamp(encryptTimestamp)
  const [timeRemaining, setTimeRemaining] = useState(() => getTimeRemainingFromTimestamp(encryptTimestamp))

  // 当 encryptTimestamp 变化时，重置倒计时
  useEffect(() => {
    setTimeRemaining(getTimeRemainingFromTimestamp(encryptTimestamp))
  }, [encryptTimestamp])

  // 定时更新剩余时间
  useEffect(() => {
    if (expired) {
      setTimeRemaining('EXPIRED')
      return
    }

    const interval = setInterval(() => {
      const remaining = getTimeRemainingFromTimestamp(encryptTimestamp)
      setTimeRemaining(remaining)
      // 如果过期了，停止定时器
      if (remaining === 'EXPIRED') {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [encryptTimestamp, expired])

  return (
    <div className="time-slot-info">
      <div className="time-slot-display">
        <span className="terminal-label">ENCRYPTION TIME:</span>
        <span className="time-value">{formatTimeFromTimestamp(encryptTimestamp)}</span>
      </div>
      <div className="time-slot-display">
        <span className="terminal-label">EXPIRES AT:</span>
        <span className={`time-value ${expired ? 'expired' : ''}`}>
          {getExpiryTimeFromTimestamp(encryptTimestamp)}
        </span>
      </div>
      <div className="time-slot-display">
        <span className="terminal-label">TIME_SLOT:</span>
        <span className="time-value">{timeSlot}</span>
      </div>
      {msgIndex !== null && (
        <div className="time-slot-display">
          <span className="terminal-label">MSG_INDEX:</span>
          <span className="time-value">{msgIndex}</span>
        </div>
      )}
      {!expired && (
        <div className="time-slot-display">
          <span className="terminal-label">TIME REMAINING:</span>
          <span className="time-value">{timeRemaining}</span>
        </div>
      )}
      {expired && (
        <div className="expiry-warning">
          <span className="warning-text">⚠️ EXPIRED - This encrypted text can no longer be decrypted</span>
        </div>
      )}
      <span className="setting-hint">
        {expired ? (
          <>
            This message has expired. The encrypted text cannot be decrypted anymore.
            <br />
            <strong>Note:</strong> You can still encrypt the same text again, and it will produce a different encrypted output.
          </>
        ) : (
          <>
            This message will expire at {getExpiryTimeFromTimestamp(encryptTimestamp)}. 
            <br />
            <strong>✓ Can be decrypted within 1 minute</strong> - The encrypted text can be decrypted during the validity period.
            <br />
            <strong>Note:</strong> Each encryption of the same text produces different encrypted output due to different time slots and message indices.
          </>
        )}
      </span>
    </div>
  )
}

export const EncryptTab: React.FC<EncryptTabProps> = ({
  encryptInput,
  encryptOutput,
  encryptTimeSlot,
  encryptTimestamp,
  encryptMsgIndexUsed,
  decryptInput,
  decryptOutput,
  timeSlot,
  isProcessing,
  onEncryptInputChange,
  onDecryptInputChange,
  onEncrypt,
  onDecrypt,
  onClearEncrypt,
  onClearDecrypt,
  onCopy
}) => {
  return (
    <div className="encrypt-container">
      <div className="encrypt-section terminal-box">
        <div className="section-header">
          <span className="section-title">{'>>> ENCRYPT TEXT'}</span>
        </div>
        <div className="section-body">
          <label className="terminal-label">PLAINTEXT:</label>
          <textarea
            value={encryptInput}
            onChange={(e) => onEncryptInputChange(e.target.value)}
            placeholder="Enter text to encrypt..."
            className="terminal-textarea"
            rows={5}
          />
          <div className="button-group">
            <button
              onClick={onEncrypt}
              className="terminal-btn"
              disabled={isProcessing}
            >
              {isProcessing ? '>>> PROCESSING...' : '>>> ENCRYPT'}
            </button>
            <button onClick={onClearEncrypt} className="terminal-btn secondary">
              {'>>> CLEAR'}
            </button>
          </div>
          <div className="output-header">
            <label className="terminal-label">ENCRYPTED OUTPUT:</label>
            {encryptOutput && (
              <button
                className="copy-btn"
                onClick={() => onCopy(encryptOutput, 'Encrypted text')}
                title="Copy encrypted text"
              >
                📋 COPY
              </button>
            )}
          </div>
          {encryptTimeSlot !== null && encryptTimestamp !== null && (
            <EncryptionInfo 
              timeSlot={encryptTimeSlot} 
              encryptTimestamp={encryptTimestamp}
              msgIndex={encryptMsgIndexUsed}
            />
          )}
          <div className="output-box">
            <pre className="terminal-text">{encryptOutput || '>>> Waiting for input...'}</pre>
          </div>
        </div>
      </div>

      <div className="encrypt-section terminal-box">
        <div className="section-header">
          <span className="section-title">{'>>> DECRYPT TEXT'}</span>
        </div>
        <div className="section-body">
          <label className="terminal-label">ENCRYPTED TEXT:</label>
          <textarea
            value={decryptInput}
            onChange={(e) => onDecryptInputChange(e.target.value)}
            placeholder="Enter encrypted text to decrypt..."
            className="terminal-textarea"
            rows={5}
          />
          <div className="time-slot-info" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            <div className="time-slot-display">
              <span className="terminal-label">USING TIME_SLOT:</span>
              <span className="time-value">{timeSlot}</span>
            </div>
            <span className="setting-hint">Using TIME_SLOT from configuration. Adjust in settings if decryption fails.</span>
          </div>
          <div className="button-group">
            <button
              onClick={onDecrypt}
              className="terminal-btn"
              disabled={isProcessing}
            >
              {isProcessing ? '>>> PROCESSING...' : '>>> DECRYPT'}
            </button>
            <button onClick={onClearDecrypt} className="terminal-btn secondary">
              {'>>> CLEAR'}
            </button>
          </div>
          <div className="output-header">
            <label className="terminal-label">DECRYPTED OUTPUT:</label>
            {decryptOutput && decryptOutput !== '>>> Waiting for input...' && !decryptOutput.startsWith('>>> ERROR') && (
              <button
                className="copy-btn"
                onClick={() => onCopy(decryptOutput, 'Decrypted text')}
                title="Copy decrypted text"
              >
                📋 COPY
              </button>
            )}
          </div>
          <div className="output-box">
            <pre className="terminal-text">{decryptOutput || '>>> Waiting for input...'}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
