import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface LiveViewProps {
  onGoToTimeline: () => void
}

function BarTrack({ width, variant }: { width: number; variant: string }) {
  const colors: Record<string, string> = {
    accent: 'bg-accent',
    alert: 'bg-alert',
    positive: 'bg-positive',
  }
  return (
    <div className="flex-1 h-[5px] bg-bar-track rounded-[1px] overflow-hidden">
      <motion.div
        className={`h-full ${colors[variant] ?? 'bg-accent'}`}
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  )
}

function AudioMeter({
  label,
  value,
  bandLeft,
  bandWidth,
  markerLeft,
  status,
  warn,
}: {
  label: string
  value: string
  bandLeft: number
  bandWidth: number
  markerLeft: number
  status: string
  warn?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[13px] text-ink-2">{label}</span>
        <span className={`font-mono text-[13px] font-medium ${warn ? 'text-alert' : 'text-ink'}`}>
          {value}
        </span>
      </div>
      <div className="relative h-2 bg-bar-track rounded-[1px]">
        <div
          className={`absolute top-0 h-full rounded-[1px] ${warn ? 'bg-alert-soft' : 'bg-accent-soft'}`}
          style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
        />
        <motion.div
          className={`absolute -top-0.5 w-0.5 h-3 rounded-[1px] -translate-x-px ${warn ? 'bg-alert' : 'bg-ink'}`}
          initial={{ left: '50%' }}
          animate={{ left: `${markerLeft}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className={`font-mono text-[10px] tracking-[0.02em] ${warn ? 'text-alert' : 'text-ink-3'}`}>
        {status}
      </span>
    </div>
  )
}

export default function LiveView({ onGoToTimeline }: LiveViewProps) {
  const [videoSource, setVideoSource] = useState<'none' | 'camera' | 'clip'>('none')
  const [clipUrl, setClipUrl] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setVideoSource('camera')
      setIsScanning(true)
    } catch (err) {
      console.error("Error accessing camera:", err)
      alert("Could not access camera. Please check permissions.")
    }
  }

  const handleStopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setVideoSource('none')
    setIsScanning(false)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setClipUrl(url)
      setVideoSource('clip')
      setIsScanning(false)
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
        videoRef.current.srcObject = null
      }
    }
  }

  const handleClearClip = () => {
    if (clipUrl) {
      URL.revokeObjectURL(clipUrl)
    }
    setClipUrl(null)
    setVideoSource('none')
    setIsScanning(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleScanClip = () => {
    setIsScanning(true)
    if (videoRef.current) {
      videoRef.current.play()
    }
  }

  return (
    <section>
      <div className="mb-[26px]">
        <h2 className="text-[26px] font-light tracking-tight leading-[1.25]">Live session</h2>
        <p className="font-mono text-xs text-ink-3 mt-1">
          real-time cue reading · camera and audio stay on this device
        </p>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-10 items-start max-[900px]:grid-cols-1">
        {/* Camera */}
        <div className="flex flex-col gap-3.5">
          <div className="aspect-[4/3] bg-paper-2 border border-rule rounded-[2px] flex items-center justify-center relative overflow-hidden">
            {videoSource === 'none' && (
              <div className="text-center p-6">
                <div className="mb-3">
                  <svg viewBox="0 0 24 24" className="w-[30px] h-[30px] stroke-ink-3 fill-none mx-auto" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="15" height="13" rx="1" />
                    <path d="M17 10l4-2.5v9L17 14" />
                  </svg>
                </div>
                <p className="text-[15px] font-medium text-ink-2 mb-0.5">Camera feed</p>
                <p className="font-mono text-xs text-ink-3">press start to begin reading</p>
              </div>
            )}
            
            <video
              ref={videoRef}
              autoPlay={videoSource === 'camera'}
              muted={videoSource === 'camera'}
              controls={videoSource === 'clip'}
              src={videoSource === 'clip' && clipUrl ? clipUrl : undefined}
              className={`w-full h-full ${videoSource === 'clip' ? 'object-contain bg-black' : 'object-cover'} ${videoSource === 'none' ? 'hidden' : 'block'}`}
              playsInline
            />
          </div>
          
          <input 
            type="file" 
            accept="video/*" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />

          <div className="flex gap-2.5">
            {videoSource === 'none' && (
              <>
                <Button variant="primary" className="flex-1" onClick={handleStartCamera}>Start Live Camera</Button>
                <Button variant="default" className="flex-1" onClick={handleUploadClick}>Upload Clip</Button>
              </>
            )}
            
            {videoSource === 'camera' && (
              <Button variant="outline" className="flex-1 text-alert border-alert/20 hover:bg-alert/10" onClick={handleStopCamera}>
                Stop Camera
              </Button>
            )}

            {videoSource === 'clip' && (
              <>
                <Button variant="primary" className="flex-1" onClick={handleScanClip} disabled={isScanning}>
                  {isScanning ? 'Scanning...' : 'Scan Clip'}
                </Button>
                <Button variant="default" className="flex-1" onClick={handleClearClip}>Clear Clip</Button>
              </>
            )}
          </div>
        </div>

        {/* Panels */}
        <div className="flex flex-col gap-[26px]">
          {/* Detected Face */}
          <Card>
            <CardHeader>
              <CardTitle>Detected Face</CardTitle>
              <CardDescription>1 subject</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 border border-rule rounded-[2px] bg-paper-2 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]">
                    <circle cx="12" cy="9" r="4" fill="none" stroke="currentColor" className="text-ink-3" strokeWidth="1.25" />
                    <ellipse cx="12" cy="21" rx="7" ry="5.5" fill="none" stroke="currentColor" className="text-ink-3" strokeWidth="1.25" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-ink-2 mb-1.5">Confidence</div>
                  <div className="flex items-center gap-3">
                    <BarTrack width={78} variant="accent" />
                    <span className="font-mono text-xs font-medium text-ink min-w-[36px] text-right">78%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interpretation */}
          <Card>
            <CardHeader>
              <CardTitle>Interpretation</CardTitle>
              <CardDescription>2s ago</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-[1.75] font-light">
                She crossed her arms and is giving shorter answers. This often signals{' '}
                <Badge variant="accent">disengagement</Badge>{' '}
                or discomfort with the current topic. Consider shifting to an open-ended question.
              </p>
              <Badge variant="accent" className="mt-3.5">disengagement</Badge>
            </CardContent>
          </Card>

          {/* Signals + Audio side by side */}
          <div className="grid grid-cols-2 gap-8 max-[560px]:grid-cols-1 max-[560px]:gap-[26px]">
            <Card>
              <CardHeader>
                <CardTitle>Signals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3.5">
                  {signalRows.map((s) => (
                    <div key={s.label} className="grid grid-cols-[88px_1fr_40px] items-center gap-2.5">
                      <span className="text-[13px] text-ink-2">{s.label}</span>
                      <BarTrack width={s.width} variant={s.variant as 'positive' | 'alert' | 'accent'} />
                      <span className="font-mono text-xs font-medium text-ink min-w-[36px] text-right">{s.width}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Audio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <AudioMeter label="Tone variation" value="12%" bandLeft={15} bandWidth={55} markerLeft={12} status="below typical range (15–70%)" />
                  <AudioMeter label="Pace" value="96 wpm" bandLeft={20} bandWidth={47} markerLeft={16} status="slowing · typical 120–180 wpm" warn />
                  <AudioMeter label="Volume" value="58%" bandLeft={30} bandWidth={40} markerLeft={58} status="dropping · was 74% at start" warn />
                </div>
                <p className="font-mono text-[10px] text-ink-3 leading-normal mt-2.5 pt-2.5 border-t border-rule">
                  Typical range is a guide, not a goal. Being outside it isn't bad on its own — it's a cue to notice.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Live Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <Button variant="link" size="sm" onClick={onGoToTimeline} className="text-xs p-0">View full timeline</Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                {[
                  { time: '0:18', desc: 'Vocal pace slowing, volume drop', chan: 'Audio', kind: 'Note', kindVariant: 'default' as const },
                  { time: '0:12', desc: 'Disengagement signals detected', chan: 'Visual', kind: 'Friction', kindVariant: 'alert' as const },
                  { time: '0:08', desc: 'Active listening, leaning in', chan: 'Visual', kind: 'Highlight', kindVariant: 'positive' as const },
                ].map((ev, i, arr) => (
                  <div
                    key={ev.time}
                    className={`grid grid-cols-[46px_1fr_auto] gap-3 py-[11px] items-center ${i < arr.length - 1 ? 'border-b border-rule' : ''} ${i === 0 ? 'pt-0' : ''} ${i === arr.length - 1 ? 'pb-0' : ''}`}
                  >
                    <span className="font-mono text-xs text-ink-3">{ev.time}</span>
                    <span className="text-[13px] leading-normal">{ev.desc}</span>
                    <span className="flex gap-1.5">
                      <Badge size="sm" className="border border-rule">{ev.chan}</Badge>
                      <Badge variant={ev.kindVariant} size="sm">{ev.kind}</Badge>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
