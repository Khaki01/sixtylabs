"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface SamplerSequencerProps {
  bpm: number;
  onBPMChange: (bpm: number) => void;
  isPlaying: boolean;
  currentStep: number;
}

export default function SamplerSequencer({
  bpm,
  onBPMChange,
  isPlaying,
  currentStep,
}: SamplerSequencerProps) {
  return (
    <div className="border-2 border-foreground p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm uppercase tracking-wider">
          Sequencer Controls
        </h3>
      </div>

      {/* BPM Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-xs uppercase tracking-wider">
            BPM
          </Label>
          <span className="font-mono text-xs text-muted-foreground">
            {bpm}
          </span>
        </div>
        <Slider
          value={[bpm]}
          onValueChange={([value]) => onBPMChange(value)}
          min={60}
          max={240}
          step={1}
          className="w-full"
        />
      </div>

      {/* Step Indicator Grid (8 columns x 2 rows = 16 steps) */}
      <div className="space-y-2">
        <Label className="font-mono text-xs uppercase tracking-wider">
          Steps
        </Label>
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className={`
                h-6 border-2 transition-all
                ${isPlaying && i === currentStep
                  ? 'bg-foreground border-foreground'
                  : 'bg-background border-foreground/30'
                }
              `}
              title={`Step ${i + 1}`}
            />
          ))}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground text-center">
          {isPlaying ? `Step ${currentStep + 1} / 16` : 'Not Playing'}
        </div>
      </div>
    </div>
  );
}
