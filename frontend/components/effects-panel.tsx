"use client";

import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EffectsState, EffectType } from "@/types/audio";
import { EFFECT_METADATA } from "@/types/audio";

interface EffectsPanelProps {
  effects: EffectsState;
  setEffects: (effects: EffectsState) => void;
}

export default function EffectsPanel({
  effects,
  setEffects,
}: EffectsPanelProps) {
  const [enabledEffects, setEnabledEffects] = useState<EffectType[]>([]);

  // Helper to check if an effect is enabled
  const isEffectEnabled = (effectId: EffectType): boolean => {
    const key = `${effectId}Enabled` as keyof EffectsState;
    return effects[key] as boolean;
  };

  // Toggle effect on/off
  const toggleEffect = (effectId: EffectType) => {
    const key = `${effectId}Enabled` as keyof EffectsState;
    setEffects({ ...effects, [key]: !effects[key] });
  };

  // Add effect to panel
  const addEffect = (effectId: EffectType) => {
    if (!enabledEffects.includes(effectId)) {
      setEnabledEffects([...enabledEffects, effectId]);
      const key = `${effectId}Enabled` as keyof EffectsState;
      setEffects({ ...effects, [key]: true });
    }
  };

  // Remove effect from panel
  const removeEffect = (effectId: EffectType) => {
    setEnabledEffects(enabledEffects.filter((e) => e !== effectId));
    const key = `${effectId}Enabled` as keyof EffectsState;
    setEffects({ ...effects, [key]: false });
  };

  const formatGain = (value: number) => `${Math.round(value * 100)}%`;

  const availableEffects = Object.values(EFFECT_METADATA).filter(
    (effect) => !enabledEffects.includes(effect.id)
  );

  return (
    <div className="space-y-6 relative">
      <div className="sticky top-0 z-20 bg-background pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-full font-mono uppercase tracking-wider bg-transparent border-2"
              disabled={availableEffects.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add effect
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] font-mono">
            {availableEffects.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                No effects available
              </div>
            ) : (
              availableEffects.map((effect) => (
                <DropdownMenuItem
                  key={effect.id}
                  onClick={() => addEffect(effect.id)}
                  className="uppercase tracking-wider text-xs cursor-pointer py-3 px-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-foreground text-background px-2 py-1 font-mono text-sm font-medium border-2 border-foreground">
                      {effect.number}
                    </div>
                    <span className="font-semibold">{effect.name}</span>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Pitch & Time - Always visible */}
      <div className="border-2 border-foreground bg-muted/30 p-4 space-y-3 rounded-lg">
        <div className="flex items-center gap-3 pb-2">
          <button
            onClick={() =>
              setEffects({ ...effects, pitchEnabled: !effects.pitchEnabled })
            }
            className={`px-2 py-1 font-mono text-sm font-medium border-2 transition-colors ${
              effects.pitchEnabled
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-foreground border-foreground"
            }`}
          >
            EE00
          </button>
          <h3 className="font-mono text-base uppercase tracking-wider font-medium">
            Pitch &amp; Time
          </h3>
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase tracking-wider">
            Pitch: {effects.pitch.toFixed(2)}x
          </label>
          <Slider
            value={[effects.pitch]}
            onValueChange={([value]) =>
              setEffects({ ...effects, pitch: value })
            }
            min={0.25}
            max={4}
            step={0.01}
            disabled={!effects.pitchEnabled}
          />
        </div>

        <Button
          variant={effects.reverse ? "default" : "outline"}
          onClick={() => setEffects({ ...effects, reverse: !effects.reverse })}
          className={`w-full font-mono uppercase tracking-wider ${
            effects.reverse ? "" : "bg-transparent"
          }`}
          disabled={!effects.pitchEnabled}
        >
          Reverse: {effects.reverse ? "ON" : "OFF"}
        </Button>
      </div>

      {/* Delay Effect */}
      {enabledEffects.includes("delay") && (
        <EffectCard
          effectId="delay"
          title="Delay"
          number="EE01"
          isEnabled={isEffectEnabled("delay")}
          onToggle={() => toggleEffect("delay")}
          onRemove={() => removeEffect("delay")}
        >
          <EffectSlider
            label="Time"
            value={effects.delayTime}
            onChange={(value) => setEffects({ ...effects, delayTime: value })}
            min={0.01}
            max={2}
            step={0.01}
            format={(v) => `${v.toFixed(2)}s`}
            disabled={!isEffectEnabled("delay")}
          />
          <EffectSlider
            label="Feedback"
            value={effects.delayFeedback}
            onChange={(value) =>
              setEffects({ ...effects, delayFeedback: value })
            }
            min={0}
            max={0.9}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("delay")}
          />
        </EffectCard>
      )}

      {/* Reverb Effect */}
      {enabledEffects.includes("reverb") && (
        <EffectCard
          effectId="reverb"
          title="Reverb"
          number="EE02"
          isEnabled={isEffectEnabled("reverb")}
          onToggle={() => toggleEffect("reverb")}
          onRemove={() => removeEffect("reverb")}
        >
          <EffectSlider
            label="Room Size"
            value={effects.reverbRoomSize}
            onChange={(value) =>
              setEffects({ ...effects, reverbRoomSize: value })
            }
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("reverb")}
          />
          <EffectSlider
            label="Decay"
            value={effects.reverbDecay}
            onChange={(value) => setEffects({ ...effects, reverbDecay: value })}
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("reverb")}
          />
          <EffectSlider
            label="Mix"
            value={effects.reverbMix}
            onChange={(value) => setEffects({ ...effects, reverbMix: value })}
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("reverb")}
          />
        </EffectCard>
      )}

      {/* Convolver Effect */}
      {enabledEffects.includes("convolver") && (
        <EffectCard
          effectId="convolver"
          title="Convolver"
          number="EE03"
          isEnabled={isEffectEnabled("convolver")}
          onToggle={() => toggleEffect("convolver")}
          onRemove={() => removeEffect("convolver")}
        >
          <EffectSlider
            label="Mix"
            value={effects.convolverMix}
            onChange={(value) =>
              setEffects({ ...effects, convolverMix: value })
            }
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("convolver")}
          />
        </EffectCard>
      )}

      {/* Tremolo Effect */}
      {enabledEffects.includes("tremolo") && (
        <EffectCard
          effectId="tremolo"
          title="Tremolo"
          number="EE04"
          isEnabled={isEffectEnabled("tremolo")}
          onToggle={() => toggleEffect("tremolo")}
          onRemove={() => removeEffect("tremolo")}
        >
          <EffectSlider
            label="Rate"
            value={effects.tremoloRate}
            onChange={(value) => setEffects({ ...effects, tremoloRate: value })}
            min={0.1}
            max={20}
            step={0.1}
            format={(v) => `${v.toFixed(1)} Hz`}
            disabled={!isEffectEnabled("tremolo")}
          />
          <EffectSlider
            label="Depth"
            value={effects.tremoloDepth}
            onChange={(value) =>
              setEffects({ ...effects, tremoloDepth: value })
            }
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("tremolo")}
          />
          <EffectSlider
            label="Mix"
            value={effects.tremoloMix}
            onChange={(value) => setEffects({ ...effects, tremoloMix: value })}
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("tremolo")}
          />
        </EffectCard>
      )}

      {/* Bitcrush Effect */}
      {enabledEffects.includes("bitcrush") && (
        <EffectCard
          effectId="bitcrush"
          title="Bitcrush"
          number="EE05"
          isEnabled={isEffectEnabled("bitcrush")}
          onToggle={() => toggleEffect("bitcrush")}
          onRemove={() => removeEffect("bitcrush")}
        >
          <EffectSlider
            label="Bit Depth"
            value={effects.bitcrushBitDepth}
            onChange={(value) =>
              setEffects({ ...effects, bitcrushBitDepth: value })
            }
            min={1}
            max={16}
            step={1}
            format={(v) => `${Math.round(v)}bit`}
            disabled={!isEffectEnabled("bitcrush")}
          />
          <EffectSlider
            label="Sample Rate"
            value={effects.bitcrushSampleRate}
            onChange={(value) =>
              setEffects({ ...effects, bitcrushSampleRate: value })
            }
            min={0.01}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("bitcrush")}
          />
          <EffectSlider
            label="Mix"
            value={effects.bitcrushMix}
            onChange={(value) => setEffects({ ...effects, bitcrushMix: value })}
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("bitcrush")}
          />
        </EffectCard>
      )}

      {/* Granular Effect */}
      {enabledEffects.includes("granular") && (
        <EffectCard
          effectId="granular"
          title="Granular"
          number="EE06"
          isEnabled={isEffectEnabled("granular")}
          onToggle={() => toggleEffect("granular")}
          onRemove={() => removeEffect("granular")}
        >
          <EffectSlider
            label="Grain Size"
            value={effects.granularGrainSize}
            onChange={(value) =>
              setEffects({ ...effects, granularGrainSize: value })
            }
            min={0.01}
            max={0.5}
            step={0.01}
            format={(v) => `${Math.round(v * 1000)}ms`}
            disabled={!isEffectEnabled("granular")}
          />
          <EffectSlider
            label="Chaos"
            value={effects.granularChaos}
            onChange={(value) =>
              setEffects({ ...effects, granularChaos: value })
            }
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("granular")}
          />
          <EffectSlider
            label="Mix"
            value={effects.granularMix}
            onChange={(value) => setEffects({ ...effects, granularMix: value })}
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("granular")}
          />
        </EffectCard>
      )}

      {/* Radio Effect */}
      {enabledEffects.includes("radio") && (
        <EffectCard
          effectId="radio"
          title="Static Distortion"
          number="EE07"
          isEnabled={isEffectEnabled("radio")}
          onToggle={() => toggleEffect("radio")}
          onRemove={() => removeEffect("radio")}
        >
          <EffectSlider
            label="Distortion"
            value={effects.radioDistortion}
            onChange={(value) =>
              setEffects({ ...effects, radioDistortion: value })
            }
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("radio")}
          />
          <EffectSlider
            label="Static"
            value={effects.radioStatic}
            onChange={(value) => setEffects({ ...effects, radioStatic: value })}
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("radio")}
          />
          <EffectSlider
            label="Mix"
            value={effects.radioMix}
            onChange={(value) => setEffects({ ...effects, radioMix: value })}
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("radio")}
          />
        </EffectCard>
      )}

      {/* Drunk Effect */}
      {enabledEffects.includes("drunk") && (
        <EffectCard
          effectId="drunk"
          title="Drunk"
          number="EE08"
          isEnabled={isEffectEnabled("drunk")}
          onToggle={() => toggleEffect("drunk")}
          onRemove={() => removeEffect("drunk")}
        >
          <EffectSlider
            label="Wobble"
            value={effects.drunkWobble}
            onChange={(value) => setEffects({ ...effects, drunkWobble: value })}
            min={0.1}
            max={2}
            step={0.01}
            format={(v) => v.toFixed(2)}
            disabled={!isEffectEnabled("drunk")}
          />
          <EffectSlider
            label="Speed"
            value={effects.drunkSpeed}
            onChange={(value) => setEffects({ ...effects, drunkSpeed: value })}
            min={0}
            max={1}
            step={0.01}
            format={(v) => `${v.toFixed(2)} Hz`}
            disabled={!isEffectEnabled("drunk")}
          />
          <EffectSlider
            label="Mix"
            value={effects.drunkMix}
            onChange={(value) => setEffects({ ...effects, drunkMix: value })}
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("drunk")}
          />
        </EffectCard>
      )}

      {/* EQ Effect */}
      {enabledEffects.includes("eq") && (
        <EffectCard
          effectId="eq"
          title="EQ Filter"
          number="EE09"
          isEnabled={isEffectEnabled("eq")}
          onToggle={() => toggleEffect("eq")}
          onRemove={() => removeEffect("eq")}
        >
          <EffectSlider
            label="Low (Bass)"
            value={effects.eqLowGain}
            onChange={(value) => setEffects({ ...effects, eqLowGain: value })}
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("eq")}
          />
          <EffectSlider
            label="Mid"
            value={effects.eqMidGain}
            onChange={(value) => setEffects({ ...effects, eqMidGain: value })}
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("eq")}
          />
          <EffectSlider
            label="High (Treble)"
            value={effects.eqHighGain}
            onChange={(value) => setEffects({ ...effects, eqHighGain: value })}
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("eq")}
          />
          <EffectSlider
            label="Mix"
            value={effects.eqMix}
            onChange={(value) => setEffects({ ...effects, eqMix: value })}
            min={0}
            max={1}
            step={0.01}
            format={formatGain}
            disabled={!isEffectEnabled("eq")}
          />
        </EffectCard>
      )}

      {/* Repeat Effect */}
      {enabledEffects.includes("repeat") && (
        <EffectCard
          effectId="repeat"
          title="Repeat"
          number="EE10"
          isEnabled={isEffectEnabled("repeat")}
          onToggle={() => toggleEffect("repeat")}
          onRemove={() => removeEffect("repeat")}
        >
          <EffectSlider
            label="Repeat Factor"
            value={effects.repeat}
            onChange={(value) => setEffects({ ...effects, repeat: value })}
            min={1}
            max={6}
            step={0.1}
            format={(v) => `${v.toFixed(1)}x`}
            disabled={!isEffectEnabled("repeat")}
          />
          <EffectSlider
            label="Cycle Size"
            value={effects.repeatCycleSize}
            onChange={(value) =>
              setEffects({ ...effects, repeatCycleSize: value })
            }
            min={50}
            max={500}
            step={10}
            format={(v) => `${v}ms`}
            disabled={!isEffectEnabled("repeat")}
          />
        </EffectCard>
      )}
    </div>
  );
}

// Reusable Effect Card Component
function EffectCard({
  effectId,
  title,
  number,
  isEnabled,
  onToggle,
  onRemove,
  children,
}: {
  effectId: string;
  title: string;
  number: string;
  isEnabled: boolean;
  onToggle: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-2 border-foreground bg-muted/30 p-4 space-y-3 rounded-lg">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className={`px-2 py-1 font-mono text-sm font-medium border-2 transition-colors ${
              isEnabled
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-foreground border-foreground"
            }`}
          >
            {number}
          </button>
          <h3 className="font-mono text-base uppercase tracking-wider font-medium">
            {title}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      {children}
    </div>
  );
}

// Reusable Effect Slider Component
function EffectSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="font-mono text-xs uppercase tracking-wider">
        {label}: {format(value)}
      </label>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
    </div>
  );
}
