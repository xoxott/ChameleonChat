import React from 'react'

interface HeaderProps {
  timeSlot: number
}

export const Header: React.FC<HeaderProps> = ({ timeSlot }) => {
  return (
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
  )
}
