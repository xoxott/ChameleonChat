import { useState, useEffect } from 'react'
import { getCurrentTimeSlot } from '../constants'

export function useTimeSlot(initialTimeSlot: number) {
  const [timeSlot, setTimeSlot] = useState(initialTimeSlot)
  const [manualTimeSlot, setManualTimeSlot] = useState<number | null>(null)

  useEffect(() => {
    if (manualTimeSlot !== null) {
      setTimeSlot(manualTimeSlot)
      return
    }
    
    const updateTimeSlot = () => {
      setTimeSlot(getCurrentTimeSlot())
    }
    
    updateTimeSlot()
    const interval = setInterval(updateTimeSlot, 60 * 1000)
    
    return () => clearInterval(interval)
  }, [manualTimeSlot])

  return {
    timeSlot,
    manualTimeSlot,
    setTimeSlot,
    setManualTimeSlot
  }
}
