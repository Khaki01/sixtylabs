// Audio-related types for the entire application

export interface Clip {
  id: string;
  startTime: number; // In seconds (actual audio buffer time)
  endTime: number; // In seconds (actual audio buffer time)
  visualStartTime: number; // Visual representation (may differ when reversed)
  visualEndTime: number; // Visual representation (may differ when reversed)
}

export interface EffectsState {
  // Volume & Pitch
  volume: number;
  pitch: number;
  reverse: boolean;

  // Delay
  delayTime: number;
  delayFeedback: number;
  delayMix: number;

  // Reverb
  reverbRoomSize: number;
  reverbDecay: number;
  reverbMix: number;

  // Convolver
  convolverMix: number;

  // Tremolo
  tremoloRate: number;
  tremoloDepth: number;
  tremoloMix: number;

  // EQ
  eqLowGain: number;
  eqMidGain: number;
  eqHighGain: number;
  eqMix: number;

  // Bitcrush
  bitcrushBitDepth: number;
  bitcrushSampleRate: number;
  bitcrushMix: number;

  // Granular
  granularGrainSize: number;
  granularOverlap: number;
  granularChaos: number;
  granularMix: number;
  granularPitch: number;

  // Radio
  radioDistortion: number;
  radioStatic: number;
  radioMix: number;

  // Drunk
  drunkWobble: number;
  drunkSpeed: number;
  drunkMix: number;

  // Repeat
  repeat: number;
  repeatCycleSize: number;

  // Effect enable flags
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
  repeatEnabled: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLooping: boolean;
}

export interface AudioEngineConfig {
  sampleRate?: number;
  latencyHint?: AudioContextLatencyCategory;
}

export type EffectType =
  | "delay"
  | "reverb"
  | "convolver"
  | "tremolo"
  | "bitcrush"
  | "granular"
  | "radio"
  | "drunk"
  | "eq"
  | "repeat";

export interface EffectMetadata {
  id: EffectType;
  name: string;
  number: string;
  category: "time" | "modulation" | "frequency" | "distortion" | "special";
}

export const EFFECT_METADATA: Record<EffectType, EffectMetadata> = {
  delay: { id: "delay", name: "Delay", number: "EE01", category: "time" },
  reverb: { id: "reverb", name: "Reverb", number: "EE02", category: "time" },
  convolver: {
    id: "convolver",
    name: "Convolver",
    number: "EE03",
    category: "time",
  },
  tremolo: {
    id: "tremolo",
    name: "Tremolo",
    number: "EE04",
    category: "modulation",
  },
  bitcrush: {
    id: "bitcrush",
    name: "Bitcrush",
    number: "EE05",
    category: "distortion",
  },
  granular: {
    id: "granular",
    name: "Granular",
    number: "EE06",
    category: "special",
  },
  radio: {
    id: "radio",
    name: "Static Distortion",
    number: "EE07",
    category: "distortion",
  },
  drunk: { id: "drunk", name: "Drunk", number: "EE08", category: "modulation" },
  eq: { id: "eq", name: "EQ Filter", number: "EE09", category: "frequency" },
  repeat: { id: "repeat", name: "Repeat", number: "EE10", category: "special" },
};
