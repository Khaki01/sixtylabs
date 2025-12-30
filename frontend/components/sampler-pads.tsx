"use client";

import { useEffect, useState } from "react";
import type { SamplerPad, Clip } from "@/types/audio";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SamplerPadsProps {
  pads: SamplerPad[];
  clips: Clip[];
  onPadTrigger: (padId: number) => void;
  onPadAssignClip: (padId: number, clipId: string | null) => void;
  mode: 'sampler' | 'sequencer';
  onModeChange: (mode: 'sampler' | 'sequencer') => void;
}

export default function SamplerPads({
  pads,
  clips,
  onPadTrigger,
  onPadAssignClip,
  mode,
  onModeChange,
}: SamplerPadsProps) {

  // Keyboard shortcuts for pad triggering (only in sampler mode)
  useEffect(() => {
    if (mode !== 'sampler') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent triggering if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Find pad with matching key binding
      const key = e.key.toUpperCase();
      const pad = pads.find(p => p.keyBinding === key);

      if (pad && !e.repeat) {
        onPadTrigger(pad.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pads, onPadTrigger, mode]);

  const handlePadClick = (padId: number) => {
    if (mode === 'sampler') {
      onPadTrigger(padId);
    }
  };

  const handleAssignClip = (padId: number, clipId: string | null) => {
    onPadAssignClip(padId, clipId);
  };

  const getPadDisplay = (pad: SamplerPad) => {
    const assignedClip = clips.find(c => c.id === pad.clipId);
    if (assignedClip) {
      return {
        label: assignedClip.name || `Clip ${clips.indexOf(assignedClip) + 1}`,
        color: assignedClip.color,
      };
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm uppercase tracking-wider">
          Pads
        </h3>

        {/* Mode Switcher */}
        <div className="flex border-2 border-foreground">
          <button
            onClick={() => onModeChange('sampler')}
            className={`
              px-3 py-1 font-mono text-xs uppercase tracking-wider transition-colors
              ${mode === 'sampler'
                ? 'bg-foreground text-background'
                : 'bg-background text-foreground hover:bg-muted'
              }
            `}
          >
            Sampler
          </button>
          <button
            onClick={() => onModeChange('sequencer')}
            className={`
              px-3 py-1 font-mono text-xs uppercase tracking-wider transition-colors border-l-2 border-foreground
              ${mode === 'sequencer'
                ? 'bg-foreground text-background'
                : 'bg-background text-foreground hover:bg-muted'
              }
            `}
          >
            Sequencer
          </button>
        </div>
      </div>

      {/* 8x2 Pad Grid */}
      <div className="grid grid-cols-8 gap-2">
        {pads.map((pad) => {
          const display = getPadDisplay(pad);
          const isActive = pad.clipId !== null;
          const isPlaying = pad.isPlaying;

          return (
            <div key={pad.id} className="relative">
              {/* Main pad button - triggers playback */}
              <Button
                variant="outline"
                className={`
                  relative h-20 w-full font-mono border-2 transition-all
                  ${isPlaying
                    ? 'border-white shadow-[0_0_0_2px_white] animate-pulse'
                    : isActive
                      ? 'bg-muted border-foreground hover:bg-muted/80'
                      : 'border-foreground/30 hover:border-foreground/50'
                  }
                `}
                onClick={() => handlePadClick(pad.id)}
              >
                <div className="flex flex-col items-center justify-center gap-1 w-full">
                  {/* Key binding */}
                  <div className="text-xs font-bold text-muted-foreground">
                    {pad.keyBinding}
                  </div>

                  {/* Clip name or empty state */}
                  {display ? (
                    <div className="text-xs text-center truncate w-full px-1 text-foreground">
                      {display.label}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Empty
                    </div>
                  )}

                  {/* Pad number */}
                  <div className="text-[10px] text-muted-foreground/50">
                    #{pad.id + 1}
                  </div>
                </div>
              </Button>

              {/* 3-dot menu button in top-right corner */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 h-5 w-5 p-0 hover:bg-muted"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>

                {/* Dropdown for clip assignment */}
                <DropdownMenuContent className="font-mono" align="end">
                  {clips.length > 0 && (
                    <>
                      <DropdownMenuItem
                        className="text-xs text-muted-foreground"
                        disabled
                      >
                        Assign Clip:
                      </DropdownMenuItem>
                      {clips.map((clip, index) => (
                        <DropdownMenuItem
                          key={clip.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignClip(pad.id, clip.id);
                          }}
                        >
                          <span className="text-xs">
                            {index + 1}. {clip.name || `Clip ${index + 1}`}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}

                  {pad.clipId && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssignClip(pad.id, null);
                      }}
                      className="text-red-500"
                    >
                      Clear Assignment
                    </DropdownMenuItem>
                  )}

                  {clips.length === 0 && !pad.clipId && (
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                      No clips available
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      {mode === 'sampler' && (
        <div className="font-mono text-xs text-muted-foreground text-center space-y-1">
          <p>Click pads or use keyboard shortcuts to play clips</p>
          <p className="text-[10px]">Use 3-dot menu to assign clips to pads</p>
        </div>
      )}
      {mode === 'sequencer' && (
        <div className="font-mono text-xs text-muted-foreground text-center space-y-1">
          <p>Press main play button to auto-play assigned pads in sequence</p>
        </div>
      )}
    </div>
  );
}
