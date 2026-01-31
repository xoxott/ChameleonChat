import { useState, useEffect, useRef } from 'react'

export function useCopy() {
  const [copySuccess, setCopySuccess] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showSuccess(`${type} copied!`)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        showSuccess(`${type} copied!`)
      } catch {
        showSuccess('Copy failed')
      }
      document.body.removeChild(textArea)
    }
  }

  const showSuccess = (message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setCopySuccess(message)
    timerRef.current = setTimeout(() => {
      setCopySuccess(null)
      timerRef.current = null
    }, 2000)
  }

  return { copySuccess, copyToClipboard }
}
