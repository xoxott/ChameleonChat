import { useState } from 'react'

export function useCopy() {
  const [copySuccess, setCopySuccess] = useState<string | null>(null)

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showSuccess(`${type} copied!`)
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
        showSuccess(`${type} copied!`)
      } catch (err) {
        showSuccess('Copy failed')
      }
      document.body.removeChild(textArea)
    }
  }

  const showSuccess = (message: string) => {
    setCopySuccess(message)
    setTimeout(() => setCopySuccess(null), 2000)
  }

  return { copySuccess, copyToClipboard }
}
