import { useState, useEffect, useRef } from 'react'
import { encryptTextToChat, decryptChatToText, initRatchet, getCurrentRatchetTimeSlot } from './utils/chatCrypto'
import { decryptWithRetry } from './utils/decryptUtils'
import { createMessage, createErrorMessage, createSuccessMessage } from './utils/messageUtils'
import { useTimeSlot } from './hooks/useTimeSlot'
import { useCopy } from './hooks/useCopy'
import { DEFAULT_MNEMONIC, DEFAULT_PASSPHRASE, getDefaultTimeSlot } from './constants'
import { getCurrentTimeSlot } from './utils/timeUtils'
import { syncTime } from './utils/syncTime'
import { Message, TabType, Config } from './types'
import { Header } from './components/Header'
import { SettingsPanel } from './components/SettingsPanel'
import { Tabs } from './components/Tabs'
import { ChatTab } from './components/ChatTab'
import { EncryptTab } from './components/EncryptTab'
import { CopyToast } from './components/CopyToast'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat')
  const [messages, setMessages] = useState<Message[]>([
    createMessage('>>> SYSTEM INITIALIZED\n>>> CHAMELEON CHAT \n>>> ENCRYPTION MODULE LOADED', 'system')
  ])
  const [inputValue, setInputValue] = useState('')
  const [showSettings, setShowSettings] = useState(true)
  const [msgIndex, setMsgIndex] = useState(0)

  // 配置状态
  const [config, setConfig] = useState<Config>({
    mnemonic: DEFAULT_MNEMONIC,
    passphrase: DEFAULT_PASSPHRASE,
    timeSlot: getDefaultTimeSlot(),
    manualTimeSlot: null
  })

  // 时间槽管理
  const { timeSlot, manualTimeSlot, setTimeSlot, setManualTimeSlot } = useTimeSlot(getDefaultTimeSlot())

  // 同步时间槽到配置
  useEffect(() => {
    setConfig(prev => ({ ...prev, timeSlot, manualTimeSlot }))
  }, [timeSlot, manualTimeSlot])

  // 统一时间源：应用加载时后台同步，减少首次加密时的等待
  useEffect(() => {
    syncTime().catch(() => {})
  }, [])

  // 加密工具状态
  const [encryptInput, setEncryptInput] = useState('')
  const [encryptOutput, setEncryptOutput] = useState('')
  const [encryptTimeSlot, setEncryptTimeSlot] = useState<number | null>(null)
  const [encryptTimestamp, setEncryptTimestamp] = useState<number | null>(null) // 实际加密时间戳
  const [encryptMsgIndexUsed, setEncryptMsgIndexUsed] = useState<number | null>(null) // 加密时使用的msgIndex
  const [decryptInput, setDecryptInput] = useState('')
  const [decryptOutput, setDecryptOutput] = useState('')
  const [encryptMsgIndex, setEncryptMsgIndex] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // 复制功能
  const { copySuccess, copyToClipboard } = useCopy()
  const mountedRef = useRef(true)
  useEffect(() => () => { mountedRef.current = false }, [])

  // 重置到默认配置
  const resetToDefaults = () => {
    const newConfig = {
      mnemonic: DEFAULT_MNEMONIC,
      passphrase: DEFAULT_PASSPHRASE,
      timeSlot: getCurrentTimeSlot(),
      manualTimeSlot: null
    }
    setConfig(newConfig)
    setTimeSlot(newConfig.timeSlot)
    setManualTimeSlot(null)
  }

  // 处理配置变更
  const handleConfigChange = (changes: Partial<Config>) => {
    setConfig(prev => {
      const updated = { ...prev, ...changes }
      if (changes.timeSlot !== undefined) {
        setTimeSlot(changes.timeSlot)
      }
      if (changes.manualTimeSlot !== undefined) {
        setManualTimeSlot(changes.manualTimeSlot)
      }
      return updated
    })
  }

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || !config.mnemonic.trim()) {
      if (!config.mnemonic.trim()) {
        setMessages(prev => [...prev, createErrorMessage('MNEMONIC NOT SET')])
      }
      return
    }

    setIsProcessing(true)
    try {
      await initRatchet(config.mnemonic, config.passphrase)
      const encryptedText = await encryptTextToChat(inputValue, msgIndex)

      const currentMsgIndex = msgIndex
      const newMessage = createMessage(inputValue, 'user', encryptedText)
      setMessages(prev => [...prev, newMessage])
      setInputValue('')
      setMsgIndex(currentMsgIndex + 1)
      setIsProcessing(false)

      // 自动解密演示（延迟避免阻塞 UI）
      setTimeout(async () => {
        try {
          const decryptedText = await decryptWithRetry(encryptedText)
          if (mountedRef.current) {
            setMessages(prev => [...prev, createSuccessMessage(`DECRYPTION SUCCESS\n>>> MESSAGE: "${decryptedText}"`)])
          }
        } catch (error) {
          if (mountedRef.current) {
            setMessages(prev => [...prev, createErrorMessage(error instanceof Error ? error.message : 'UNKNOWN ERROR')])
          }
        }
      }, 500)
    } catch (error) {
      setIsProcessing(false)
      setMessages(prev => [...prev, createErrorMessage(`ENCRYPTION FAILED: ${error instanceof Error ? error.message : 'UNKNOWN ERROR'}`)])
    }
  }

  // 加密文本
  const handleEncrypt = async () => {
    if (!encryptInput.trim() || !config.mnemonic.trim()) {
      setEncryptOutput('>>> ERROR: INPUT OR MNEMONIC EMPTY')
      return
    }

    setIsProcessing(true)
    try {
      await initRatchet(config.mnemonic, config.passphrase)
      const currentTimeSlot = getCurrentRatchetTimeSlot() ?? getCurrentTimeSlot()
      const encryptTime = Date.now()
      const encrypted = await encryptTextToChat(encryptInput, encryptMsgIndex)
      setEncryptOutput(encrypted)
      setEncryptTimeSlot(currentTimeSlot)
      setEncryptTimestamp(encryptTime) // 记录加密时间戳
      setEncryptMsgIndexUsed(encryptMsgIndex) // 记录使用的msgIndex
      setEncryptMsgIndex(encryptMsgIndex + 1)
    } catch (error) {
      setEncryptOutput(`>>> ERROR: ${error instanceof Error ? error.message : 'UNKNOWN ERROR'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // 解密文本
  const handleDecrypt = async () => {
    if (!decryptInput.trim() || !config.mnemonic.trim()) {
      setDecryptOutput('>>> ERROR: INPUT OR MNEMONIC EMPTY')
      return
    }

    setIsProcessing(true)
    try {
      await initRatchet(config.mnemonic, config.passphrase)
      const decrypted = await decryptWithRetry(decryptInput)
      setDecryptOutput(decrypted)
    } catch (error) {
      setDecryptOutput(`>>> ERROR: ${error instanceof Error ? error.message : 'UNKNOWN ERROR'}\n>>> Tried multiple time slots and msg indices but decryption failed`)
    } finally {
      setIsProcessing(false)
    }
  }

  // 解密消息（Ratchet 内部会尝试当前槽与上一槽 + msgIndex 0..10）
  const handleDecryptMessage = async (encryptedText: string, _messageId?: number) => {
    if (!config.mnemonic.trim()) {
      setMessages(prev => [...prev, createErrorMessage('MNEMONIC NOT SET')])
      return
    }
    try {
      await initRatchet(config.mnemonic, config.passphrase)
      const decrypted = await decryptChatToText(encryptedText)
      setMessages(prev => [...prev, createSuccessMessage(`DECRYPTION RESULT: "${decrypted}"`)])
    } catch (error) {
      setMessages(prev => [...prev, createErrorMessage(`DECRYPTION FAILED: ${error instanceof Error ? error.message : 'UNKNOWN ERROR'}`)])
    }
  }

  return (
    <div className="app">
      <div className="scanline"></div>
      <div className="noise"></div>

      <Header timeSlot={getCurrentRatchetTimeSlot() ?? timeSlot} />

      {showSettings && (
        <SettingsPanel
          config={{ ...config, timeSlot, manualTimeSlot }}
          onConfigChange={handleConfigChange}
          onClose={() => setShowSettings(false)}
          onReset={resetToDefaults}
        />
      )}

      {!showSettings && (
        <button
          onClick={() => setShowSettings(true)}
          className="settings-toggle-btn"
        >
          ⚙ CONFIG
        </button>
      )}

      <CopyToast message={copySuccess} />

      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'chat' && (
        <ChatTab
          messages={messages}
          inputValue={inputValue}
          isProcessing={isProcessing}
          onInputChange={setInputValue}
          onSend={handleSend}
          onCopy={copyToClipboard}
          onDecryptMessage={handleDecryptMessage}
        />
      )}

      {activeTab === 'encrypt' && (
        <EncryptTab
          encryptInput={encryptInput}
          encryptOutput={encryptOutput}
          encryptTimeSlot={encryptTimeSlot}
          encryptTimestamp={encryptTimestamp}
          encryptMsgIndexUsed={encryptMsgIndexUsed}
          decryptInput={decryptInput}
          decryptOutput={decryptOutput}
          timeSlot={getCurrentRatchetTimeSlot() ?? timeSlot}
          isProcessing={isProcessing}
          onEncryptInputChange={setEncryptInput}
          onDecryptInputChange={setDecryptInput}
          onEncrypt={handleEncrypt}
          onDecrypt={handleDecrypt}
          onClearEncrypt={() => {
            setEncryptInput('')
            setEncryptOutput('')
            setEncryptTimeSlot(null)
            setEncryptTimestamp(null)
            setEncryptMsgIndexUsed(null)
          }}
          onClearDecrypt={() => {
            setDecryptInput('')
            setDecryptOutput('')
          }}
          onCopy={copyToClipboard}
        />
      )}
    </div>
  )
}

export default App
