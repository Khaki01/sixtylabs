"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Play, Pause, Volume2 } from "lucide-react"

// This will be a local file - user should place their demo audio in /public/demo-audio.mp3
const AUDIO_URL = "/demo-audio.mp3"

export function LandingAudioDemo() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [effects, setEffects] = useState({
    granular: false,
    reverb: false,
    reverse: false,
  })

  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Master output
  const masterGainRef = useRef<GainNode | null>(null)

  // Dry signal (no effects)
  const dryGainRef = useRef<GainNode | null>(null)

  // Granular refs
  const granularGainRef = useRef<GainNode | null>(null)
  const grainSchedulerRef = useRef<number | null>(null)
  const nextGrainTimeRef = useRef<number>(0)
  const granularActiveRef = useRef(false)

  // Reverb refs
  const reverbInputRef = useRef<GainNode | null>(null)
  const reverbOutputRef = useRef<GainNode | null>(null)
  const reverbWetGainRef = useRef<GainNode | null>(null)

  // Store effects state in ref for real-time access
  const effectsRef = useRef(effects)
  useEffect(() => {
    effectsRef.current = effects
  }, [effects])

  // Load audio and initialize all nodes on mount
  useEffect(() => {
    const initAudio = async () => {
      try {
        const ctx = new AudioContext()
        audioContextRef.current = ctx

        // Create master output
        masterGainRef.current = ctx.createGain()
        masterGainRef.current.gain.value = 0.8
        masterGainRef.current.connect(ctx.destination)

        // Create dry gain (for when no effects are on)
        dryGainRef.current = ctx.createGain()
        dryGainRef.current.gain.value = 1
        dryGainRef.current.connect(masterGainRef.current)

        // Create granular output gain
        granularGainRef.current = ctx.createGain()
        granularGainRef.current.gain.value = 0
        granularGainRef.current.connect(masterGainRef.current)

        // Create reverb chain
        reverbInputRef.current = ctx.createGain()
        reverbOutputRef.current = ctx.createGain()
        reverbWetGainRef.current = ctx.createGain()
        reverbWetGainRef.current.gain.value = 0

        // Build reverb network
        const delays: DelayNode[] = []
        const gains: GainNode[] = []
        const filters: BiquadFilterNode[] = []
        const baseTimes = [0.0297, 0.0371, 0.0411, 0.0437, 0.0521, 0.0617, 0.0719, 0.0823]

        for (let i = 0; i < 8; i++) {
          delays.push(ctx.createDelay(5.0))
          gains.push(ctx.createGain())
          filters.push(ctx.createBiquadFilter())
          delays[i].delayTime.value = baseTimes[i] * 5.0
          gains[i].gain.value = 0.55
          filters[i].type = "lowpass"
          filters[i].frequency.value = 1800
          filters[i].Q.value = 0.5
        }

        delays.forEach((delay, i) => {
          reverbInputRef.current!.connect(delay)
          delay.connect(filters[i])
          filters[i].connect(gains[i])
          gains[i].connect(reverbOutputRef.current!)
          gains[i].connect(delays[(i + 1) % delays.length])
        })

        reverbOutputRef.current.connect(reverbWetGainRef.current)
        reverbWetGainRef.current.connect(masterGainRef.current)

        // Fetch audio
        const response = await fetch(AUDIO_URL)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
        audioBufferRef.current = audioBuffer

        setDuration(audioBuffer.duration)
        setIsLoading(false)
        setTimeout(() => drawWaveform(), 100)
      } catch (error) {
        console.error("Error initializing audio:", error)
        setIsLoading(false)
      }
    }

    initAudio()

    return () => {
      if (grainSchedulerRef.current) cancelAnimationFrame(grainSchedulerRef.current)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Update effect gains when effects change (works in real-time without restarting)
  useEffect(() => {
    const ctx = audioContextRef.current
    if (!ctx) return

    const now = ctx.currentTime

    // Granular gain
    if (granularGainRef.current) {
      granularGainRef.current.gain.setTargetAtTime(effects.granular ? 1 : 0, now, 0.05)
    }
    granularActiveRef.current = effects.granular

    // Reverb wet gain
    if (reverbWetGainRef.current) {
      reverbWetGainRef.current.gain.setTargetAtTime(effects.reverb ? 0.6 : 0, now, 0.05)
    }

    if (dryGainRef.current) {
      let dryValue = 1
      // When granular is on, mute dry completely (granular replaces the signal)
      if (effects.granular) {
        dryValue = 0
      }
      // When only reverb is on, keep dry at full (reverb adds to it)
      else if (effects.reverb) {
        dryValue = 1
      }
      dryGainRef.current.gain.setTargetAtTime(dryValue, now, 0.05)
    }
  }, [effects])

  // Handle reverse - FIXED VERSION (keeps visual position)
  useEffect(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return

    // Keep the current visual time the same
    const currentVisualTime = currentTime

    if (isPlaying) {
      pauseAudio()
      // Convert the pauseTime to keep same visual position
      const newPauseTime = duration - pauseTimeRef.current
      pauseTimeRef.current = newPauseTime
      setTimeout(() => playAudio(), 50)
    } else {
      // When paused, just convert pauseTime
      const newPauseTime = duration - pauseTimeRef.current
      pauseTimeRef.current = newPauseTime
      setCurrentTime(currentVisualTime)
    }
  }, [effects.reverse])

  const scheduleGrains = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current || !granularGainRef.current) return
    if (!granularActiveRef.current) {
      grainSchedulerRef.current = requestAnimationFrame(scheduleGrains)
      return
    }

    const ctx = audioContextRef.current
    const buffer = audioBufferRef.current
    const lookahead = 0.1
    const grainSize = 0.08

    while (nextGrainTimeRef.current < ctx.currentTime + lookahead) {
      const elapsed = ctx.currentTime - startTimeRef.current + pauseTimeRef.current
      const chaos = (Math.random() * 2 - 1) * 0.3
      let grainPosition = elapsed + chaos

      grainPosition = Math.max(0, Math.min(buffer.duration - grainSize, grainPosition))

      const grainSource = ctx.createBufferSource()
      grainSource.buffer = buffer
      grainSource.playbackRate.value = 0.9 + Math.random() * 0.2

      const grainGain = ctx.createGain()
      grainGain.gain.setValueAtTime(0, nextGrainTimeRef.current)
      grainGain.gain.linearRampToValueAtTime(0.7, nextGrainTimeRef.current + grainSize * 0.3)
      grainGain.gain.linearRampToValueAtTime(0, nextGrainTimeRef.current + grainSize)

      grainSource.connect(grainGain)
      grainGain.connect(granularGainRef.current)

      grainSource.start(nextGrainTimeRef.current, grainPosition, grainSize + 0.02)

      nextGrainTimeRef.current += grainSize * 0.4
    }

    grainSchedulerRef.current = requestAnimationFrame(scheduleGrains)
  }, [])

  const updateTime = useCallback(() => {
    if (!audioContextRef.current) return

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current

    // FIXED: Calculate visual time correctly
    const visualTime = effectsRef.current.reverse ? duration - elapsed : elapsed

    setCurrentTime(Math.max(0, Math.min(visualTime, duration)))

    if (elapsed < duration) {
      animationFrameRef.current = requestAnimationFrame(updateTime)
    } else {
      setIsPlaying(false)
      setCurrentTime(effectsRef.current.reverse ? duration : 0)
      pauseTimeRef.current = 0
    }
  }, [duration])

  const playAudio = async () => {
    if (!audioContextRef.current || !audioBufferRef.current) return

    const ctx = audioContextRef.current

    if (ctx.state === "suspended") {
      await ctx.resume()
    }

    // Create reversed buffer if needed
    let bufferToPlay = audioBufferRef.current
    if (effectsRef.current.reverse) {
      const reversedBuffer = ctx.createBuffer(
        audioBufferRef.current.numberOfChannels,
        audioBufferRef.current.length,
        audioBufferRef.current.sampleRate
      )
      for (let channel = 0; channel < audioBufferRef.current.numberOfChannels; channel++) {
        const sourceData = audioBufferRef.current.getChannelData(channel)
        const reversedData = reversedBuffer.getChannelData(channel)
        for (let i = 0; i < sourceData.length; i++) {
          reversedData[i] = sourceData[sourceData.length - 1 - i]
        }
      }
      bufferToPlay = reversedBuffer
    }

    // Create new source
    sourceNodeRef.current = ctx.createBufferSource()
    sourceNodeRef.current.buffer = bufferToPlay

    // Dry path - always connected, gain controls if it's heard
    sourceNodeRef.current.connect(dryGainRef.current!)

    // Reverb path
    sourceNodeRef.current.connect(reverbInputRef.current!)

    // Start granular scheduler
    granularActiveRef.current = effectsRef.current.granular
    nextGrainTimeRef.current = ctx.currentTime
    grainSchedulerRef.current = requestAnimationFrame(scheduleGrains)

    sourceNodeRef.current.onended = () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }

    startTimeRef.current = ctx.currentTime

    // Start from pauseTime in the reversed buffer
    sourceNodeRef.current.start(0, Math.max(0, pauseTimeRef.current))

    setIsPlaying(true)
    animationFrameRef.current = requestAnimationFrame(updateTime)
  }

  const pauseAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current.disconnect()
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    if (grainSchedulerRef.current) {
      cancelAnimationFrame(grainSchedulerRef.current)
    }
    const elapsed = audioContextRef.current
      ? audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current
      : pauseTimeRef.current
    pauseTimeRef.current = Math.min(elapsed, duration)
    setIsPlaying(false)
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio()
    } else {
      playAudio()
    }
  }

  const toggleEffect = (effect: "granular" | "reverb" | "reverse") => {
    setEffects((prev) => ({ ...prev, [effect]: !prev[effect] }))
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const drawWaveform = useCallback(() => {
    if (!audioBufferRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height

    const isDarkMode = document.documentElement.classList.contains("dark")
    const bgColor = isDarkMode ? "#0a0a0a" : "#fafafa"
    const fgColor = isDarkMode ? "#fafafa" : "#0a0a0a"

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, width, height)

    // Get audio data - FIXED: Always show original buffer
    const data = audioBufferRef.current.getChannelData(0)
    const totalSamples = data.length
    const step = Math.ceil(totalSamples / width)
    const amp = height / 2

    // Draw waveform
    ctx.strokeStyle = fgColor
    ctx.lineWidth = 1
    ctx.beginPath()

    const waveformScale = 0.7

    for (let i = 0; i < width; i++) {
      let min = 1.0
      let max = -1.0

      for (let j = 0; j < step; j++) {
        const sampleIndex = i * step + j
        if (sampleIndex >= totalSamples) break
        const datum = data[sampleIndex]
        if (datum < min) min = datum
        if (datum > max) max = datum
      }

      // Apply waveform scale to reduce height
      ctx.moveTo(i, (1 + min * waveformScale) * amp)
      ctx.lineTo(i, (1 + max * waveformScale) * amp)
    }

    ctx.stroke()

    // Draw played portion overlay (dimmed)
    if (duration > 0) {
      const playedWidth = (currentTime / duration) * width
      ctx.fillStyle = fgColor
      ctx.globalAlpha = 0.6
      ctx.fillRect(0, 0, playedWidth, height)
      ctx.globalAlpha = 1
    }

    // Draw playhead
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width
      ctx.strokeStyle = fgColor
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(playheadX, 0)
      ctx.lineTo(playheadX, height)
      ctx.stroke()
    }
  }, [currentTime, duration])

  useEffect(() => {
    drawWaveform()
  }, [drawWaveform])

  useEffect(() => {
    const handleResize = () => drawWaveform()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [drawWaveform])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      drawWaveform()
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [drawWaveform])

  return (
    <div className="border-2 border-foreground bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b-2 border-foreground p-4 bg-background">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-xl font-bold tracking-tight">FOURPAGE</h4>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Volume2 className="w-4 h-4" />
            <span className="font-mono">Demo Track</span>
          </div>
        </div>
      </div>

      {/* Waveform Area */}
      <div className="border-b-2 border-foreground p-4 sm:p-6 bg-background">
        <div className="h-24 sm:h-32 border-2 border-foreground relative overflow-hidden">
          <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-10 h-10 border-2 border-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>
          <div className="flex-1 h-2 border-2 border-foreground bg-muted/20 relative">
            <div
              className="absolute inset-y-0 left-0 bg-foreground transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="font-mono text-xs w-20 text-right">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Effects Panel */}
      <div className="grid grid-cols-3">
        {/* Granular */}
        <button
          onClick={() => toggleEffect("granular")}
          className={`p-3 sm:p-6 text-left transition-colors border-r-2 border-foreground ${
            effects.granular ? "bg-foreground text-background" : "bg-background hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="font-mono text-[10px] sm:text-sm font-bold truncate">GRAIN</span>
            <div
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 flex-shrink-0 ${effects.granular ? "border-background bg-background" : "border-foreground"}`}
            >
              {effects.granular && <div className="w-full h-full bg-foreground" />}
            </div>
          </div>
          <p className="text-[10px] sm:text-xs opacity-70 hidden sm:block">Grain synthesis</p>
        </button>

        {/* Reverb */}
        <button
          onClick={() => toggleEffect("reverb")}
          className={`p-3 sm:p-6 text-left transition-colors border-r-2 border-foreground ${
            effects.reverb ? "bg-foreground text-background" : "bg-background hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="font-mono text-[10px] sm:text-sm font-bold truncate">REVERB</span>
            <div
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 flex-shrink-0 ${effects.reverb ? "border-background bg-background" : "border-foreground"}`}
            >
              {effects.reverb && <div className="w-full h-full bg-foreground" />}
            </div>
          </div>
          <p className="text-[10px] sm:text-xs opacity-70 hidden sm:block">Spacious echoes</p>
        </button>

        {/* Reverse */}
        <button
          onClick={() => toggleEffect("reverse")}
          className={`p-3 sm:p-6 text-left transition-colors ${
            effects.reverse ? "bg-foreground text-background" : "bg-background hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <span className="font-mono text-[10px] sm:text-sm font-bold truncate">REVERSE</span>
            <div
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 flex-shrink-0 ${effects.reverse ? "border-background bg-background" : "border-foreground"}`}
            >
              {effects.reverse && <div className="w-full h-full bg-foreground" />}
            </div>
          </div>
          <p className="text-[10px] sm:text-xs opacity-70 hidden sm:block">Play backwards</p>
        </button>
      </div>
    </div>
  )
}
