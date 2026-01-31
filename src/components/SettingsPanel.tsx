import React from 'react'
import { Config } from '../types'
import { DEFAULT_MNEMONIC, DEFAULT_PASSPHRASE } from '../constants'
import { getCurrentTimeSlot } from '../utils/timeUtils'

interface SettingsPanelProps {
  config: Config
  onConfigChange: (config: Partial<Config>) => void
  onClose: () => void
  onReset: () => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  config,
  onConfigChange,
  onClose,
  onReset
}) => {
  return (
    <div className="settings-panel">
      <div className="settings-content terminal-box">
        <div className="terminal-header">
          <span className="terminal-title-text">{'>>> CONFIGURATION'}</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="settings-body">
          <div className="setting-item">
            <label className="terminal-label">MNEMONIC (REQUIRED):</label>
            <input
              type="text"
              value={config.mnemonic}
              onChange={(e) => onConfigChange({ mnemonic: e.target.value })}
              placeholder="Enter BIP39 mnemonic"
              className="terminal-input"
            />
          </div>
          <div className="setting-item">
            <label className="terminal-label">PASSPHRASE (OPTIONAL):</label>
            <input
              type="text"
              value={config.passphrase}
              onChange={(e) => onConfigChange({ passphrase: e.target.value })}
              placeholder="Enter passphrase (optional)"
              className="terminal-input"
            />
          </div>
          <div className="setting-item">
            <label className="terminal-label">TIME_SLOT:</label>
            <input
              type="number"
              value={config.manualTimeSlot !== null ? config.manualTimeSlot : config.timeSlot}
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value) : null
                onConfigChange({ manualTimeSlot: value })
                if (value !== null) {
                  onConfigChange({ timeSlot: value })
                }
              }}
              className="terminal-input"
              placeholder={`Auto: ${getCurrentTimeSlot()}`}
            />
            <span className="setting-hint">(Default: Auto-updated per minute. You can set a fixed value manually)</span>
            {config.manualTimeSlot !== null && (
              <button
                onClick={() => {
                  onConfigChange({ manualTimeSlot: null })
                  onConfigChange({ timeSlot: getCurrentTimeSlot() })
                }}
                className="terminal-btn secondary"
                style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
              >
                {'>>> RESET TO AUTO'}
              </button>
            )}
          </div>
          <div className="button-group-settings">
            <button onClick={onReset} className="terminal-btn secondary">
              {'>>> RESET TO DEFAULTS'}
            </button>
            <button onClick={onClose} className="terminal-btn">
              {'>>> INITIALIZE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
