import { useState, useEffect } from 'react'
import { encryptTextToChat, decryptChatToText } from './ChameleonChat'
import './App.css'

interface Message {
  id: number;
  text: string;
  encryptedText?: string;
  sender: 'user' | 'bot' | 'system';
  time: string;
}

type TabType = 'chat' | 'encrypt';

// 默认配置值
const DEFAULT_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const DEFAULT_PASSPHRASE = 'default passphrase'
const DEFAULT_TIME_SLOT = Math.floor(Date.now() / (1000 * 60)) // 每分钟一个时间槽

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat')
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      text: '>>> SYSTEM INITIALIZED\n>>> CHAMELEON CHAT v2.0\n>>> ENCRYPTION MODULE LOADED', 
      sender: 'system', 
      time: new Date().toLocaleTimeString() 
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [mnemonic, setMnemonic] = useState(DEFAULT_MNEMONIC)
  const [passphrase, setPassphrase] = useState(DEFAULT_PASSPHRASE)
  const [showSettings, setShowSettings] = useState(true)
  const [msgIndex, setMsgIndex] = useState(0)
  // 时间槽：每分钟一个（每条消息一分钟过期）
  const [timeSlot, setTimeSlot] = useState(DEFAULT_TIME_SLOT)
  const [manualTimeSlot, setManualTimeSlot] = useState<number | null>(null) // 手动设置的时间槽
  
  // 加密工具状态
  const [encryptInput, setEncryptInput] = useState('')
  const [encryptOutput, setEncryptOutput] = useState('')
  const [encryptTimeSlot, setEncryptTimeSlot] = useState<number | null>(null)
  const [decryptInput, setDecryptInput] = useState('')
  const [decryptOutput, setDecryptOutput] = useState('')
  const [encryptMsgIndex, setEncryptMsgIndex] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  // 重置到默认配置
  const resetToDefaults = () => {
    setMnemonic(DEFAULT_MNEMONIC)
    setPassphrase(DEFAULT_PASSPHRASE)
    setManualTimeSlot(null)
    setTimeSlot(Math.floor(Date.now() / (1000 * 60)))
    setCopySuccess('Configuration reset to defaults!')
    setTimeout(() => setCopySuccess(null), 2000)
  }

  // 自动更新时间槽（每分钟），如果用户没有手动设置
  useEffect(() => {
    if (manualTimeSlot !== null) {
      // 如果用户手动设置了时间槽，使用手动设置的值
      setTimeSlot(manualTimeSlot)
      return
    }
    
    const updateTimeSlot = () => {
      setTimeSlot(Math.floor(Date.now() / (1000 * 60)))
    }
    
    // 立即更新一次
    updateTimeSlot()
    
    // 每分钟更新一次
    const interval = setInterval(updateTimeSlot, 60 * 1000)
    
    return () => clearInterval(interval)
  }, [manualTimeSlot])


  const handleSend = async () => {
    if (inputValue.trim() && mnemonic.trim()) {
      try {
        setIsProcessing(true)
        const encryptedText = await encryptTextToChat({
          mnemonic,
          passphrase,
          plaintext: inputValue,
          timeSlot,
          msgIndex
        })

        const currentMsgIndex = msgIndex
        const newMessage: Message = {
          id: messages.length + 1,
          text: inputValue,
          encryptedText,
          sender: 'user',
          time: new Date().toLocaleTimeString()
        }
        setMessages([...messages, newMessage])
        setInputValue('')
        setMsgIndex(currentMsgIndex + 1)
        setIsProcessing(false)
        
        setTimeout(async () => {
          try {
            const decryptedText = await decryptChatToText({
              mnemonic,
              passphrase,
              chatText: encryptedText,
              timeSlot,
              msgIndex: currentMsgIndex
            })
            
            const reply: Message = {
              id: messages.length + 2,
              text: `>>> DECRYPTION SUCCESS\n>>> MESSAGE: "${decryptedText}"`,
              sender: 'bot',
              time: new Date().toLocaleTimeString()
            }
            setMessages(prev => [...prev, reply])
          } catch (error) {
            const errorReply: Message = {
              id: messages.length + 2,
              text: `>>> ERROR: ${error instanceof Error ? error.message : 'UNKNOWN ERROR'}`,
              sender: 'bot',
              time: new Date().toLocaleTimeString()
            }
            setMessages(prev => [...prev, errorReply])
          }
        }, 500)
      } catch (error) {
        setIsProcessing(false)
        const errorMessage: Message = {
          id: messages.length + 1,
          text: `>>> ENCRYPTION FAILED: ${error instanceof Error ? error.message : 'UNKNOWN ERROR'}`,
          sender: 'system',
          time: new Date().toLocaleTimeString()
        }
        setMessages([...messages, errorMessage])
      }
    } else if (!mnemonic.trim()) {
      const errorMessage: Message = {
        id: messages.length + 1,
        text: '>>> ERROR: MNEMONIC NOT SET',
        sender: 'system',
        time: new Date().toLocaleTimeString()
      }
      setMessages([...messages, errorMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEncrypt = async () => {
    if (!encryptInput.trim() || !mnemonic.trim()) {
      setEncryptOutput('>>> ERROR: INPUT OR MNEMONIC EMPTY')
      return
    }
    
    setIsProcessing(true)
    try {
      // 使用当前时间计算时间槽（每分钟一个）
      const currentTimeSlot = Math.floor(Date.now() / (1000 * 60))
      const encrypted = await encryptTextToChat({
        mnemonic,
        passphrase,
        plaintext: encryptInput,
        timeSlot: currentTimeSlot,
        msgIndex: encryptMsgIndex
      })
      setEncryptOutput(encrypted)
      setEncryptTimeSlot(currentTimeSlot)
      setEncryptMsgIndex(encryptMsgIndex + 1)
    } catch (error) {
      setEncryptOutput(`>>> ERROR: ${error instanceof Error ? error.message : 'UNKNOWN ERROR'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDecrypt = async () => {
    if (!decryptInput.trim() || !mnemonic.trim()) {
      setDecryptOutput('>>> ERROR: INPUT OR MNEMONIC EMPTY')
      return
    }
    
    setIsProcessing(true)
    try {
      // 使用配置中的时间槽
      const decrypted = await decryptChatToText({
        mnemonic,
        passphrase,
        chatText: decryptInput,
        timeSlot: timeSlot,
        msgIndex: 0
      })
      setDecryptOutput(decrypted)
    } catch (error) {
      setDecryptOutput(`>>> ERROR: ${error instanceof Error ? error.message : 'UNKNOWN ERROR'}\n>>> TIP: Check if TIME_SLOT in config matches the encryption time slot`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(`${type} copied!`)
      setTimeout(() => setCopySuccess(null), 2000)
    } catch (error) {
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopySuccess(`${type} copied!`)
        setTimeout(() => setCopySuccess(null), 2000)
      } catch (err) {
        setCopySuccess('Copy failed')
        setTimeout(() => setCopySuccess(null), 2000)
      }
      document.body.removeChild(textArea)
    }
  }

  const handleDecryptMessage = async (encryptedText: string, messageId: number) => {
    if (!mnemonic.trim()) {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        text: '>>> ERROR: MNEMONIC NOT SET',
        sender: 'system',
        time: new Date().toLocaleTimeString()
      }])
      return
    }
    
    const userMessages = messages.filter(m => m.sender === 'user' && m.encryptedText)
    const msgIdx = userMessages.findIndex(m => m.id === messageId)
    
    if (msgIdx === -1) {
      return
    }
    
    try {
      const decrypted = await decryptChatToText({
        mnemonic,
        passphrase,
        chatText: encryptedText,
        timeSlot,
        msgIndex: msgIdx
      })
      
      const reply: Message = {
        id: messages.length + 1,
        text: `>>> DECRYPTION RESULT: "${decrypted}"`,
        sender: 'bot',
        time: new Date().toLocaleTimeString()
      }
      setMessages(prev => [...prev, reply])
    } catch (error) {
      const errorReply: Message = {
        id: messages.length + 1,
        text: `>>> DECRYPTION FAILED: ${error instanceof Error ? error.message : 'UNKNOWN ERROR'}`,
        sender: 'system',
        time: new Date().toLocaleTimeString()
      }
      setMessages(prev => [...prev, errorReply])
    }
  }

  return (
    <div className="app">
      <div className="scanline"></div>
      <div className="noise"></div>
      
      <header className="app-header">
        <div className="terminal-title">
          <span className="blink">█</span>
          <h1>CHAMELEON CHAT v2.0</h1>
          <span className="blink">█</span>
        </div>
        <p className="subtitle">{'>>> SECURE ENCRYPTION SYSTEM <<<'}</p>
        <div className="status-bar">
          <span className="status-item">STATUS: <span className="status-online">ONLINE</span></span>
          <span className="status-item">ENCRYPTION: <span className="status-online">ACTIVE</span></span>
          <span className="status-item">TIME_SLOT: {timeSlot}</span>
        </div>
      </header>
      
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-content terminal-box">
            <div className="terminal-header">
              <span className="terminal-title-text">{'>>> CONFIGURATION'}</span>
              <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
            </div>
            <div className="settings-body">
              <div className="setting-item">
                <label className="terminal-label">MNEMONIC (REQUIRED):</label>
                <input
                  type="text"
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="Enter BIP39 mnemonic"
                  className="terminal-input"
                />
              </div>
              <div className="setting-item">
                <label className="terminal-label">PASSPHRASE (OPTIONAL):</label>
                <input
                  type="text"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter passphrase (optional)"
                  className="terminal-input"
                />
              </div>
              <div className="setting-item">
                <label className="terminal-label">TIME_SLOT:</label>
                <input
                  type="number"
                  value={manualTimeSlot !== null ? manualTimeSlot : timeSlot}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null
                    setManualTimeSlot(value)
                    if (value !== null) {
                      setTimeSlot(value)
                    }
                  }}
                  className="terminal-input"
                  placeholder={`Auto: ${Math.floor(Date.now() / (1000 * 60))}`}
                />
                <span className="setting-hint">(Default: Auto-updated per minute. You can set a fixed value manually)</span>
                {manualTimeSlot !== null && (
                  <button
                    onClick={() => {
                      setManualTimeSlot(null)
                      setTimeSlot(Math.floor(Date.now() / (1000 * 60)))
                    }}
                    className="terminal-btn secondary"
                    style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
                  >
                    {'>>> RESET TO AUTO'}
                  </button>
                )}
              </div>
              <div className="button-group-settings">
                <button 
                  onClick={resetToDefaults} 
                  className="terminal-btn secondary"
                >
                  {'>>> RESET TO DEFAULTS'}
                </button>
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="terminal-btn"
                >
                  {'>>> INITIALIZE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!showSettings && (
        <button 
          onClick={() => setShowSettings(true)} 
          className="settings-toggle-btn"
        >
          ⚙ CONFIG
        </button>
      )}
      
      {copySuccess && (
        <div className="copy-toast">
          <span>{copySuccess}</span>
        </div>
      )}
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          {'>>> CHAT'}
        </button>
        <button 
          className={`tab ${activeTab === 'encrypt' ? 'active' : ''}`}
          onClick={() => setActiveTab('encrypt')}
        >
          {'>>> ENCRYPT/DECRYPT'}
        </button>
      </div>
      
      {activeTab === 'chat' && (
        <div className="chat-container">
          <div className="messages terminal-box">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.sender}`}>
                <div className="message-content">
                  <span className="message-text">
                    {msg.sender === 'user' && msg.encryptedText ? (
                    <>
                      <div className="message-plaintext">{'>>> PLAINTEXT: '}{msg.text}</div>
                      <div className="message-encrypted">
                        <div className="encrypted-header">
                          <span className="encrypted-label">{'>>> ENCRYPTED:'}</span>
                          <button 
                            className="copy-btn-small"
                            onClick={() => handleCopy(msg.encryptedText!, 'Encrypted text')}
                            title="Copy encrypted text"
                          >
                            📋 COPY
                          </button>
                        </div>
                        <div className="encrypted-text">{msg.encryptedText}</div>
                      </div>
                      <button 
                        className="decrypt-btn"
                        onClick={() => handleDecryptMessage(msg.encryptedText!, msg.id)}
                      >
                        {'>>> DECRYPT'}
                      </button>
                    </>
                    ) : (
                      <pre className="terminal-text">{msg.text}</pre>
                    )}
                  </span>
                  <span className="message-time">{msg.time}</span>
                </div>
              </div>
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
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type message..."
              className="message-input terminal-input"
            />
            <button onClick={handleSend} className="send-button terminal-btn" disabled={isProcessing}>
              {isProcessing ? '>>> PROCESSING...' : '>>> SEND'}
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'encrypt' && (
        <div className="encrypt-container">
          <div className="encrypt-section terminal-box">
            <div className="section-header">
              <span className="section-title">{'>>> ENCRYPT TEXT'}</span>
            </div>
            <div className="section-body">
              <label className="terminal-label">PLAINTEXT:</label>
              <textarea
                value={encryptInput}
                onChange={(e) => setEncryptInput(e.target.value)}
                placeholder="Enter text to encrypt..."
                className="terminal-textarea"
                rows={5}
              />
              <div className="button-group">
                <button 
                  onClick={handleEncrypt} 
                  className="terminal-btn"
                  disabled={isProcessing}
                >
                  {isProcessing ? '>>> PROCESSING...' : '>>> ENCRYPT'}
                </button>
                <button 
                  onClick={() => {
                    setEncryptInput('')
                    setEncryptOutput('')
                    setEncryptTimeSlot(null)
                  }}
                  className="terminal-btn secondary"
                >
                  {'>>> CLEAR'}
                </button>
              </div>
              <div className="output-header">
                <label className="terminal-label">ENCRYPTED OUTPUT:</label>
                {encryptOutput && (
                  <button 
                    className="copy-btn"
                    onClick={() => handleCopy(encryptOutput, 'Encrypted text')}
                    title="Copy encrypted text"
                  >
                    📋 COPY
                  </button>
                )}
              </div>
              {encryptTimeSlot !== null && (
                <div className="time-slot-info">
                  <div className="time-slot-display">
                    <span className="terminal-label">ENCRYPTION TIME:</span>
                    <span className="time-value">{new Date(encryptTimeSlot * 60 * 1000).toLocaleString()}</span>
                  </div>
                  <div className="time-slot-display">
                    <span className="terminal-label">TIME_SLOT:</span>
                    <span className="time-value">{encryptTimeSlot}</span>
                  </div>
                  <span className="setting-hint">
                    Message expires at: {new Date((encryptTimeSlot + 1) * 60 * 1000).toLocaleString()}
                    <br />
                    Use TIME_SLOT {encryptTimeSlot} for decryption if message is older than 1 minute
                  </span>
                </div>
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
                onChange={(e) => setDecryptInput(e.target.value)}
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
                  onClick={handleDecrypt} 
                  className="terminal-btn"
                  disabled={isProcessing}
                >
                  {isProcessing ? '>>> PROCESSING...' : '>>> DECRYPT'}
                </button>
                <button 
                  onClick={() => {
                    setDecryptInput('')
                    setDecryptOutput('')
                  }}
                  className="terminal-btn secondary"
                >
                  {'>>> CLEAR'}
                </button>
              </div>
              <div className="output-header">
                <label className="terminal-label">DECRYPTED OUTPUT:</label>
                {decryptOutput && decryptOutput !== '>>> Waiting for input...' && !decryptOutput.startsWith('>>> ERROR') && (
                  <button 
                    className="copy-btn"
                    onClick={() => handleCopy(decryptOutput, 'Decrypted text')}
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
      )}
    </div>
  )
}

export default App
