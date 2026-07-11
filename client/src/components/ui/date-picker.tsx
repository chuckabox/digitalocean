import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { sessionEvents } from '../../data/sessions'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function DatePicker({ value, onChange, max }: { value: string; onChange: (date: string) => void; max?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(value + 'T12:00:00')
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const daysInMonth = new Date(currentDate.year, currentDate.month + 1, 0).getDate()
  const firstDay = new Date(currentDate.year, currentDate.month, 1).getDay()
  
  const handlePrev = () => {
    setCurrentDate(prev => {
      let m = prev.month - 1
      let y = prev.year
      if (m < 0) { m = 11; y-- }
      return { year: y, month: m }
    })
  }
  
  const handleNext = () => {
    setCurrentDate(prev => {
      let m = prev.month + 1
      let y = prev.year
      if (m > 11) { m = 0; y++ }
      return { year: y, month: m }
    })
  }

  const handleSelect = (day: number) => {
    const m = String(currentDate.month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    const iso = `${currentDate.year}-${m}-${d}`
    if (max && iso > max) return
    onChange(iso)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 font-mono text-[13px] font-medium text-ink bg-white border border-rule rounded-xl py-2.5 px-4 cursor-pointer hover:border-ink-3 transition-colors shadow-sm"
      >
        <CalendarIcon size={16} className="text-ink-3" />
        <span>{value}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-2 p-5 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-rule z-50 w-[300px]"
          >
            <div className="flex items-center justify-between mb-5">
              <button onClick={handlePrev} className="p-1.5 hover:bg-paper-2 rounded-full text-ink-2 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <div className="font-sans text-[15px] font-medium text-ink">
                {MONTHS[currentDate.month]} {currentDate.year}
              </div>
              <button onClick={handleNext} className="p-1.5 hover:bg-paper-2 rounded-full text-ink-2 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 text-center mb-3">
              {DOW.map(d => (
                <div key={d} className="font-mono text-[10px] text-ink-3 uppercase tracking-wider font-semibold">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const m = String(currentDate.month + 1).padStart(2, '0')
                const d = String(day).padStart(2, '0')
                const iso = `${currentDate.year}-${m}-${d}`
                
                const isSelected = iso === value
                const isFuture = !!max && iso > max
                const hasSession = !!sessionEvents[iso]
                
                return (
                  <button
                    key={day}
                    disabled={isFuture}
                    onClick={() => handleSelect(day)}
                    className={`relative w-9 h-9 mx-auto flex items-center justify-center rounded-full text-[14px] font-medium transition-all ${
                      isSelected 
                        ? 'bg-ink text-white shadow-md' 
                        : isFuture 
                          ? 'text-rule-strong cursor-not-allowed opacity-50' 
                          : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
                    }`}
                  >
                    {day}
                    {hasSession && !isSelected && (
                      <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-accent" />
                    )}
                    {hasSession && isSelected && (
                      <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-white/60" />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
