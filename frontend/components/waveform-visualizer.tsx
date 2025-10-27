"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"

interface WaveformVisualizerProps {
  audioBuffer: AudioBuffer | null
  currentTime: number
  duration: number
  onSeek?: (time: number) => void
}

export default function WaveformVisualizer({ audioBuffer, currentTime, duration, onSeek }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height

    // Clear canvas
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue("--color-background") || "#f5f5f0"
    ctx.fillRect(0, 0, width, height)

    // Get audio data
    const data = audioBuffer.getChannelData(0)
    const step = Math.ceil(data.length / width)
    const amp = height / 2

    // Draw waveform
    ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--color-foreground") || "#262626"
    ctx.lineWidth = 1
    ctx.beginPath()

    for (let i = 0; i < width; i++) {
      let min = 1.0
      let max = -1.0

      for (let j = 0; j < step; j++) {
        const datum = data[i * step + j]
        if (datum < min) min = datum
        if (datum > max) max = datum
      }

      ctx.moveTo(i, (1 + min) * amp)
      ctx.lineTo(i, (1 + max) * amp)
    }

    ctx.stroke()

    // Draw playhead
    const playheadX = (currentTime / duration) * width
    ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("--color-foreground") || "#262626"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, height)
    ctx.stroke()
  }, [audioBuffer, currentTime, duration])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onSeek) return
    setIsDragging(true)
    handleSeek(e)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && onSeek) {
      handleSeek(e)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onSeek) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    const seekTime = percentage * duration

    onSeek(seekTime)
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-[200px] md:h-[300px] cursor-pointer"
        style={
          {
            "--color-background": "var(--background)",
            "--color-foreground": "var(--foreground)",
          } as React.CSSProperties
        }
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  )
}
