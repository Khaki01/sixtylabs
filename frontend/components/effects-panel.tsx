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

interface EffectsPanelProps {
  effects: {
    volume: number;
    pitch: number;
    reverse: boolean;
    delayTime: number;
    delayFeedback: number;
    delayMix: number;
    reverbRoomSize: number;
    reverbDecay: number;
    reverbMix: number;
    convolverMix: number;

    // flags
    pitchEnabled: boolean;
    delayEnabled: boolean;
    reverbEnabled: boolean;
    convolverEnabled: boolean;
  };
  setEffects: (effects: any) => void;
}

const AVAILABLE_EFFECTS = [
  { id: "delay", name: "Delay", number: "EE01" },
  { id: "reverb", name: "Reverb", number: "EE02" },
  { id: "convolver", name: "Convolver", number: "EE03" },
];

export default function EffectsPanel({
  effects,
  setEffects,
}: EffectsPanelProps) {
  const [enabledEffects, setEnabledEffects] = useState<string[]>([]);
  const [pitchTimeEnabled, setPitchTimeEnabled] = useState(true);
  const [delayEnabled, setDelayEnabled] = useState(false);
  const [reverbEnabled, setReverbEnabled] = useState(false);
  const [convolverEnabled, setConvolverEnabled] = useState(false);

  const addEffect = (effectType: string) => {
    if (!enabledEffects.includes(effectType)) {
      setEnabledEffects([...enabledEffects, effectType]);
    }
  };

  const removeEffect = (effectType: string) => {
    setEnabledEffects(enabledEffects.filter((e) => e !== effectType));
    if (effectType === "delay") {
      setEffects({
        ...effects,
        delayEnabled: false,
      });
    }
    if (effectType === "reverb") {
      setEffects({
        ...effects,
        reverbEnabled: false,
      });
    }
  };

  const togglePitchTime = () => {
    const newEnabled = !pitchTimeEnabled;
    setPitchTimeEnabled(newEnabled);
    setEffects({
      ...effects,
      pitchEnabled: newEnabled,
    });
  };

  const toggleDelay = () => {
    const newEnabled = !delayEnabled;
    setDelayEnabled(newEnabled);

    setEffects({
      ...effects,
      delayEnabled: newEnabled,
    });
  };

  const toggleReverb = () => {
    const newEnabled = !reverbEnabled;
    setReverbEnabled(newEnabled);

    setEffects({
      ...effects,
      reverbEnabled: newEnabled,
    });
  };

  const toggleConvolver = () => {
    const newEnabled = !convolverEnabled;
    setConvolverEnabled(newEnabled);

    setEffects({
      ...effects,
      convolverEnabled: newEnabled,
    });
  };

  const availableEffects = AVAILABLE_EFFECTS.filter(
    (effect) => !enabledEffects.includes(effect.id)
  );

  return (
    <div className="space-y-6">
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

      {/* Pitch & Time - Always visible */}
      <div className="border-2 border-foreground bg-muted/30 p-4 space-y-3 rounded-lg">
        <div className="flex items-center gap-3 pb-2">
          <button
            onClick={togglePitchTime}
            className={`px-2 py-1 font-mono text-sm font-medium border-2 transition-colors ${
              pitchTimeEnabled
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
            disabled={!pitchTimeEnabled}
          />
        </div>

        <Button
          variant={effects.reverse ? "default" : "outline"}
          onClick={() => setEffects({ ...effects, reverse: !effects.reverse })}
          className={`w-full font-mono uppercase tracking-wider ${
            effects.reverse ? "" : "bg-transparent"
          }`}
          disabled={!pitchTimeEnabled}
        >
          Reverse: {effects.reverse ? "ON" : "OFF"}
        </Button>
      </div>

      {enabledEffects.includes("delay") && (
        <div className="border-2 border-foreground bg-muted/30 p-4 space-y-3 rounded-lg">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleDelay}
                className={`px-2 py-1 font-mono text-sm font-medium border-2 transition-colors ${
                  delayEnabled
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-foreground border-foreground"
                }`}
              >
                EE01
              </button>
              <h3 className="font-mono text-base uppercase tracking-wider font-medium">
                Delay
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeEffect("delay")}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Time: {effects.delayTime.toFixed(2)}s
            </label>
            <Slider
              value={[effects.delayTime]}
              onValueChange={([value]) =>
                setEffects({ ...effects, delayTime: value })
              }
              min={0.01}
              max={2}
              step={0.01}
              disabled={!delayEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Feedback: {Math.round(effects.delayFeedback * 100)}%
            </label>
            <Slider
              value={[effects.delayFeedback]}
              onValueChange={([value]) =>
                setEffects({ ...effects, delayFeedback: value })
              }
              min={0}
              max={0.9}
              step={0.01}
              disabled={!delayEnabled}
            />
          </div>
        </div>
      )}

      {enabledEffects.includes("reverb") && (
        <div className="border-2 border-foreground bg-muted/30 p-4 space-y-3 rounded-lg">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleReverb}
                className={`px-2 py-1 font-mono text-sm font-medium border-2 transition-colors ${
                  reverbEnabled
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-foreground border-foreground"
                }`}
              >
                EE02
              </button>
              <h3 className="font-mono text-base uppercase tracking-wider font-medium">
                Reverb
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeEffect("reverb")}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Room Size: {Math.round(effects.reverbRoomSize * 100)}%
            </label>
            <Slider
              value={[effects.reverbRoomSize]}
              onValueChange={([value]) =>
                setEffects({ ...effects, reverbRoomSize: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!reverbEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Decay: {Math.round(effects.reverbDecay * 100)}%
            </label>
            <Slider
              value={[effects.reverbDecay]}
              onValueChange={([value]) =>
                setEffects({ ...effects, reverbDecay: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!reverbEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Mix: {Math.round(effects.reverbMix * 100)}%
            </label>
            <Slider
              value={[effects.reverbMix]}
              onValueChange={([value]) =>
                setEffects({ ...effects, reverbMix: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!reverbEnabled}
            />
          </div>
        </div>
      )}

      {enabledEffects.includes("convolver") && (
        <div className="border-2 border-foreground bg-muted/30 p-4 space-y-3 rounded-lg">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleConvolver}
                className={`px-2 py-1 font-mono text-sm font-medium border-2 transition-colors ${
                  convolverEnabled
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-foreground border-foreground"
                }`}
              >
                EE03
              </button>
              <h3 className="font-mono text-base uppercase tracking-wider font-medium">
                Convolver
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeEffect("convolver")}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Mix: {Math.round(effects.convolverMix * 100)}%
            </label>
            <Slider
              value={[effects.convolverMix]}
              onValueChange={([value]) =>
                setEffects({ ...effects, convolverMix: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!convolverEnabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
