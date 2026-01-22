"use client";

import type React from "react";

import { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Scissors, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import type { Clip } from "@/types/audio";

// Generate random color for clips
const generateClipColor = (): string => {
  // Plain gray style - no colors
  return 'rgba(128, 128, 128, 0.25)';
};

interface WaveformVisualizerProps {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  isReversed: boolean;
  duration: number;
  onSeek?: (time: number) => void;
  clips?: Clip[];
  onClipsChange?: (clips: Clip[]) => void;
  pauseAudio: () => void;
}

const DELTA_TIME = 0.0001;

export default function WaveformVisualizer({
  audioBuffer,
  currentTime,
  isReversed,
  duration,
  onSeek,
  clips = [],
  onClipsChange,
  pauseAudio,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);

  const [isCreatingClip, setIsCreatingClip] = useState(false);
  const [clipStartX, setClipStartX] = useState<number | null>(null);
  const [clipStartTime, setClipStartTime] = useState<number | null>(null);
  const [currentClipEndTime, setCurrentClipEndTime] = useState<number | null>(
    null
  );
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [isDoubleTapDragging, setIsDoubleTapDragging] = useState(false);

  const [draggedClipEdge, setDraggedClipEdge] = useState<{
    clipId: string;
    edge: "start" | "end";
  } | null>(null);
  const [hoveredClipEdge, setHoveredClipEdge] = useState<{
    clipId: string;
    edge: "start" | "end";
  } | null>(null);
  const [cursorStyle, setCursorStyle] = useState<string>("pointer");

  // Touch gesture state for pinch-to-zoom and panning
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialPinchZoom, setInitialPinchZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanX, setLastPanX] = useState<number | null>(null);

  const drawWaveform = useCallback(() => {
    if (!audioBuffer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.fillStyle =
      getComputedStyle(canvas).getPropertyValue("--color-background") ||
      "#f5f5f0";
    ctx.fillRect(0, 0, width, height);

    // Get audio data
    const data = audioBuffer.getChannelData(0);
    const totalSamples = data.length;
    const visibleSamples = totalSamples / zoom;
    const startSample = Math.floor(
      scrollOffset * (totalSamples - visibleSamples)
    );
    const endSample = Math.min(startSample + visibleSamples, totalSamples);
    const step = Math.ceil((endSample - startSample) / width);
    const amp = height / 2;

    const visibleStartTime = (startSample / totalSamples) * duration;
    const visibleEndTime = (endSample / totalSamples) * duration;
    const visibleDuration = visibleEndTime - visibleStartTime;

    clips.forEach((clip, index) => {
      if (
        clip.visualEndTime < visibleStartTime ||
        clip.visualStartTime > visibleEndTime
      )
        return;

      const clipStartX = Math.max(
        0,
        ((clip.visualStartTime - visibleStartTime) / visibleDuration) * width
      );
      const clipEndX = Math.min(
        width,
        ((clip.visualEndTime - visibleStartTime) / visibleDuration) * width
      );

      // Use clip's color or fallback to gray
      ctx.fillStyle = clip.color || "rgba(128, 128, 128, 0.25)";
      ctx.fillRect(clipStartX, 0, clipEndX - clipStartX, height);

      const foregroundColor =
        getComputedStyle(canvas).getPropertyValue("--color-foreground") ||
        "#262626";

      const isStartHovered =
        hoveredClipEdge?.clipId === clip.id &&
        hoveredClipEdge?.edge === "start";
      const isStartDragged =
        draggedClipEdge?.clipId === clip.id &&
        draggedClipEdge?.edge === "start";

      ctx.strokeStyle =
        isStartHovered || isStartDragged ? foregroundColor : foregroundColor;
      ctx.lineWidth = isStartHovered || isStartDragged ? 4 : 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(clipStartX, 0);
      ctx.lineTo(clipStartX, height);
      ctx.stroke();

      const isEndHovered =
        hoveredClipEdge?.clipId === clip.id && hoveredClipEdge?.edge === "end";
      const isEndDragged =
        draggedClipEdge?.clipId === clip.id && draggedClipEdge?.edge === "end";

      ctx.strokeStyle =
        isEndHovered || isEndDragged ? foregroundColor : foregroundColor;
      ctx.lineWidth = isEndHovered || isEndDragged ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(clipEndX, 0);
      ctx.lineTo(clipEndX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw clip number at top center
      const clipCenterX = (clipStartX + clipEndX) / 2;
      const clipNumber = (index + 1).toString();

      ctx.font = "bold 14px monospace";
      ctx.fillStyle = foregroundColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(clipNumber, clipCenterX, 4);
    });

    if (
      isCreatingClip &&
      clipStartTime !== null &&
      currentClipEndTime !== null
    ) {
      const tempClipStartX = Math.max(
        0,
        ((clipStartTime - visibleStartTime) / visibleDuration) * width
      );
      const tempClipEndX = Math.min(
        width,
        ((currentClipEndTime - visibleStartTime) / visibleDuration) * width
      );

      ctx.fillStyle = "rgba(128, 128, 128, 0.25)";
      ctx.fillRect(tempClipStartX, 0, tempClipEndX - tempClipStartX, height);

      const foregroundColor =
        getComputedStyle(canvas).getPropertyValue("--color-foreground") ||
        "#262626";
      ctx.strokeStyle = foregroundColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(tempClipStartX, 0);
      ctx.lineTo(tempClipStartX, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(tempClipEndX, 0);
      ctx.lineTo(tempClipEndX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw waveform
    ctx.strokeStyle =
      getComputedStyle(canvas).getPropertyValue("--color-foreground") ||
      "#262626";
    ctx.lineWidth = 1;
    ctx.beginPath();

    const waveformScale = 0.7;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step; j++) {
        const sampleIndex = startSample + i * step + j;
        if (sampleIndex >= endSample) break;
        const datum = data[sampleIndex];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      // Apply waveform scale to reduce height
      ctx.moveTo(i, (1 + min * waveformScale) * amp);
      ctx.lineTo(i, (1 + max * waveformScale) * amp);
    }

    ctx.stroke();

    if (currentTime >= visibleStartTime && currentTime <= visibleEndTime) {
      const playheadX =
        ((currentTime - visibleStartTime) / visibleDuration) * width;
      ctx.strokeStyle =
        getComputedStyle(canvas).getPropertyValue("--color-foreground") ||
        "#262626";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [
    audioBuffer,
    currentTime,
    duration,
    zoom,
    scrollOffset,
    clips,
    isCreatingClip,
    clipStartTime,
    currentClipEndTime,
    hoveredClipEdge,
    draggedClipEdge,
  ]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      drawWaveform();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [drawWaveform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Zoom with Ctrl/Cmd + scroll
      if (e.ctrlKey || e.metaKey) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mousePercentage = mouseX / rect.width;

        // Calculate the time at the mouse position before zoom
        const totalSamples = audioBuffer?.getChannelData(0).length || 0;
        if (totalSamples === 0) return;

        const visibleSamples = totalSamples / zoom;
        const startSample = Math.floor(
          scrollOffset * (totalSamples - visibleSamples)
        );
        const endSample = Math.min(startSample + visibleSamples, totalSamples);

        const visibleStartTime = (startSample / totalSamples) * duration;
        const visibleEndTime = (endSample / totalSamples) * duration;
        const visibleDuration = visibleEndTime - visibleStartTime;

        const timeAtMouse =
          visibleStartTime + mousePercentage * visibleDuration;

        // Apply zoom
        const zoomDelta = e.deltaY > 0 ? -0.2 : 0.2;
        const newZoom = Math.max(1, Math.min(20, zoom + zoomDelta));

        // Calculate new scroll offset to keep the same time under the mouse
        if (newZoom > 1) {
          const newVisibleSamples = totalSamples / newZoom;
          const newVisibleDuration =
            (newVisibleSamples / totalSamples) * duration;
          const newVisibleStartTime =
            timeAtMouse - mousePercentage * newVisibleDuration;
          const newStartSample =
            (newVisibleStartTime / duration) * totalSamples;
          const maxStartSample = totalSamples - newVisibleSamples;
          const newScrollOffset = Math.max(
            0,
            Math.min(1, newStartSample / maxStartSample)
          );

          setScrollOffset(newScrollOffset);
        }

        setZoom(newZoom);
      }
      // Horizontal scroll with Shift + scroll or horizontal wheel
      else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const scrollDelta = (e.deltaX || e.deltaY) * 0.001;
        setScrollOffset((prev) => {
          const maxScroll = zoom > 1 ? 1 - 1 / zoom : 0;
          return Math.max(0, Math.min(maxScroll, prev + scrollDelta));
        });
      }
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [zoom, scrollOffset, audioBuffer, duration]);

  useEffect(() => {
    if (zoom === 1) {
      setScrollOffset(0);
    }
  }, [zoom]);

  const getTimeFromX = (x: number): number => {
    if (!canvasRef.current || !audioBuffer) return 0;

    const rect = canvasRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    const totalSamples = audioBuffer.getChannelData(0).length;
    const visibleSamples = totalSamples / zoom;
    const startSample = Math.floor(
      scrollOffset * (totalSamples - visibleSamples)
    );
    const endSample = Math.min(startSample + visibleSamples, totalSamples);

    const visibleStartTime = (startSample / totalSamples) * duration;
    const visibleEndTime = (endSample / totalSamples) * duration;
    const visibleDuration = visibleEndTime - visibleStartTime;

    return visibleStartTime + percentage * visibleDuration;
  };

  const getClipEdgeAtPosition = (
    x: number
  ): { clipId: string; edge: "start" | "end" } | null => {
    if (!canvasRef.current || !audioBuffer) return null;

    const rect = canvasRef.current.getBoundingClientRect();
    const totalSamples = audioBuffer.getChannelData(0).length;
    const visibleSamples = totalSamples / zoom;
    const startSample = Math.floor(
      scrollOffset * (totalSamples - visibleSamples)
    );
    const endSample = Math.min(startSample + visibleSamples, totalSamples);

    const visibleStartTime = (startSample / totalSamples) * duration;
    const visibleEndTime = (endSample / totalSamples) * duration;
    const visibleDuration = visibleEndTime - visibleStartTime;

    const edgeThreshold = 8; // pixels

    for (const clip of clips) {
      if (
        clip.visualEndTime < visibleStartTime ||
        clip.visualStartTime > visibleEndTime
      )
        continue;

      const clipStartX = Math.max(
        0,
        ((clip.visualStartTime - visibleStartTime) / visibleDuration) *
          rect.width
      );
      const clipEndX = Math.min(
        rect.width,
        ((clip.visualEndTime - visibleStartTime) / visibleDuration) * rect.width
      );

      if (Math.abs(x - clipStartX) < edgeThreshold) {
        return { clipId: clip.id, edge: "start" };
      }
      if (Math.abs(x - clipEndX) < edgeThreshold) {
        return { clipId: clip.id, edge: "end" };
      }
    }

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onSeek) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    const clipEdge = getClipEdgeAtPosition(x);
    if (clipEdge && onClipsChange) {
      setDraggedClipEdge(clipEdge);
      return;
    }

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;

    // Check for double-click (within 300ms) or shift key
    if ((timeSinceLastClick < 300 && timeSinceLastClick > 0) || e.shiftKey) {
      if (onClipsChange) {
        setIsCreatingClip(true);
        setClipStartX(x);
        const startTime = getTimeFromX(x);
        setClipStartTime(startTime);
        setCurrentClipEndTime(startTime);
        setIsDoubleTapDragging(true);
      }
      setLastClickTime(now);
      return;
    }

    setLastClickTime(now);
    setIsDragging(true);
    handleSeek(e);
    // pauseAudio();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (draggedClipEdge && onClipsChange) {
      const newTime = getTimeFromX(x);
      const updatedClips = clips.map((clip) => {
        if (clip.id === draggedClipEdge.clipId) {
          if (draggedClipEdge.edge === "start") {
            // Ensure start doesn't go past end (leave at least 0.1s)
            const newVisualStart = Math.min(newTime, clip.visualEndTime - 0.1);

            return {
              ...clip,
              startTime: isReversed
                ? duration - clip.visualEndTime
                : newVisualStart,
              endTime: isReversed ? duration - newVisualStart : clip.endTime,
              visualStartTime: newVisualStart,
            };
          } else {
            // Ensure end doesn't go before start (leave at least 0.1s)
            const newVisualEnd = Math.max(newTime, clip.visualStartTime + 0.1);

            return {
              ...clip,
              startTime: isReversed ? duration - newVisualEnd : clip.startTime,
              endTime: isReversed
                ? duration - clip.visualStartTime
                : newVisualEnd,
              visualEndTime: newVisualEnd,
            };
          }
        }
        return clip;
      });
      onClipsChange(updatedClips);
      return;
    }

    if (!isCreatingClip && !draggedClipEdge) {
      const clipEdge = getClipEdgeAtPosition(x);
      setHoveredClipEdge(clipEdge);
      setCursorStyle(clipEdge ? "ew-resize" : "pointer");
    }

    if (isCreatingClip && clipStartTime !== null) {
      const endTime = getTimeFromX(x);
      setCurrentClipEndTime(endTime);
      return;
    }

    if (isDragging && onSeek) {
      handleSeek(e);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedClipEdge) {
      setDraggedClipEdge(null);
      return;
    }

    if (
      isCreatingClip &&
      clipStartTime !== null &&
      currentClipEndTime !== null &&
      onClipsChange
    ) {
      const startTime = Math.min(clipStartTime, currentClipEndTime);
      const endTime = Math.max(clipStartTime, currentClipEndTime);

      // Only create clip if it has meaningful duration (> 0.1 seconds)
      if (endTime - startTime > 0.1) {
        const newClip: Clip = {
          id: `clip-${Date.now()}`,
          startTime: isReversed ? duration - endTime : startTime,
          endTime: isReversed ? duration - startTime : endTime,
          visualStartTime: startTime,
          visualEndTime: endTime,
          color: generateClipColor(), // Add random color
          name: `Clip ${clips.length + 1}`, // Auto-name clips
        };
        // Append to existing clips instead of replacing
        onClipsChange([...clips, newClip]);
      }

      setIsCreatingClip(false);
      setClipStartX(null);
      setClipStartTime(null);
      setCurrentClipEndTime(null);
      setIsDoubleTapDragging(false);
      return;
    }

    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setHoveredClipEdge(null);
    setCursorStyle("pointer");

    if (draggedClipEdge) {
      setDraggedClipEdge(null);
    }

    if (isCreatingClip) {
      setIsCreatingClip(false);
      setClipStartX(null);
      setClipStartTime(null);
      setCurrentClipEndTime(null);
      setIsDoubleTapDragging(false);
    }
    setIsDragging(false);
  };

  // Helper to calculate distance between two touch points
  const getTouchDistance = (touches: React.TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();

    // Two-finger pinch-to-zoom
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsPinching(true);
      setIsPanning(false);
      setInitialPinchDistance(getTouchDistance(e.touches));
      setInitialPinchZoom(zoom);
      return;
    }

    const touch = e.touches[0];
    const x = touch.clientX - rect.left;

    const clipEdge = getClipEdgeAtPosition(x);
    if (clipEdge && onClipsChange) {
      setDraggedClipEdge(clipEdge);
      return;
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;

    // Double tap detection (within 300ms)
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected
      if (onClipsChange) {
        setIsDoubleTapDragging(true);
        setIsCreatingClip(true);
        setClipStartX(x);
        const startTime = getTimeFromX(x);
        setClipStartTime(startTime);
        setCurrentClipEndTime(startTime);
      }
      setLastTapTime(now);
      return;
    }

    setLastTapTime(now);

    // Single finger pan when zoomed in (not editing clips)
    if (zoom > 1 && !isCreatingClip && !draggedClipEdge) {
      setIsPanning(true);
      setLastPanX(touch.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !audioBuffer) return;

    const rect = canvasRef.current.getBoundingClientRect();

    // Handle pinch-to-zoom with two fingers
    if (e.touches.length === 2 && isPinching && initialPinchDistance !== null) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / initialPinchDistance;
      const newZoom = Math.max(1, Math.min(20, initialPinchZoom * scale));

      // Calculate the center point between two fingers for zoom anchor
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const centerPercentage = centerX / rect.width;

      const totalSamples = audioBuffer.getChannelData(0).length;
      const visibleSamples = totalSamples / zoom;
      const startSample = Math.floor(scrollOffset * (totalSamples - visibleSamples));
      const visibleStartTime = (startSample / totalSamples) * duration;
      const visibleDuration = (visibleSamples / totalSamples) * duration;
      const timeAtCenter = visibleStartTime + centerPercentage * visibleDuration;

      // Calculate new scroll offset to keep the center point stable
      if (newZoom > 1) {
        const newVisibleSamples = totalSamples / newZoom;
        const newVisibleDuration = (newVisibleSamples / totalSamples) * duration;
        const newVisibleStartTime = timeAtCenter - centerPercentage * newVisibleDuration;
        const newStartSample = (newVisibleStartTime / duration) * totalSamples;
        const maxStartSample = totalSamples - newVisibleSamples;
        const newScrollOffset = Math.max(0, Math.min(1, newStartSample / maxStartSample));
        setScrollOffset(newScrollOffset);
      } else {
        setScrollOffset(0);
      }

      setZoom(newZoom);
      return;
    }

    // Handle single-finger panning when zoomed in
    if (e.touches.length === 1 && isPanning && lastPanX !== null && zoom > 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastPanX;

      // Convert pixel delta to scroll offset delta
      const scrollDelta = -deltaX / rect.width / zoom;

      setScrollOffset((prev) => {
        const maxScroll = 1 - 1 / zoom;
        return Math.max(0, Math.min(maxScroll, prev + scrollDelta));
      });

      setLastPanX(touch.clientX);
      return;
    }

    const touch = e.touches[0];
    const x = touch.clientX - rect.left;

    if (draggedClipEdge && onClipsChange) {
      const newTime = getTimeFromX(x);
      const updatedClips = clips.map((clip) => {
        if (clip.id === draggedClipEdge.clipId) {
          if (draggedClipEdge.edge === "start") {
            // Ensure start doesn't go past end (leave at least 0.1s)
            const newVisualStart = Math.min(newTime, clip.visualEndTime - 0.1);

            return {
              ...clip,
              startTime: isReversed
                ? duration - clip.visualEndTime
                : newVisualStart,
              endTime: isReversed ? duration - newVisualStart : clip.endTime,
              visualStartTime: newVisualStart,
            };
          } else {
            // Ensure end doesn't go before start (leave at least 0.1s)
            const newVisualEnd = Math.max(newTime, clip.visualStartTime + 0.1);

            return {
              ...clip,
              startTime: isReversed ? duration - newVisualEnd : clip.startTime,
              endTime: isReversed
                ? duration - clip.visualStartTime
                : newVisualEnd,
              visualEndTime: newVisualEnd,
            };
          }
        }
        return clip;
      });
      onClipsChange(updatedClips);
      return;
    }

    if (isDoubleTapDragging && isCreatingClip && clipStartTime !== null) {
      const endTime = getTimeFromX(x);
      setCurrentClipEndTime(endTime);
    }
  };

  const handleTouchEnd = () => {
    // Reset pinch state
    if (isPinching) {
      setIsPinching(false);
      setInitialPinchDistance(null);
      setInitialPinchZoom(1);
    }

    // Reset pan state
    if (isPanning) {
      setIsPanning(false);
      setLastPanX(null);
    }

    if (draggedClipEdge) {
      setDraggedClipEdge(null);
      return;
    }

    if (
      isDoubleTapDragging &&
      isCreatingClip &&
      clipStartTime !== null &&
      currentClipEndTime !== null &&
      onClipsChange
    ) {
      const startTime = Math.min(clipStartTime, currentClipEndTime);
      const endTime = Math.max(clipStartTime, currentClipEndTime);

      if (endTime - startTime > 0.1) {
        const newClip: Clip = {
          id: `clip-${Date.now()}`,
          startTime: isReversed ? duration - endTime : startTime,
          endTime: isReversed ? duration - startTime : endTime,
          visualStartTime: startTime,
          visualEndTime: endTime,
          color: generateClipColor(), // Add random color
          name: `Clip ${clips.length + 1}`, // Auto-name clips
        };
        // Append to existing clips instead of replacing
        onClipsChange([...clips, newClip]);
      }

      setIsCreatingClip(false);
      setClipStartX(null);
      setClipStartTime(null);
      setCurrentClipEndTime(null);
      setIsDoubleTapDragging(false);
    }
  };

  const handleTouchCancel = () => {
    // Reset all touch gesture states
    setIsPinching(false);
    setInitialPinchDistance(null);
    setInitialPinchZoom(1);
    setIsPanning(false);
    setLastPanX(null);
    setDraggedClipEdge(null);
    setIsCreatingClip(false);
    setClipStartX(null);
    setClipStartTime(null);
    setCurrentClipEndTime(null);
    setIsDoubleTapDragging(false);
  };

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onSeek || !audioBuffer) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const seekTime = getTimeFromX(x);
    onSeek(seekTime);
  };

  const handleZoomIn = () => {
    if (!audioBuffer || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const totalSamples = audioBuffer.getChannelData(0).length;
    const visibleSamples = totalSamples / zoom;
    const startSample = Math.floor(
      scrollOffset * (totalSamples - visibleSamples)
    );
    const endSample = Math.min(startSample + visibleSamples, totalSamples);

    const visibleStartTime = (startSample / totalSamples) * duration;
    const visibleEndTime = (endSample / totalSamples) * duration;
    const visibleDuration = visibleEndTime - visibleStartTime;

    // Calculate playhead position as percentage of visible area
    const playheadPercentage =
      (currentTime - visibleStartTime) / visibleDuration;

    const newZoom = Math.min(zoom + 0.5, 20);

    if (newZoom > 1) {
      const newVisibleSamples = totalSamples / newZoom;
      const newVisibleDuration = (newVisibleSamples / totalSamples) * duration;
      const newVisibleStartTime =
        currentTime - playheadPercentage * newVisibleDuration;
      const newStartSample = (newVisibleStartTime / duration) * totalSamples;
      const maxStartSample = totalSamples - newVisibleSamples;
      const newScrollOffset = Math.max(
        0,
        Math.min(1, newStartSample / maxStartSample)
      );

      setScrollOffset(newScrollOffset);
    }

    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    if (!audioBuffer || !canvasRef.current) return;

    const newZoom = Math.max(zoom - 0.5, 1);

    if (newZoom > 1) {
      const rect = canvasRef.current.getBoundingClientRect();
      const totalSamples = audioBuffer.getChannelData(0).length;
      const visibleSamples = totalSamples / zoom;
      const startSample = Math.floor(
        scrollOffset * (totalSamples - visibleSamples)
      );
      const endSample = Math.min(startSample + visibleSamples, totalSamples);

      const visibleStartTime = (startSample / totalSamples) * duration;
      const visibleEndTime = (endSample / totalSamples) * duration;
      const visibleDuration = visibleEndTime - visibleStartTime;

      // Calculate playhead position as percentage of visible area
      const playheadPercentage =
        (currentTime - visibleStartTime) / visibleDuration;

      const newVisibleSamples = totalSamples / newZoom;
      const newVisibleDuration = (newVisibleSamples / totalSamples) * duration;
      const newVisibleStartTime =
        currentTime - playheadPercentage * newVisibleDuration;
      const newStartSample = (newVisibleStartTime / duration) * totalSamples;
      const maxStartSample = totalSamples - newVisibleSamples;
      const newScrollOffset = Math.max(
        0,
        Math.min(1, newStartSample / maxStartSample)
      );

      setScrollOffset(newScrollOffset);
    }

    setZoom(newZoom);
  };

  const handleClearClips = () => {
    if (onClipsChange) {
      onClipsChange([]);
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        {clips.length > 0 && (
          <Button
            onClick={handleClearClips}
            variant="outline"
            size="sm"
            className="font-mono bg-background/80 backdrop-blur-sm h-8 px-2 text-xs uppercase tracking-wider"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
        <Button
          onClick={handleZoomOut}
          variant="outline"
          size="sm"
          className="font-mono bg-background/80 backdrop-blur-sm h-8 w-8 p-0"
          disabled={zoom <= 1}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          onClick={handleZoomIn}
          variant="outline"
          size="sm"
          className="font-mono bg-background/80 backdrop-blur-sm h-8 w-8 p-0"
          disabled={zoom >= 20}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-[150px] md:h-[200px]"
        style={
          {
            "--color-background": "var(--background)",
            "--color-foreground": "var(--foreground)",
            cursor: cursorStyle,
            touchAction: "none", // Prevent browser handling of touch gestures
          } as React.CSSProperties
        }
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      />
    </div>
  );
}
