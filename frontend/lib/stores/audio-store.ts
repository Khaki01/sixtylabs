import { create } from "zustand";
import type { EffectsState, SamplerState, SamplerPad, Clip } from "@/types/audio";
import { PAD_KEY_BINDINGS } from "@/types/audio";
import { AudioEngine } from "@/lib/audio/AudioEngine";
import { SamplerEngine } from "@/lib/audio/SamplerEngine";
import { SequencerEngine } from "@/lib/audio/SequencerEngine";

// Default effects state
const DEFAULT_EFFECTS: EffectsState = {
  volume: 1.0,
  pitch: 1,
  reverse: false,
  delayTime: 0.3,
  delayFeedback: 0.3,
  delayMix: 0.5,
  reverbRoomSize: 0.5,
  reverbDecay: 0.5,
  reverbMix: 0.5,
  convolverMix: 0.5,
  tremoloRate: 5,
  tremoloDepth: 0.5,
  tremoloMix: 0.5,
  eqLowGain: 1,
  eqMidGain: 1,
  eqHighGain: 1,
  eqMix: 1.0,
  bitcrushBitDepth: 8,
  bitcrushSampleRate: 0.5,
  bitcrushMix: 0.5,
  granularGrainSize: 0.1,
  granularOverlap: 0.5,
  granularChaos: 0.5,
  granularMix: 0.5,
  granularPitch: 1,
  radioDistortion: 0.5,
  radioStatic: 0.3,
  radioMix: 0.5,
  drunkWobble: 0.5,
  drunkSpeed: 0.5,
  drunkMix: 0.5,
  repeat: 1,
  repeatCycleSize: 100,
  pitchEnabled: true,
  delayEnabled: false,
  reverbEnabled: false,
  convolverEnabled: false,
  tremoloEnabled: false,
  bitcrushEnabled: false,
  granularEnabled: false,
  radioEnabled: false,
  drunkEnabled: false,
  eqEnabled: false,
  repeatEnabled: false,
};

// Initialize default pads
const initializePads = (): SamplerPad[] => {
  return Array.from({ length: 16 }, (_, i) => ({
    id: i,
    clipId: null,
    isPlaying: false,
    keyBinding: PAD_KEY_BINDINGS[i],
  }));
};

const DEFAULT_SAMPLER_STATE: SamplerState = {
  pads: initializePads(),
  clips: [],
  sequencer: {
    bpm: 120,
    currentStep: 0,
    isPlaying: false,
  },
  mode: "sampler",
};

interface AudioStore {
  // Audio file and buffer
  audioFile: File | null;
  audioBuffer: AudioBuffer | null;

  // Effects and sampler state
  effects: EffectsState;
  samplerState: SamplerState;

  // Playback state
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLooping: boolean;

  // Engine instances (singletons)
  audioEngine: AudioEngine | null;
  samplerEngine: SamplerEngine | null;
  sequencerEngine: SequencerEngine | null;
  enginesInitialized: boolean;

  // Actions
  setAudioFile: (file: File | null) => void;
  setAudioBuffer: (buffer: AudioBuffer | null) => void;
  setEffects: (effects: EffectsState) => void;
  setSamplerState: (state: SamplerState) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLooping: (looping: boolean) => void;

  // Engine management
  initializeEngines: () => void;
  getAudioEngine: () => AudioEngine | null;
  getSamplerEngine: () => SamplerEngine | null;
  getSequencerEngine: () => SequencerEngine | null;

  // Navigation helper - pauses audio before navigating
  pauseForNavigation: () => void;

  // Reset all state
  reset: () => void;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  // Initial state
  audioFile: null,
  audioBuffer: null,
  effects: DEFAULT_EFFECTS,
  samplerState: DEFAULT_SAMPLER_STATE,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  isLooping: false,
  audioEngine: null,
  samplerEngine: null,
  sequencerEngine: null,
  enginesInitialized: false,

  // Setters
  setAudioFile: (file) => set({ audioFile: file }),
  setAudioBuffer: (buffer) => set({ audioBuffer: buffer }),
  setEffects: (effects) => set({ effects }),
  setSamplerState: (samplerState) => set({ samplerState }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsLooping: (isLooping) => set({ isLooping }),

  // Initialize engines (called once on first mount)
  initializeEngines: () => {
    const state = get();
    if (state.enginesInitialized) return;

    // Only initialize in browser
    if (typeof window === "undefined") return;

    const audioEngine = new AudioEngine();
    const samplerEngine = new SamplerEngine(
      audioEngine,
      audioEngine.getEffectsChain()
    );
    const sequencerEngine = new SequencerEngine(120);

    set({
      audioEngine,
      samplerEngine,
      sequencerEngine,
      enginesInitialized: true,
    });
  },

  getAudioEngine: () => get().audioEngine,
  getSamplerEngine: () => get().samplerEngine,
  getSequencerEngine: () => get().sequencerEngine,

  // Pause everything for navigation
  pauseForNavigation: () => {
    const state = get();

    // Pause audio engine
    if (state.audioEngine && state.isPlaying) {
      state.audioEngine.pause();
    }

    // Stop sequencer
    if (state.sequencerEngine && state.samplerState.sequencer.isPlaying) {
      state.sequencerEngine.stop();
      set({
        samplerState: {
          ...state.samplerState,
          sequencer: {
            ...state.samplerState.sequencer,
            isPlaying: false,
            currentStep: 0,
          },
        },
      });
    }

    set({ isPlaying: false });
  },

  // Reset all state
  reset: () => {
    const state = get();

    // Cleanup engines
    state.sequencerEngine?.dispose();
    state.samplerEngine?.dispose();
    state.audioEngine?.dispose();

    set({
      audioFile: null,
      audioBuffer: null,
      effects: DEFAULT_EFFECTS,
      samplerState: DEFAULT_SAMPLER_STATE,
      currentTime: 0,
      duration: 0,
      isPlaying: false,
      isLooping: false,
      audioEngine: null,
      samplerEngine: null,
      sequencerEngine: null,
      enginesInitialized: false,
    });
  },
}));
