"use client";

import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PadEffects } from "@/types/audio";

interface PadEffectsPanelProps {
  selectedPadId: number | null;
  padEffects: PadEffects;
  onEffectsChange: (effects: PadEffects) => void;
}

export default function PadEffectsPanel({
  selectedPadId,
  padEffects,
  onEffectsChange,
}: PadEffectsPanelProps) {
  if (selectedPadId === null) {
    return (
      <div className="border-2 border-foreground p-4">
        <div className="font-mono text-sm text-muted-foreground text-center">
          Select a pad to edit its effects
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-foreground p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-mono text-sm uppercase tracking-wider">
          Pad #{selectedPadId + 1} Effects
        </h4>
      </div>

      {/* Pitch */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-xs uppercase tracking-wider">
            Pitch
          </Label>
          <span className="font-mono text-xs text-muted-foreground">
            {padEffects.pitch.toFixed(2)}x
          </span>
        </div>
        <Slider
          value={[padEffects.pitch]}
          onValueChange={([value]) =>
            onEffectsChange({ ...padEffects, pitch: value })
          }
          min={0.25}
          max={4}
          step={0.01}
          className="w-full"
        />
      </div>

      {/* Reverse */}
      <div className="flex items-center justify-between border-2 border-foreground p-2">
        <Label className="font-mono text-xs uppercase tracking-wider">
          Reverse
        </Label>
        <Switch
          checked={padEffects.reverse}
          onCheckedChange={(checked) =>
            onEffectsChange({ ...padEffects, reverse: checked })
          }
        />
      </div>

      {/* Delay Mix */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-xs uppercase tracking-wider">
            Delay Mix
          </Label>
          <span className="font-mono text-xs text-muted-foreground">
            {Math.round(padEffects.delayMix * 100)}%
          </span>
        </div>
        <Slider
          value={[padEffects.delayMix]}
          onValueChange={([value]) =>
            onEffectsChange({ ...padEffects, delayMix: value })
          }
          min={0}
          max={1}
          step={0.01}
          className="w-full"
        />
      </div>

      {/* Reverb Mix */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-mono text-xs uppercase tracking-wider">
            Reverb Mix
          </Label>
          <span className="font-mono text-xs text-muted-foreground">
            {Math.round(padEffects.reverbMix * 100)}%
          </span>
        </div>
        <Slider
          value={[padEffects.reverbMix]}
          onValueChange={([value]) =>
            onEffectsChange({ ...padEffects, reverbMix: value })
          }
          min={0}
          max={1}
          step={0.01}
          className="w-full"
        />
      </div>

      {/* Reset Button */}
      <button
        onClick={() =>
          onEffectsChange({
            pitch: 1.0,
            reverse: false,
            delayMix: 0,
            reverbMix: 0,
          })
        }
        className="w-full border-2 border-foreground p-2 font-mono text-xs uppercase tracking-wider hover:bg-muted transition-colors"
      >
        Reset to Default
      </button>
    </div>
  );
}
