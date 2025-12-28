// Audio-related types for the entire application

export interface Clip {
  id: string;
  startTime: number; // In seconds (actual audio buffer time)
  endTime: number; // In seconds (actual audio buffer time)
  visualStartTime: number; // Visual representation (may differ when reversed)
  visualEndTime: number; // Visual representation (may differ when reversed)
  // Sampler-specific properties
  color?: string; // Visual distinction on waveform (prevents missing color bug)
  name?: string; // User-friendly label
  padAssignment?: number; // Which pad (0-15) this clip is assigned to
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

// Sampler/Sequencer types

export interface PadEffects {
  pitch: number; // Playback rate (0.25 - 4.0)
  reverse: boolean; // Reverse audio playback
  delayMix: number; // Delay wet/dry mix (0 - 1)
  reverbMix: number; // Reverb wet/dry mix (0 - 1)
}

export interface SamplerPad {
  id: number; // 0-15
  clipId: string | null; // Reference to assigned Clip
  effects: PadEffects; // Per-pad effect settings
  isPlaying: boolean; // Currently playing state
  keyBinding: string; // Keyboard shortcut (1-4, Q-W-E-R, etc.)
}

export interface SequencerState {
  isEnabled: boolean; // Sequencer mode active
  bpm: number; // Beats per minute (60-240)
  currentStep: number; // Current step in sequence (0-15)
  isPlaying: boolean; // Sequencer is playing
  sequence: number[]; // Array of pad indices to play in order
}

export interface SamplerState {
  pads: SamplerPad[]; // 16 pads
  clips: Clip[]; // Multiple clips (replaces single clip)
  sequencer: SequencerState; // Sequencer state
  mode: 'realtime' | 'sequencer'; // Current mode
}

// Default values

export const DEFAULT_PAD_EFFECTS: PadEffects = {
  pitch: 1.0,
  reverse: false,
  delayMix: 0,
  reverbMix: 0,
};

export const PAD_KEY_BINDINGS = [
  '1', '2', '3', '4',    // Row 1
  'Q', 'W', 'E', 'R',    // Row 2
  'A', 'S', 'D', 'F',    // Row 3
  'Z', 'X', 'C', 'V'     // Row 4
];
