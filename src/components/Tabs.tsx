import React from 'react'
import { TabType } from '../types'

interface TabsProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="tabs">
      <button
        className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
        onClick={() => onTabChange('chat')}
      >
        {'>>> CHAT'}
      </button>
      <button
        className={`tab ${activeTab === 'encrypt' ? 'active' : ''}`}
        onClick={() => onTabChange('encrypt')}
      >
        {'>>> ENCRYPT/DECRYPT'}
      </button>
    </div>
  )
}
