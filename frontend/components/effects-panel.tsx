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
    tremoloRate: number;
    tremoloDepth: number;
    tremoloMix: number;
    bitcrushBitDepth: number;
    bitcrushSampleRate: number;
    bitcrushMix: number;
    granularGrainSize: number;
    granularChaos: number;
    granularMix: number;
    radioDistortion: number;
    radioStatic: number;
    radioMix: number;
    drunkWobble: number;
    drunkSpeed: number;
    drunkMix: number;
    eqLowGain: number;
    eqMidGain: number;
    eqHighGain: number;
    eqMix: number;

    // flags
    pitchEnabled: boolean;
    delayEnabled: boolean;
    reverbEnabled: boolean;
    convolverEnabled: boolean;
    tremoloEnabled: boolean;
    bitcrushEnabled: boolean;
    granularEnabled: boolean;
    radioEnabled: boolean;
    drunkEnabled: boolean;
    eqEnabled: boolean;
  };
  setEffects: (effects: any) => void;
}

const AVAILABLE_EFFECTS = [
  { id: "delay", name: "Delay", number: "EE01" },
  { id: "reverb", name: "Reverb", number: "EE02" },
  { id: "convolver", name: "Convolver", number: "EE03" },
  { id: "tremolo", name: "Tremolo", number: "EE04" },
  { id: "bitcrush", name: "Bitcrush", number: "EE05" },
  { id: "granular", name: "Granular", number: "EE06" },
  { id: "radio", name: "Static Distortion", number: "EE07" },
  { id: "drunk", name: "Drunk", number: "EE08" },
  { id: "eq", name: "EQ Filter", number: "EE09" },
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
  const [tremoloEnabled, setTremoloEnabled] = useState(false);
  const [bitcrushEnabled, setBitcrushEnabled] = useState(false);
  const [granularEnabled, setGranularEnabled] = useState(false);
  const [radioEnabled, setRadioEnabled] = useState(false);
  const [drunkEnabled, setDrunkEnabled] = useState(false);
  const [eqEnabled, setEqEnabled] = useState(false);

  const addEffect = (effectType: string) => {
    if (!enabledEffects.includes(effectType)) {
      setEnabledEffects([...enabledEffects, effectType]);
      if (effectType === "delay") {
        setDelayEnabled(true);
        setEffects({
          ...effects,
          delayEnabled: true,
        });
      }
      if (effectType === "reverb") {
        setReverbEnabled(true);
        setEffects({
          ...effects,
          reverbEnabled: true,
        });
      }
      if (effectType === "convolver") {
        setConvolverEnabled(true);
        setEffects({
          ...effects,
          convolverEnabled: true,
        });
      }
      if (effectType === "tremolo") {
        setTremoloEnabled(true);
        setEffects({
          ...effects,
          tremoloEnabled: true,
        });
      }
      if (effectType === "bitcrush") {
        setBitcrushEnabled(true);
        setEffects({
          ...effects,
          bitcrushEnabled: true,
        });
      }
      if (effectType === "granular") {
        setGranularEnabled(true);
        setEffects({
          ...effects,
          granularEnabled: true,
        });
      }
      if (effectType === "radio") {
        setRadioEnabled(true);
        setEffects({
          ...effects,
          radioEnabled: true,
        });
      }
      if (effectType === "drunk") {
        setDrunkEnabled(true);
        setEffects({
          ...effects,
          drunkEnabled: true,
        });
      }
      if (effectType === "eq") {
        setEqEnabled(true);
        setEffects({
          ...effects,
          eqEnabled: true,
        });
      }
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
    if (effectType === "convolver") {
      setEffects({
        ...effects,
        convolverEnabled: false,
      });
    }
    if (effectType === "tremolo") {
      setEffects({
        ...effects,
        tremoloEnabled: false,
      });
    }
    if (effectType === "bitcrush") {
      setEffects({
        ...effects,
        bitcrushEnabled: false,
      });
    }
    if (effectType === "granular") {
      setEffects({
        ...effects,
        granularEnabled: false,
      });
    }
    if (effectType === "radio") {
      setEffects({
        ...effects,
        radioEnabled: false,
      });
    }
    if (effectType === "drunk") {
      setEffects({
        ...effects,
        drunkEnabled: false,
      });
    }
    if (effectType === "eq") {
      setEffects({
        ...effects,
        eqEnabled: false,
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

  const toggleTremolo = () => {
    const newEnabled = !tremoloEnabled;
    setTremoloEnabled(newEnabled);
    setEffects({
      ...effects,
      tremoloEnabled: newEnabled,
    });
  };

  const toggleBitcrush = () => {
    const newEnabled = !bitcrushEnabled;
    setBitcrushEnabled(newEnabled);
    setEffects({
      ...effects,
      bitcrushEnabled: newEnabled,
    });
  };

  const toggleGranular = () => {
    const newEnabled = !granularEnabled;
    setGranularEnabled(newEnabled);

    setEffects({
      ...effects,
      granularEnabled: newEnabled,
    });
  };

  const toggleRadio = () => {
    const newEnabled = !radioEnabled;
    setRadioEnabled(newEnabled);

    setEffects({
      ...effects,
      radioEnabled: newEnabled,
    });
  };

  const toggleDrunk = () => {
    const newEnabled = !drunkEnabled;
    setDrunkEnabled(newEnabled);

    setEffects({
      ...effects,
      drunkEnabled: newEnabled,
    });
  };

  const toggleEq = () => {
    const newEnabled = !eqEnabled;
    setEqEnabled(newEnabled);

    setEffects({
      ...effects,
      eqEnabled: newEnabled,
    });
  };

  const formatGain = (value: number) => {
    return `${Math.round(value * 100)}%`;
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
      {enabledEffects.includes("tremolo") && (
        <div className="border-2 border-foreground bg-muted/30 p-4 space-y-3 rounded-lg">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTremolo}
                className={`px-2 py-1 font-mono text-sm font-medium border-2 transition-colors ${
                  tremoloEnabled
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-foreground border-foreground"
                }`}
              >
                EE04
              </button>
              <h3 className="font-mono text-base uppercase tracking-wider font-medium">
                Tremolo
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeEffect("tremolo")}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Rate: {effects.tremoloRate.toFixed(1)} Hz
            </label>
            <Slider
              value={[effects.tremoloRate]}
              onValueChange={([value]) =>
                setEffects({ ...effects, tremoloRate: value })
              }
              min={0.1}
              max={20}
              step={0.1}
              disabled={!tremoloEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Depth: {Math.round(effects.tremoloDepth * 100)}%
            </label>
            <Slider
              value={[effects.tremoloDepth]}
              onValueChange={([value]) =>
                setEffects({ ...effects, tremoloDepth: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!tremoloEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Mix: {Math.round(effects.tremoloMix * 100)}%
            </label>
            <Slider
              value={[effects.tremoloMix]}
              onValueChange={([value]) =>
                setEffects({ ...effects, tremoloMix: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!tremoloEnabled}
            />
          </div>
        </div>
      )}
      {enabledEffects.includes("bitcrush") && (
        <div className="border-2 border-foreground bg-muted/30 p-4 space-y-3 rounded-lg">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleBitcrush}
                className={`px-2 py-1 font-mono text-sm font-medium border-2 transition-colors ${
                  bitcrushEnabled
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-foreground border-foreground"
                }`}
              >
                EE05
              </button>
              <h3 className="font-mono text-base uppercase tracking-wider font-medium">
                Bitcrush
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeEffect("bitcrush")}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Bit Depth: {Math.round(effects.bitcrushBitDepth)}bit
            </label>
            <Slider
              value={[effects.bitcrushBitDepth]}
              onValueChange={([value]) =>
                setEffects({ ...effects, bitcrushBitDepth: value })
              }
              min={1}
              max={16}
              step={1}
              disabled={!bitcrushEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Sample Rate: {Math.round(effects.bitcrushSampleRate * 100)}%
            </label>
            <Slider
              value={[effects.bitcrushSampleRate]}
              onValueChange={([value]) =>
                setEffects({ ...effects, bitcrushSampleRate: value })
              }
              min={0.01}
              max={1}
              step={0.01}
              disabled={!bitcrushEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Mix: {Math.round(effects.bitcrushMix * 100)}%
            </label>
            <Slider
              value={[effects.bitcrushMix]}
              onValueChange={([value]) =>
                setEffects({ ...effects, bitcrushMix: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!bitcrushEnabled}
            />
          </div>
        </div>
      )}
      {enabledEffects.includes("granular") && (
        <div className="border-2 border-foreground bg-muted/30 p-4 space-y-3 rounded-lg">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleGranular}
                className={`px-2 py-1 font-mono text-sm font-medium border-2 transition-colors ${
                  granularEnabled
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-foreground border-foreground"
                }`}
              >
                EE06
              </button>
              <h3 className="font-mono text-base uppercase tracking-wider font-medium">
                Granular
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeEffect("granular")}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Grain Size: {Math.round(effects.granularGrainSize * 1000)}ms
            </label>
            <Slider
              value={[effects.granularGrainSize]}
              onValueChange={([value]) =>
                setEffects({ ...effects, granularGrainSize: value })
              }
              min={0.01}
              max={0.5}
              step={0.01}
              disabled={!granularEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Chaos: {Math.round(effects.granularChaos * 100)}%
            </label>
            <Slider
              value={[effects.granularChaos]}
              onValueChange={([value]) =>
                setEffects({ ...effects, granularChaos: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!granularEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Mix: {Math.round(effects.granularMix * 100)}%
            </label>
            <Slider
              value={[effects.granularMix]}
              onValueChange={([value]) =>
                setEffects({ ...effects, granularMix: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!granularEnabled}
            />
          </div>
        </div>
      )}

      {enabledEffects.includes("radio") && (
        <div className="border-2 border-foreground bg-muted/30 p-4 space-y-3 rounded-lg">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleRadio}
                className={`px-2 py-1 font-mono text-sm font-medium border-2 transition-colors ${
                  radioEnabled
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-foreground border-foreground"
                }`}
              >
                EE07
              </button>
              <h3 className="font-mono text-base uppercase tracking-wider font-medium">
                Static Distortion
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeEffect("radio")}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Distortion: {Math.round(effects.radioDistortion * 100)}%
            </label>
            <Slider
              value={[effects.radioDistortion]}
              onValueChange={([value]) =>
                setEffects({ ...effects, radioDistortion: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!radioEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Static: {Math.round(effects.radioStatic * 100)}%
            </label>
            <Slider
              value={[effects.radioStatic]}
              onValueChange={([value]) =>
                setEffects({ ...effects, radioStatic: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!radioEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Mix: {Math.round(effects.radioMix * 100)}%
            </label>
            <Slider
              value={[effects.radioMix]}
              onValueChange={([value]) =>
                setEffects({ ...effects, radioMix: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!radioEnabled}
            />
          </div>
        </div>
      )}

      {enabledEffects.includes("drunk") && (
        <div className="border-2 border-foreground bg-muted/30 p-4 space-y-3 rounded-lg">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleDrunk}
                className={`px-2 py-1 font-mono text-sm font-medium border-2 transition-colors ${
                  drunkEnabled
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-foreground border-foreground"
                }`}
              >
                EE08
              </button>
              <h3 className="font-mono text-base uppercase tracking-wider font-medium">
                Drunk
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeEffect("drunk")}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Wobble: {effects.drunkWobble.toFixed(2)}
            </label>
            <Slider
              value={[effects.drunkWobble]}
              onValueChange={([value]) =>
                setEffects({ ...effects, drunkWobble: value })
              }
              min={0.1}
              max={2}
              step={0.01}
              disabled={!drunkEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Speed: {effects.drunkSpeed.toFixed(2)} Hz
            </label>
            <Slider
              value={[effects.drunkSpeed]}
              onValueChange={([value]) =>
                setEffects({ ...effects, drunkSpeed: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!drunkEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Mix: {Math.round(effects.drunkMix * 100)}%
            </label>
            <Slider
              value={[effects.drunkMix]}
              onValueChange={([value]) =>
                setEffects({ ...effects, drunkMix: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!drunkEnabled}
            />
          </div>
        </div>
      )}
      {enabledEffects.includes("eq") && (
        <div className="border-2 border-foreground bg-muted/30 p-4 space-y-3 rounded-lg">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleEq}
                className={`px-2 py-1 font-mono text-sm font-medium border-2 transition-colors ${
                  eqEnabled
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-foreground border-foreground"
                }`}
              >
                EE09
              </button>
              <h3 className="font-mono text-base uppercase tracking-wider font-medium">
                EQ Filter
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeEffect("eq")}
              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Low (Bass): {formatGain(effects.eqLowGain)}
            </label>
            <Slider
              value={[effects.eqLowGain]}
              onValueChange={([value]) =>
                setEffects({ ...effects, eqLowGain: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!eqEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Mid: {formatGain(effects.eqMidGain)}
            </label>
            <Slider
              value={[effects.eqMidGain]}
              onValueChange={([value]) =>
                setEffects({ ...effects, eqMidGain: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!eqEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              High (Treble): {formatGain(effects.eqHighGain)}
            </label>
            <Slider
              value={[effects.eqHighGain]}
              onValueChange={([value]) =>
                setEffects({ ...effects, eqHighGain: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!eqEnabled}
            />
          </div>

          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider">
              Mix: {Math.round(effects.eqMix * 100)}%
            </label>
            <Slider
              value={[effects.eqMix]}
              onValueChange={([value]) =>
                setEffects({ ...effects, eqMix: value })
              }
              min={0}
              max={1}
              step={0.01}
              disabled={!eqEnabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
