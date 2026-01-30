import React from 'react'

interface CopyToastProps {
  message: string | null
}

export const CopyToast: React.FC<CopyToastProps> = ({ message }) => {
  if (!message) return null

  return (
    <div className="copy-toast">
      <span>{message}</span>
    </div>
  )
}
