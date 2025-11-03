"use client"

import type React from "react"
import { audioBufferToWav } from "@/utils/audioBufferToWav"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Upload, Play, Pause, RotateCcw, Download, Repeat, Moon, Sun, PlayIcon, ChevronDown } from "lucide-react"
import { useTheme } from "next-themes"
import WaveformVisualizer from "./waveform-visualizer"
import EffectsPanel from "./effects-panel"
import FeedbackDialog from "./feedback-dialog"
import SamplerPads from "./sampler-pads"
import Link from "next/link"
import type { Clip } from "./waveform-visualizer"
import { isAuthenticated } from "@/lib/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

const SAMPLE_LIBRARY = [
  { id: 1, name: "Lo-Fi Beat 01", author: "DJ Smooth", genre: "Lo-Fi Hip Hop" },
  { id: 2, name: "Ambient Pad", author: "Synth Master", genre: "Ambient" },
  { id: 3, name: "Drum Break", author: "Beat Maker", genre: "Breakbeat" },
  { id: 4, name: "Jazz Piano Loop", author: "Keys Player", genre: "Jazz" },
  { id: 5, name: "Bass Line 808", author: "Low End Theory", genre: "Trap" },
  { id: 6, name: "Vocal Chop", author: "Voice Artist", genre: "Electronic" },
  { id: 7, name: "Guitar Riff", author: "String Theory", genre: "Rock" },
  { id: 8, name: "Synth Lead", author: "Analog Dreams", genre: "Synthwave" },
]

export default function AudioManipulator() {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null) // NEW: For reversed audio
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isRendering, setIsRendering] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)

  const [clips, setClips] = useState<Clip[]>([])

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
    delayTime: 0.3,
    delayFeedback: 0.3,
    delayMix: 0.5,
    reverbRoomSize: 0.5,
    reverbDecay: 0.5,
    reverbMix: 0,
  })

  const isLoopingRef = useRef(false)
  const isManuallyStoppingRef = useRef(false)

  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isSampleLibraryOpen, setIsSampleLibraryOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    setIsSignedIn(isAuthenticated())
  }, [])

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

  // NEW: Process buffer when reverse changes
  useEffect(() => {
    if (!audioBuffer) return

    console.log("[v0] Processing buffer, reverse:", effects.reverse)

    if (effects.reverse) {
      const reversed = reverseAudioBuffer(audioBuffer)
      setProcessedBuffer(reversed)
    } else {
      setProcessedBuffer(audioBuffer)
    }

    // Restart playback if currently playing
    if (isPlaying) {
      console.log("[v0] Reverse changed during playback, restarting")
      pauseAudio()
      // Use setTimeout to ensure clean restart
      setTimeout(() => playAudio(), 50)
    }
  }, [effects.reverse, audioBuffer])

  // NEW: Function to reverse audio buffer
  const reverseAudioBuffer = (buffer: AudioBuffer): AudioBuffer => {
    const reversedBuffer = audioContextRef.current!.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate,
    )

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel)
      const reversedData = reversedBuffer.getChannelData(channel)

      for (let i = 0; i < channelData.length; i++) {
        reversedData[i] = channelData[channelData.length - 1 - i]
      }
    }

    return reversedBuffer
  }

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
      setProcessedBuffer(buffer)
      setDuration(buffer.duration)
      setCurrentTime(0)
      pauseTimeRef.current = 0
      setIsPlaying(false)
      setClips([])

      console.log("[v0] Audio file loaded successfully")
    } catch (error) {
      console.error("[v0] Error loading audio file:", error)
      alert(`Error loading audio file: ${error}`)
    }
  }

  const handleSampleSelect = (sample: (typeof SAMPLE_LIBRARY)[0]) => {
    console.log("[v0] Sample selected:", sample)
    // TODO: Load sample file when user uploads real samples
    setIsSampleLibraryOpen(false)
  }

  const playAudio = () => {
    if (!processedBuffer || !audioContextRef.current) return

    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current.disconnect()
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    // const offset = pauseTimeRef.current
    // Determine what to play based on selection
    let bufferToPlay = processedBuffer
    let startOffset = pauseTimeRef.current
    let playDuration = duration

    if (selectedClipId) {
      // Find the selected clip
      const selectedClip = clips.find(c => c.id === selectedClipId)
      if (selectedClip) {
        // Create a buffer for just this clip
        const clipStartSample = Math.floor(selectedClip.startTime * processedBuffer.sampleRate)
        const clipEndSample = Math.floor(selectedClip.endTime * processedBuffer.sampleRate)
        const clipLength = clipEndSample - clipStartSample

        const clipBuffer = audioContextRef.current.createBuffer(
          processedBuffer.numberOfChannels,
          clipLength,
          processedBuffer.sampleRate
        )

        for (let channel = 0; channel < processedBuffer.numberOfChannels; channel++) {
          const sourceData = processedBuffer.getChannelData(channel)
          const clipData = clipBuffer.getChannelData(channel)
          for (let i = 0; i < clipLength; i++) {
            clipData[i] = sourceData[clipStartSample + i]
          }
        }

        bufferToPlay = clipBuffer
        playDuration = selectedClip.endTime - selectedClip.startTime
        // When playing a clip, always start from beginning
        startOffset = 0
      }
    }

    sourceNodeRef.current = audioContextRef.current.createBufferSource()
    sourceNodeRef.current.buffer = processedBuffer
    sourceNodeRef.current.playbackRate.value = effects.pitch

    const ctx = audioContextRef.current
    const delayNode = ctx.createDelay(2)
    const delayFeedbackGain = ctx.createGain()
    const delayWetGain = ctx.createGain()
    const dryGain = ctx.createGain()
    const reverbWetGain = ctx.createGain()

    delayNode.delayTime.value = effects.delayTime
    delayFeedbackGain.gain.value = effects.delayFeedback
    delayWetGain.gain.value = effects.delayMix
    dryGain.gain.value = 1 - Math.max(effects.delayMix, effects.reverbMix) * 0.5
    reverbWetGain.gain.value = effects.reverbMix

    // Connect delay
    delayNode.connect(delayFeedbackGain)
    delayFeedbackGain.connect(delayNode)
    delayNode.connect(delayWetGain)

    const reverb = createReverb(ctx, effects.reverbRoomSize, effects.reverbDecay)

    // Connect source to all paths
    sourceNodeRef.current.connect(dryGain)
    sourceNodeRef.current.connect(delayNode)
    sourceNodeRef.current.connect(reverb.input)

    // Mix all paths to output
    dryGain.connect(gainNodeRef.current!)
    delayWetGain.connect(gainNodeRef.current!)
    reverb.output.connect(reverbWetGain)
    reverbWetGain.connect(gainNodeRef.current!)

    sourceNodeRef.current.start(0, startOffset)
    startTimeRef.current = audioContextRef.current.currentTime - startOffset / effects.pitch
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

  const handleClipSelect = (clipId: string | null) => {
    // Stop current playback
    if (isPlaying) {
      pauseAudio()
    }
    
    // Reset to beginning
    setCurrentTime(0)
    pauseTimeRef.current = 0
    
    // Set selection
    setSelectedClipId(clipId)
    
    // Update duration
    if (clipId) {
      const clip = clips.find(c => c.id === clipId)
      if (clip) {
        setDuration(clip.endTime - clip.startTime)
      }
    } else {
      // Restore original duration
      if (audioBuffer) {
        setDuration(audioBuffer.duration)
      }
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
    if (!processedBuffer) return

    setIsRendering(true)

    try {
      const offlineCtx = new OfflineAudioContext(
        processedBuffer.numberOfChannels,
        processedBuffer.length,
        processedBuffer.sampleRate,
      )

      const source = offlineCtx.createBufferSource()
      source.buffer = processedBuffer
      source.playbackRate.value = effects.pitch

      const delayNode = offlineCtx.createDelay(2)
      const delayFeedbackGain = offlineCtx.createGain()
      const delayWetGain = offlineCtx.createGain()
      const dryGain = offlineCtx.createGain()
      const reverbWetGain = offlineCtx.createGain()

      delayNode.delayTime.value = effects.delayTime
      delayFeedbackGain.gain.value = effects.delayFeedback
      delayWetGain.gain.value = effects.delayMix
      dryGain.gain.value = 1 - Math.max(effects.delayMix, effects.reverbMix) * 0.5
      reverbWetGain.gain.value = effects.reverbMix

      delayNode.connect(delayFeedbackGain)
      delayFeedbackGain.connect(delayNode)
      delayNode.connect(delayWetGain)

      const reverb = createReverb(offlineCtx, effects.reverbRoomSize, effects.reverbDecay)

      source.connect(dryGain)
      source.connect(delayNode)
      source.connect(reverb.input)

      dryGain.connect(offlineCtx.destination)
      delayWetGain.connect(offlineCtx.destination)
      reverb.output.connect(reverbWetGain)
      reverbWetGain.connect(offlineCtx.destination)

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

  const downloadClips = async () => {
    if (!processedBuffer || clips.length === 0) return

    setIsRendering(true)

    try {
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i]

        // Calculate sample positions
        const startSample = Math.floor(clip.startTime * processedBuffer.sampleRate)
        const endSample = Math.floor(clip.endTime * processedBuffer.sampleRate)
        const clipLength = endSample - startSample

        // Create a new buffer for this clip
        const clipBuffer = audioContextRef.current!.createBuffer(
          processedBuffer.numberOfChannels,
          clipLength,
          processedBuffer.sampleRate,
        )

        // Copy the clip data
        for (let channel = 0; channel < processedBuffer.numberOfChannels; channel++) {
          const sourceData = processedBuffer.getChannelData(channel)
          const clipData = clipBuffer.getChannelData(channel)
          for (let j = 0; j < clipLength; j++) {
            clipData[j] = sourceData[startSample + j]
          }
        }

        // Render with effects
        const offlineCtx = new OfflineAudioContext(
          clipBuffer.numberOfChannels,
          clipBuffer.length,
          clipBuffer.sampleRate,
        )

        const source = offlineCtx.createBufferSource()
        source.buffer = clipBuffer
        source.playbackRate.value = effects.pitch

        const delayNode = offlineCtx.createDelay(2)
        const delayFeedbackGain = offlineCtx.createGain()
        const delayWetGain = offlineCtx.createGain()
        const dryGain = offlineCtx.createGain()
        const reverbWetGain = offlineCtx.createGain()

        delayNode.delayTime.value = effects.delayTime
        delayFeedbackGain.gain.value = effects.delayFeedback
        delayWetGain.gain.value = effects.delayMix
        dryGain.gain.value = 1 - Math.max(effects.delayMix, effects.reverbMix) * 0.5
        reverbWetGain.gain.value = effects.reverbMix

        delayNode.connect(delayFeedbackGain)
        delayFeedbackGain.connect(delayNode)
        delayNode.connect(delayWetGain)

        const reverb = createReverb(offlineCtx, effects.reverbRoomSize, effects.reverbDecay)

        source.connect(dryGain)
        source.connect(delayNode)
        source.connect(reverb.input)

        dryGain.connect(offlineCtx.destination)
        delayWetGain.connect(offlineCtx.destination)
        reverb.output.connect(reverbWetGain)
        reverbWetGain.connect(offlineCtx.destination)

        source.start(0)
        const renderedBuffer = await offlineCtx.startRendering()

        const wavBlob = audioBufferToWav(renderedBuffer)
        const url = URL.createObjectURL(wavBlob)
        const a = document.createElement("a")
        a.href = url
        a.download = `fourpage-clip-${i + 1}-${Date.now()}.wav`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        // Small delay between downloads
        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      setIsRendering(false)
    } catch (error) {
      console.error("Error rendering clips:", error)
      alert("Error processing clips for download")
      setIsRendering(false)
    }
  }

  const downloadSequence = async () => {
    if (!processedBuffer || clips.length === 0) return

    setIsRendering(true)

    try {
      // Sort clips by start time
      const sortedClips = [...clips].sort((a, b) => a.startTime - b.startTime)

      // Calculate total length of sequence
      let totalLength = 0
      for (const clip of sortedClips) {
        const startSample = Math.floor(clip.startTime * processedBuffer.sampleRate)
        const endSample = Math.floor(clip.endTime * processedBuffer.sampleRate)
        totalLength += endSample - startSample
      }

      // Create a new buffer for the sequence
      const sequenceBuffer = audioContextRef.current!.createBuffer(
        processedBuffer.numberOfChannels,
        totalLength,
        processedBuffer.sampleRate,
      )

      // Copy all clips into the sequence buffer
      let currentPosition = 0
      for (const clip of sortedClips) {
        const startSample = Math.floor(clip.startTime * processedBuffer.sampleRate)
        const endSample = Math.floor(clip.endTime * processedBuffer.sampleRate)
        const clipLength = endSample - startSample

        for (let channel = 0; channel < processedBuffer.numberOfChannels; channel++) {
          const sourceData = processedBuffer.getChannelData(channel)
          const sequenceData = sequenceBuffer.getChannelData(channel)
          for (let j = 0; j < clipLength; j++) {
            sequenceData[currentPosition + j] = sourceData[startSample + j]
          }
        }

        currentPosition += clipLength
      }

      // Render with effects
      const offlineCtx = new OfflineAudioContext(
        sequenceBuffer.numberOfChannels,
        sequenceBuffer.length,
        sequenceBuffer.sampleRate,
      )

      const source = offlineCtx.createBufferSource()
      source.buffer = sequenceBuffer
      source.playbackRate.value = effects.pitch

      const delayNode = offlineCtx.createDelay(2)
      const delayFeedbackGain = offlineCtx.createGain()
      const delayWetGain = offlineCtx.createGain()
      const dryGain = offlineCtx.createGain()
      const reverbWetGain = offlineCtx.createGain()

      delayNode.delayTime.value = effects.delayTime
      delayFeedbackGain.gain.value = effects.delayFeedback
      delayWetGain.gain.value = effects.delayMix
      dryGain.gain.value = 1 - Math.max(effects.delayMix, effects.reverbMix) * 0.5
      reverbWetGain.gain.value = effects.reverbMix

      delayNode.connect(delayFeedbackGain)
      delayFeedbackGain.connect(delayNode)
      delayNode.connect(delayWetGain)

      const reverb = createReverb(offlineCtx, effects.reverbRoomSize, effects.reverbDecay)

      source.connect(dryGain)
      source.connect(delayNode)
      source.connect(reverb.input)

      dryGain.connect(offlineCtx.destination)
      delayWetGain.connect(offlineCtx.destination)
      reverb.output.connect(reverbWetGain)
      reverbWetGain.connect(offlineCtx.destination)

      source.start(0)
      const renderedBuffer = await offlineCtx.startRendering()

      const wavBlob = audioBufferToWav(renderedBuffer)
      const url = URL.createObjectURL(wavBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `fourpage-sequence-${Date.now()}.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setIsRendering(false)
    } catch (error) {
      console.error("Error rendering sequence:", error)
      alert("Error processing sequence for download")
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

  const createReverb = (ctx: AudioContext | OfflineAudioContext, roomSize: number, decay: number) => {
    const delays = [ctx.createDelay(1), ctx.createDelay(1), ctx.createDelay(1), ctx.createDelay(1)]

    const gains = [ctx.createGain(), ctx.createGain(), ctx.createGain(), ctx.createGain()]

    const baseTimes = [0.0297, 0.0371, 0.0411, 0.0437]
    delays.forEach((delay, i) => {
      delay.delayTime.value = baseTimes[i] * (0.5 + roomSize * 1.5)
      gains[i].gain.value = decay * 0.7
    })

    const input = ctx.createGain()
    const output = ctx.createGain()

    delays.forEach((delay, i) => {
      input.connect(delay)
      delay.connect(gains[i])
      gains[i].connect(output)
      gains[i].connect(delay)
    })

    return { input, output }
  }

  return (
    <div className="min-h-screen bg-background p-2 md:p-4">
      <header className="border-b-2 border-foreground pb-2 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-mono text-2xl md:text-4xl font-bold tracking-tight">
              FOURPAGE <span className="text-sm md:text-lg font-normal text-muted-foreground">Sixty Lens</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <Link href="/profile">
                <Button variant="outline" size="sm" className="font-mono bg-transparent p-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="bg-transparent text-foreground" />
                  </Avatar>
                </Button>
              </Link>
            ) : (
              <>
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
              </>
            )}
            <FeedbackDialog />
            {mounted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="font-mono bg-transparent"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {!audioFile ? (
            <div className="border-2 border-foreground p-12 flex flex-col items-center justify-center min-h-[300px]">
              <Upload className="w-16 h-16 mb-4" />
              <h2 className="font-mono text-xl mb-4 uppercase tracking-wider">Load Sample</h2>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <label className="cursor-pointer w-full">
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/aac,audio/flac,audio/webm,audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="audio-file-input"
                    ref={fileInputRef}
                  />
                  <Button
                    variant="outline"
                    size="lg"
                    className="font-mono uppercase tracking-wider bg-transparent w-full"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    Select Audio File
                  </Button>
                </label>
                <Dialog open={isSampleLibraryOpen} onOpenChange={setIsSampleLibraryOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="lg"
                      className="font-mono uppercase tracking-wider bg-transparent w-full"
                    >
                      Browse Sample Library
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-mono text-xl uppercase tracking-wider">Sample Library</DialogTitle>
                      <DialogDescription className="font-mono text-sm">
                        Select a sample from the library to load
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 mt-4">
                      {SAMPLE_LIBRARY.map((sample) => (
                        <button
                          key={sample.id}
                          onClick={() => handleSampleSelect(sample)}
                          className="w-full border-2 border-foreground p-4 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-mono font-bold text-base mb-1">{sample.name}</h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="font-mono">By {sample.author}</span>
                                <span className="font-mono">•</span>
                                <span className="font-mono uppercase tracking-wider">{sample.genre}</span>
                              </div>
                            </div>
                            <PlayIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            <>
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/aac,audio/flac,audio/webm,audio/*"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
              />

              <div className="border-2 border-foreground">
                {/* Status header section */}
                <div className="border-b-2 border-foreground p-2 flex items-center justify-between bg-background">
                  <div className="font-mono text-xs uppercase tracking-wider">
                    <div>WAVEFORM VIEW</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground truncate max-w-[120px] sm:max-w-[200px] md:max-w-md">
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
                <div className="p-2 relative border-b-2 border-foreground">
                  <WaveformVisualizer
                    audioBuffer={audioBuffer}
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={seekAudio}
                    clips={clips}
                    onClipsChange={setClips}
                  />
                </div>

                {/* Playback controls section */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Button onClick={togglePlayPause} size="sm" className="font-mono uppercase tracking-wider">
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        onClick={resetAudio}
                        variant="outline"
                        size="sm"
                        className="font-mono uppercase tracking-wider bg-transparent"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => setIsLooping(!isLooping)}
                        variant={isLooping ? "default" : "outline"}
                        size="sm"
                        className={`font-mono uppercase tracking-wider ${isLooping ? "" : "bg-transparent"}`}
                      >
                        <Repeat className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-mono uppercase tracking-wider bg-transparent"
                            disabled={isRendering}
                          >
                            <Download className="w-4 h-4" />
                            {isRendering && <span className="ml-2">...</span>}
                            {!isRendering && <ChevronDown className="w-3 h-3 ml-1" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="font-mono">
                          <DropdownMenuItem onClick={downloadProcessedAudio}>
                            <Download className="w-4 h-4 mr-2" />
                            Full Audio
                          </DropdownMenuItem>
                          {clips.length > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={downloadClips}>
                                <Download className="w-4 h-4 mr-2" />
                                Clips ({clips.length})
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={downloadSequence}>
                                <Download className="w-4 h-4 mr-2" />
                                Sequence
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="font-mono text-xs uppercase tracking-wider">
                      {selectedClipId && (
                        <span className="text-muted-foreground mr-2">
                          Clip {clips.findIndex(c => c.id === selectedClipId) + 1}
                        </span>
                      )}
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                    {/* <div className="font-mono text-xs uppercase tracking-wider">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div> */}
                  </div>

                  <div className="space-y-1">
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

              {/* <SamplerPads audioBuffer={audioBuffer} clips={clips} /> */}
              <SamplerPads 
                audioBuffer={audioBuffer} 
                clips={clips}
                selectedClipId={selectedClipId}
                onClipSelect={handleClipSelect}
                isPlaying={isPlaying}
                onPlayStateChange={(playing) => {
                  if (playing) {
                    playAudio()
                  } else {
                    pauseAudio()
                  }
                }}
              />
            </>
          )}
        </div>

        <div className="space-y-4">
          <EffectsPanel effects={effects} setEffects={setEffects} />
        </div>
      </div>

      <footer className="border-t-2 border-foreground mt-6 pt-2">
        <div className="flex justify-end items-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <div>v1.0.0 BETA </div>
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
