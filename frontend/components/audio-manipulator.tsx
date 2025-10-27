"use client"

import type React from "react"
import { audioBufferToWav } from "@/utils/audioBufferToWav"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Upload, Play, Pause, RotateCcw, Download, Repeat } from "lucide-react"
import WaveformVisualizer from "./waveform-visualizer"
import EffectsPanel from "./effects-panel"
import Link from "next/link"

export default function AudioManipulator() {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isRendering, setIsRendering] = useState(false)
  const [isLooping, setIsLooping] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const startTimeRef = useRef<number>(0)
  const pauseTimeRef = useRef<number>(0)
  const playbackRateRef = useRef<number>(1)
  const animationFrameRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const gainNodeRef = useRef<GainNode | null>(null)

  const [effects, setEffects] = useState({
    volume: 0.8,
    pitch: 1,
    reverse: false,
  })

  const isLoopingRef = useRef(false)
  const isManuallyStoppingRef = useRef(false)

  useEffect(() => {
    audioContextRef.current = new AudioContext()
    const ctx = audioContextRef.current

    gainNodeRef.current = ctx.createGain()
    gainNodeRef.current.gain.value = effects.volume
    gainNodeRef.current.connect(ctx.destination)

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(effects.volume, audioContextRef.current!.currentTime, 0.01)
    }
  }, [effects.volume])

  useEffect(() => {
    if (isPlaying && sourceNodeRef.current) {
      console.log("[v0] Buffer-modifying effect changed, restarting playback")
      pauseAudio()
      playAudio()
    }
  }, [effects.pitch])

  useEffect(() => {
    isLoopingRef.current = isLooping
  }, [isLooping])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[v0] File upload triggered")
    const file = e.target.files?.[0]

    if (!file) {
      console.log("[v0] No file selected")
      return
    }

    if (isPlaying) {
      pauseAudio()
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current.disconnect()
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    console.log("[v0] File selected:", file.name, file.type, file.size)
    setAudioFile(file)

    try {
      console.log("[v0] Reading file as array buffer...")
      const arrayBuffer = await file.arrayBuffer()
      console.log("[v0] Array buffer created, size:", arrayBuffer.byteLength)

      console.log("[v0] Decoding audio data...")
      const buffer = await audioContextRef.current!.decodeAudioData(arrayBuffer)
      console.log("[v0] Audio decoded successfully, duration:", buffer.duration)

      setAudioBuffer(buffer)
      setDuration(buffer.duration)
      setCurrentTime(0)
      pauseTimeRef.current = 0
      setIsPlaying(false)

      console.log("[v0] Audio file loaded successfully")
    } catch (error) {
      console.error("[v0] Error loading audio file:", error)
      alert(`Error loading audio file: ${error}`)
    }
  }

  const playAudio = () => {
    if (!audioBuffer || !audioContextRef.current) return

    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current.disconnect()
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const offset = pauseTimeRef.current
    sourceNodeRef.current = audioContextRef.current.createBufferSource()
    sourceNodeRef.current.buffer = audioBuffer
    sourceNodeRef.current.playbackRate.value = effects.pitch

    sourceNodeRef.current.connect(gainNodeRef.current!)

    sourceNodeRef.current.start(0, offset)
    startTimeRef.current = audioContextRef.current.currentTime - offset / effects.pitch
    playbackRateRef.current = effects.pitch
    setIsPlaying(true)

    const updateTime = () => {
      if (audioContextRef.current && sourceNodeRef.current) {
        const contextElapsed = audioContextRef.current.currentTime - startTimeRef.current
        const bufferElapsed = contextElapsed * playbackRateRef.current

        setCurrentTime(bufferElapsed)

        if (bufferElapsed >= duration) {
          if (isManuallyStoppingRef.current) {
            return
          }
          if (isLoopingRef.current) {
            pauseTimeRef.current = 0
            playAudio()
            return
          } else {
            setIsPlaying(false)
            setCurrentTime(0)
            pauseTimeRef.current = 0
            animationFrameRef.current = null
            return
          }
        }

        animationFrameRef.current = requestAnimationFrame(updateTime)
      }
    }
    animationFrameRef.current = requestAnimationFrame(updateTime)
  }

  const pauseAudio = () => {
    if (sourceNodeRef.current && audioContextRef.current) {
      isManuallyStoppingRef.current = true
      isLoopingRef.current = false
      setIsLooping(false)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      sourceNodeRef.current.stop()
      sourceNodeRef.current.disconnect()
      const contextElapsed = audioContextRef.current.currentTime - startTimeRef.current
      pauseTimeRef.current = contextElapsed * playbackRateRef.current
      setIsPlaying(false)

      setTimeout(() => {
        isManuallyStoppingRef.current = false
      }, 100)
    }
  }

  const resetAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current.disconnect()
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setIsPlaying(false)
    setCurrentTime(0)
    pauseTimeRef.current = 0
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio()
    } else {
      playAudio()
    }
  }

  const downloadProcessedAudio = async () => {
    if (!audioBuffer) return

    setIsRendering(true)

    try {
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate,
      )

      const source = offlineCtx.createBufferSource()

      source.buffer = audioBuffer
      source.playbackRate.value = effects.pitch

      source.connect(offlineCtx.destination)

      source.start(0)
      const renderedBuffer = await offlineCtx.startRendering()

      const wavBlob = audioBufferToWav(renderedBuffer)
      const url = URL.createObjectURL(wavBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fourpage-processed-${Date.now()}.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setIsRendering(false)
    } catch (error) {
      console.error("Error rendering audio:", error)
      alert("Error processing audio for download")
      setIsRendering(false)
    }
  }

  const seekAudio = (time: number) => {
    const wasPlaying = isPlaying

    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current.disconnect()
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    pauseTimeRef.current = time
    setCurrentTime(time)
    setIsPlaying(false)

    if (wasPlaying) {
      playAudio()
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <header className="border-b-2 border-foreground pb-4 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-mono text-2xl md:text-4xl font-bold tracking-tight">
              FOURPAGE <span className="text-sm md:text-lg font-normal text-muted-foreground">Sixty Lens</span>
            </h1>
            <p className="font-mono text-xs md:text-sm mt-2 text-muted-foreground uppercase tracking-wider">
              Experimental Sample Manipulation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sign-in">
              <Button variant="outline" size="sm" className="font-mono uppercase tracking-wider bg-transparent">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="font-mono uppercase tracking-wider">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {!audioFile ? (
            <div className="border-2 border-foreground p-12 flex flex-col items-center justify-center min-h-[300px]">
              <Upload className="w-16 h-16 mb-4" />
              <h2 className="font-mono text-xl mb-4 uppercase tracking-wider">Load Sample</h2>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="audio-file-input"
                  ref={fileInputRef}
                />
                <Button
                  variant="outline"
                  size="lg"
                  className="font-mono uppercase tracking-wider bg-transparent"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  Select Audio File
                </Button>
              </label>
            </div>
          ) : (
            <>
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" ref={fileInputRef} />

              <div className="border-2 border-foreground">
                {/* Status header section */}
                <div className="border-b-2 border-foreground p-4 flex items-center justify-between bg-background">
                  <div className="font-mono text-xs uppercase tracking-wider">
                    <div>Status: {isPlaying ? "ACTIVE" : "STANDBY"}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground truncate max-w-md">
                      {audioFile ? audioFile.name : "NO SAMPLE LOADED"}
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      className="font-mono uppercase tracking-wider bg-background"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Waveform section */}
                <div className="p-4 relative border-b-2 border-foreground">
                  <WaveformVisualizer
                    audioBuffer={audioBuffer}
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={seekAudio}
                  />
                </div>

                {/* Playback controls section */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Button onClick={togglePlayPause} size="lg" className="font-mono uppercase tracking-wider">
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </Button>
                      <Button
                        onClick={resetAudio}
                        variant="outline"
                        size="lg"
                        className="font-mono uppercase tracking-wider bg-transparent"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </Button>
                      <Button
                        onClick={() => setIsLooping(!isLooping)}
                        variant={isLooping ? "default" : "outline"}
                        size="lg"
                        className={`font-mono uppercase tracking-wider ${isLooping ? "" : "bg-transparent"}`}
                      >
                        <Repeat className="w-5 h-5" />
                      </Button>
                      <Button
                        onClick={downloadProcessedAudio}
                        variant="outline"
                        size="lg"
                        className="font-mono uppercase tracking-wider bg-transparent"
                        disabled={isRendering}
                      >
                        <Download className="w-5 h-5" />
                        {isRendering && <span className="ml-2">...</span>}
                      </Button>
                    </div>
                    <div className="font-mono text-sm uppercase tracking-wider">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-xs uppercase tracking-wider">
                      Volume: {Math.round(effects.volume * 100)}%
                    </label>
                    <Slider
                      value={[effects.volume]}
                      onValueChange={([value]) => setEffects({ ...effects, volume: value })}
                      min={0}
                      max={1}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <EffectsPanel effects={effects} setEffects={setEffects} />
        </div>
      </div>

      <footer className="border-t-2 border-foreground mt-12 pt-4">
        <div className="flex justify-end items-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <div>v1.0.0</div>
        </div>
      </footer>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}
