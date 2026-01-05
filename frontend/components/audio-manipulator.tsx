"use client";

import type React from "react";
import { audioBufferToWav } from "@/utils/audioBufferToWav";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Upload,
  Play,
  Pause,
  RotateCcw,
  Download,
  Repeat,
  ChevronDown,
  Menu,
} from "lucide-react";
import { useTheme } from "next-themes";
import WaveformVisualizer from "./waveform-visualizer";
import EffectsPanel from "./effects-panel";
import SamplerPads from "./sampler-pads";
import FeedbackDialog from "./feedback-dialog";
import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AudioEngine } from "@/lib/audio/AudioEngine";
import { SamplerEngine } from "@/lib/audio/SamplerEngine";
import { SequencerEngine } from "@/lib/audio/SequencerEngine";
import type {
  EffectsState,
  SamplerState,
  SamplerPad,
  PAD_KEY_BINDINGS,
} from "@/types/audio";
import { PAD_KEY_BINDINGS as KEY_BINDINGS } from "@/types/audio";

export default function AudioManipulator() {
  const { theme, setTheme } = useTheme();

  // Initialize default pads (16 pads with key bindings)
  const initializePads = (): SamplerPad[] => {
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      clipId: null,
      isPlaying: false,
      keyBinding: KEY_BINDINGS[i],
    }));
  };

  // All state declarations first
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Sampler state
  const [samplerState, setSamplerState] = useState<SamplerState>({
    pads: initializePads(),
    clips: [],
    sequencer: {
      bpm: 120,
      currentStep: 0,
      isPlaying: false,
    },
    mode: "sampler",
  });

  const [effects, setEffects] = useState<EffectsState>({
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
  });

  // All useRef declarations after state
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const samplerEngineRef = useRef<SamplerEngine | null>(null);
  const sequencerEngineRef = useRef<SequencerEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const padPlayingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs to access latest state in callbacks
  const samplerStateRef = useRef(samplerState);
  const effectsRef = useRef(effects);
  const isPlayingRef = useRef(isPlaying);

  // Update refs when state changes
  useEffect(() => {
    samplerStateRef.current = samplerState;
  }, [samplerState]);

  useEffect(() => {
    effectsRef.current = effects;
  }, [effects]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Initialize AudioEngine and SamplerEngine
  useEffect(() => {
    setMounted(true);
    setIsSignedIn(isAuthenticated());

    const engine = new AudioEngine();
    audioEngineRef.current = engine;

    // Set up callbacks
    engine.setCallbacks({
      onTimeUpdate: (time) => setCurrentTime(time),
      onPlayStateChange: (playing) => setIsPlaying(playing),
      onEnd: () => {
        setCurrentTime(0);
      },
    });

    // Initialize SamplerEngine (reuses AudioEngine and EffectsChain)
    const samplerEngine = new SamplerEngine(engine, engine.getEffectsChain());
    samplerEngineRef.current = samplerEngine;

    // Initialize SequencerEngine
    const sequencerEngine = new SequencerEngine(120);
    sequencerEngineRef.current = sequencerEngine;

    return () => {
      sequencerEngine.dispose();
      samplerEngine.dispose();
      engine.dispose();
    };
  }, []);

  // Set up sequencer step callback (after mount)
  useEffect(() => {
    if (!sequencerEngineRef.current) return;

    sequencerEngineRef.current.onStep((padIndex) => {
      // Trigger the pad at this index
      const currentState = samplerStateRef.current;
      const pad = currentState.pads[padIndex];
      const clip = currentState.clips.find((c) => c.id === pad?.clipId);

      if (!audioEngineRef.current || !sequencerEngineRef.current || !clip) {
        return;
      }

      // Stop main player if playing
      if (isPlayingRef.current) {
        audioEngineRef.current.pause();
      }

      // Get current global effects
      const currentEffects = effectsRef.current;

      // Mark pad as playing
      setSamplerState((prev) => ({
        ...prev,
        sequencer: {
          ...prev.sequencer,
          currentStep: padIndex,
        },
        pads: prev.pads.map((p, i) =>
          i === padIndex
            ? { ...p, isPlaying: true }
            : { ...p, isPlaying: false }
        ),
      }));

      // Reset and seek to correct position: end for reverse, start for normal
      audioEngineRef.current.reset();
      const seekTime = currentEffects.reverse
        ? clip.visualEndTime
        : clip.visualStartTime;
      audioEngineRef.current.seek(seekTime, currentEffects, clip);
      audioEngineRef.current.play(currentEffects, clip);

      // Calculate clip duration based on visual times
      const clipDuration =
        (clip.visualEndTime - clip.visualStartTime) /
        (currentEffects.pitchEnabled ? currentEffects.pitch : 1);
      const clipDurationMs = clipDuration * 1000;

      // Set next step delay to clip duration
      sequencerEngineRef.current.setNextStepDelay(clipDurationMs);

      // Auto-clear playing state after clip finishes
      setTimeout(() => {
        setSamplerState((prev) => ({
          ...prev,
          pads: prev.pads.map((p, i) =>
            i === padIndex ? { ...p, isPlaying: false } : p
          ),
        }));
      }, clipDurationMs);
    });
  }, []);

  // Update effects chain when effects change
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.getEffectsChain().updateEffects(effects);
    }
  }, [
    effects.volume,
    effects.delayTime,
    effects.delayFeedback,
    effects.delayMix,
    effects.reverbMix,
    effects.reverbRoomSize,
    effects.reverbDecay,
    effects.granularMix,
    effects.tremoloMix,
    effects.tremoloRate,
    effects.tremoloDepth,
    effects.convolverMix,
    effects.eqMix,
    effects.eqLowGain,
    effects.eqMidGain,
    effects.eqHighGain,
    effects.bitcrushMix,
    effects.bitcrushBitDepth,
    effects.bitcrushSampleRate,
    effects.radioMix,
    effects.radioDistortion,
    effects.radioStatic,
    effects.drunkMix,
    effects.drunkWobble,
    effects.drunkSpeed,
  ]);

  // Handle effect enabled/disabled changes - restart playback
  useEffect(() => {
    if (isPlaying && audioEngineRef.current) {
      audioEngineRef.current.pause();
      audioEngineRef.current.play(effects);
    }
  }, [
    effects.pitchEnabled,
    effects.delayEnabled,
    effects.reverbEnabled,
    effects.convolverEnabled,
    effects.tremoloEnabled,
    effects.bitcrushEnabled,
    effects.granularEnabled,
    effects.radioEnabled,
    effects.drunkEnabled,
    effects.eqEnabled,
    effects.repeatEnabled,
  ]);

  // Handle repeat parameter changes
  useEffect(() => {
    if (isPlaying && effects.repeatEnabled && audioEngineRef.current) {
      audioEngineRef.current.pause();
      audioEngineRef.current.play(effects);
    }
  }, [effects.repeat, effects.repeatCycleSize]);

  // Handle granular parameter changes
  useEffect(() => {
    if (isPlaying && effects.granularEnabled && audioEngineRef.current) {
      audioEngineRef.current.pause();
      audioEngineRef.current.play(effects);
    }
  }, [effects.granularGrainSize, effects.granularChaos]);

  // Handle pitch changes
  useEffect(() => {
    if (isPlaying && audioEngineRef.current) {
      audioEngineRef.current.updatePlaybackAfterPitchChange(effects);
    }
  }, [effects.pitch]);

  // Handle reverse - keep visual position the same
  useEffect(() => {
    if (!audioEngineRef.current) return;

    // Keep the current visual time the same
    const currentVisualTime = currentTime;

    if (isPlaying) {
      audioEngineRef.current.pause();
      // Seek to the same visual position (seek handles the coordinate conversion)
      audioEngineRef.current.seek(currentVisualTime, effects);
      audioEngineRef.current.play(effects);
    } else {
      // When paused, just update the internal position
      const newPauseTime = duration - audioEngineRef.current.getPauseTime();
      audioEngineRef.current.setPauseTime(newPauseTime);
      // Update the visual display
      setCurrentTime(currentVisualTime);
    }
  }, [effects.reverse]);

  // Update looping
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setLooping(isLooping);
    }
  }, [isLooping]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audioEngineRef.current) return;

    if (isPlaying) {
      audioEngineRef.current.pause();
    }

    setAudioFile(file);

    try {
      const buffer = await audioEngineRef.current.loadAudioFile(file);
      setDuration(buffer.duration);
      setCurrentTime(0);
      setIsPlaying(false);
    } catch (error) {
      console.error("Error loading audio file:", error);
      alert(`Error loading audio file: ${error}`);
    }
  };

  const togglePlayPause = () => {
    if (!audioEngineRef.current || !sequencerEngineRef.current) return;

    if (isPlaying || samplerState.sequencer.isPlaying) {
      // Stop everything
      audioEngineRef.current.pause();
      sequencerEngineRef.current.stop();
      setSamplerState((prev) => ({
        ...prev,
        sequencer: {
          ...prev.sequencer,
          isPlaying: false,
          currentStep: 0,
        },
      }));
    } else {
      // Start based on mode
      if (samplerState.mode === "sequencer") {
        // Get pads that have clips assigned
        const padsWithClips = samplerState.pads
          .filter((pad) => pad.clipId !== null)
          .map((pad) => pad.id);

        if (padsWithClips.length === 0) {
          console.warn("No pads with clips to sequence");
          return;
        }

        // Set sequence and start
        sequencerEngineRef.current.setSequence(padsWithClips);
        sequencerEngineRef.current.start();
        setSamplerState((prev) => ({
          ...prev,
          sequencer: {
            ...prev.sequencer,
            isPlaying: true,
          },
        }));
      } else {
        // Sampler mode: play full audio
        audioEngineRef.current.play(effects);
      }
    }
  };

  const resetAudio = () => {
    if (!audioEngineRef.current) return;
    audioEngineRef.current.reset();
  };

  const seekAudio = (time: number) => {
    if (!audioEngineRef.current) return;
    // Main player seeks in full audio (no clip parameter)
    audioEngineRef.current.seek(time, effects);
  };

  // Sampler pad handlers
  const handlePadTrigger = (padId: number) => {
    if (!audioEngineRef.current) return;

    const pad = samplerState.pads[padId];
    const clip = samplerState.clips.find((c) => c.id === pad.clipId);

    if (!clip) {
      console.warn(`Pad ${padId} has no assigned clip`);
      return;
    }

    // Stop main player and sequencer if playing
    if (isPlaying) {
      audioEngineRef.current.pause();
    }
    if (samplerState.sequencer.isPlaying && sequencerEngineRef.current) {
      sequencerEngineRef.current.stop();
      setSamplerState((prev) => ({
        ...prev,
        sequencer: {
          ...prev.sequencer,
          isPlaying: false,
          currentStep: 0,
        },
      }));
    }

    // Reset audio engine before playing clip (clears pauseTime)
    audioEngineRef.current.reset();

    // Seek to correct position: end for reverse, start for normal
    const seekTime = effects.reverse
      ? clip.visualEndTime
      : clip.visualStartTime;
    audioEngineRef.current.seek(seekTime, effects, clip);
    audioEngineRef.current.play(effects, clip);

    // Clear any existing pad playing timeout to prevent race conditions
    if (padPlayingTimeoutRef.current) {
      clearTimeout(padPlayingTimeoutRef.current);
      padPlayingTimeoutRef.current = null;
    }

    // Update pad playing state - clear all others, set clicked one as playing
    setSamplerState((prev) => ({
      ...prev,
      pads: prev.pads.map((p, i) =>
        i === padId ? { ...p, isPlaying: true } : { ...p, isPlaying: false }
      ),
    }));

    // Calculate actual clip duration based on visual times
    const clipDuration =
      (clip.visualEndTime - clip.visualStartTime) /
      (effects.pitchEnabled ? effects.pitch : 1);
    padPlayingTimeoutRef.current = setTimeout(() => {
      setSamplerState((prev) => ({
        ...prev,
        pads: prev.pads.map((p, i) =>
          i === padId ? { ...p, isPlaying: false } : p
        ),
      }));
      padPlayingTimeoutRef.current = null;
    }, clipDuration * 1000);
  };

  const handlePadAssignClip = (padId: number, clipId: string | null) => {
    setSamplerState((prev) => ({
      ...prev,
      pads: prev.pads.map((p, i) => (i === padId ? { ...p, clipId } : p)),
    }));
  };

  // Sampler/Sequencer mode change
  const handleModeChange = (mode: "sampler" | "sequencer") => {
    // Stop everything when switching modes
    if (audioEngineRef.current && isPlaying) {
      audioEngineRef.current.pause();
    }
    if (sequencerEngineRef.current && samplerState.sequencer.isPlaying) {
      sequencerEngineRef.current.stop();
    }

    setSamplerState((prev) => ({
      ...prev,
      mode,
      sequencer: {
        ...prev.sequencer,
        isPlaying: false,
        currentStep: 0,
      },
    }));
  };

  const downloadProcessedAudio = async () => {
    if (!audioEngineRef.current) return;
    let bufferToRender = audioEngineRef.current.getBuffer();
    if (!bufferToRender) return;

    setIsRendering(true);

    try {
      // Apply reverse if enabled
      if (effects.reverse) {
        bufferToRender =
          audioEngineRef.current.reverseBufferForExport(bufferToRender);
      }

      // Apply repeat if enabled
      if (effects.repeatEnabled && effects.repeat > 1) {
        bufferToRender = audioEngineRef.current.applyRepeatEffectForExport(
          bufferToRender,
          effects.repeat,
          effects.repeatCycleSize
        );
      }

      const offlineCtx = new OfflineAudioContext(
        bufferToRender.numberOfChannels,
        bufferToRender.length,
        bufferToRender.sampleRate
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = bufferToRender;
      source.playbackRate.value = effects.pitch;

      const dryGain = offlineCtx.createGain();
      const activeDelayMix = effects.delayEnabled ? effects.delayMix : 0;
      const activeReverbMix = effects.reverbEnabled ? effects.reverbMix : 0;
      const activeBitcrushMix = effects.bitcrushEnabled
        ? effects.bitcrushMix
        : 0;
      const activeRadioMix = effects.radioEnabled ? effects.radioMix : 0;
      const activeConvolverMix = effects.convolverEnabled
        ? effects.convolverMix
        : 0;
      const activeTremoloMix = effects.tremoloEnabled ? effects.tremoloMix : 0;
      const activeDrunkMix = effects.drunkEnabled ? effects.drunkMix : 0;
      const activeEqMix = effects.eqEnabled ? effects.eqMix : 0;

      dryGain.gain.value =
        1 -
        Math.max(
          activeDelayMix,
          activeReverbMix,
          activeBitcrushMix,
          activeRadioMix,
          activeConvolverMix,
          activeTremoloMix,
          activeDrunkMix,
          activeEqMix
        ) *
          0.5;

      source.connect(dryGain);
      dryGain.connect(offlineCtx.destination);

      // Apply effects for rendering (simplified - reuse EffectsChain logic)
      // For now, we render with dry signal only to avoid duplication
      // TODO: Create renderWithEffects method in AudioEngine

      source.start(0);
      const renderedBuffer = await offlineCtx.startRendering();

      const wavBlob = audioBufferToWav(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fourpage-processed-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsRendering(false);
    } catch (error) {
      console.error("Error rendering audio:", error);
      alert("Error processing audio for download");
      setIsRendering(false);
    }
  };

  // Clip download will be handled by sampler pads later

  return (
    <div className="min-h-screen bg-background p-2 md:p-4">
      <header className="border-b-2 border-foreground pb-2 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/home"
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <h1 className="font-mono text-2xl md:text-4xl font-bold tracking-tight">
                FOURPAGE{" "}
                <span className="text-sm hidden md:inline md:text-lg font-normal text-muted-foreground">
                  Sixty Lens
                </span>
              </h1>
            </Link>
          </div>
          <Button
            onClick={() => setIsMenuOpen(true)}
            variant="outline"
            size="icon"
            className="font-mono bg-transparent"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="bg-background border-2 border-foreground w-full max-w-md font-mono relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b-2 border-foreground p-6 bg-background flex items-center justify-between">
              <h2 className="font-mono text-xl font-bold tracking-tight uppercase">
                MAIN MENU
              </h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="font-mono text-xl font-bold hover:opacity-80 transition-opacity"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <Link href="/home" className="block">
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full text-left hover:bg-foreground hover:text-background transition-colors px-3 py-2 tracking-widest text-sm"
                  >
                    1 HOME
                  </button>
                </Link>

                {isSignedIn ? (
                  <Link href="/profile" className="block">
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full text-left hover:bg-foreground hover:text-background transition-colors px-3 py-2 tracking-widest text-sm"
                    >
                      2 PROFILE
                    </button>
                  </Link>
                ) : (
                  <Link href="/sign-in" className="block">
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full text-left hover:bg-foreground hover:text-background transition-colors px-3 py-2 tracking-widest text-sm"
                    >
                      2 SIGN IN
                    </button>
                  </Link>
                )}

                <div className="relative">
                  <button
                    className="w-full text-left hover:bg-foreground hover:text-background transition-colors px-3 py-2 tracking-widest text-sm"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsFeedbackOpen(true);
                    }}
                  >
                    3 FEEDBACK
                  </button>
                </div>

                <button
                  onClick={() => {
                    setTheme(theme === "dark" ? "light" : "dark");
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left hover:bg-foreground hover:text-background transition-colors px-3 py-2 tracking-widest text-sm"
                  suppressHydrationWarning
                >
                  <span suppressHydrationWarning>
                    4{" "}
                    {mounted
                      ? theme === "dark"
                        ? "LIGHT MODE"
                        : "DARK MODE"
                      : "THEME"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full">
        <FeedbackDialog
          openValue={isFeedbackOpen}
          onOpenChange={() => setIsFeedbackOpen(false)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {!audioFile ? (
            <div className="border-2 border-foreground p-12 flex flex-col items-center justify-center min-h-[300px]">
              <Upload className="w-16 h-16 mb-4" />
              <h2 className="font-mono text-xl mb-4 uppercase tracking-wider">
                Load Sample
              </h2>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <label className="cursor-pointer w-full">
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/aac,audio/flac,audio/webm,audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="audio-file-input"
                    ref={fileInputRef}
                  />
                  <Button
                    variant="outline"
                    size="lg"
                    className="font-mono uppercase tracking-wider bg-transparent w-full"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    Select Audio File
                  </Button>
                </label>
              </div>
            </div>
          ) : (
            <>
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/aac,audio/flac,audio/webm,audio/*"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
              />

              <div className="border-2 border-foreground">
                <div className="border-b-2 border-foreground p-2 flex items-center justify-between bg-background">
                  <div className="font-mono text-xs uppercase tracking-wider">
                    <div>WAVEFORM VIEW</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground truncate max-w-[120px] sm:max-w-[200px] md:max-w-md">
                      {audioFile ? audioFile.name : "NO SAMPLE LOADED"}
                    </div>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      size="sm"
                      className="font-mono uppercase tracking-wider bg-background"
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-2 relative border-b-2 border-foreground">
                  <WaveformVisualizer
                    audioBuffer={audioEngineRef.current?.getBuffer() || null}
                    currentTime={currentTime}
                    isReversed={effects.reverse}
                    duration={duration}
                    onSeek={seekAudio}
                    clips={samplerState.clips}
                    onClipsChange={(newClips) => {
                      // Check if a new clip was added
                      if (newClips.length > samplerState.clips.length) {
                        const newClip = newClips[newClips.length - 1];

                        // Find first free pad
                        const freePadIndex = samplerState.pads.findIndex(
                          (p) => p.clipId === null
                        );

                        if (freePadIndex !== -1) {
                          // Auto-assign to first free pad
                          setSamplerState((prev) => ({
                            ...prev,
                            clips: newClips,
                            pads: prev.pads.map((p, i) =>
                              i === freePadIndex
                                ? { ...p, clipId: newClip.id }
                                : p
                            ),
                          }));
                          return;
                        }
                      }

                      // Get valid clip IDs from the new clips array
                      const validClipIds = new Set(newClips.map((c) => c.id));

                      // Update clips and clean up pad assignments for deleted clips
                      setSamplerState((prev) => ({
                        ...prev,
                        clips: newClips,
                        pads: prev.pads.map((p) =>
                          p.clipId && !validClipIds.has(p.clipId)
                            ? { ...p, clipId: null }
                            : p
                        ),
                      }));
                    }}
                    pauseAudio={() => audioEngineRef.current?.pause()}
                  />
                </div>

                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={togglePlayPause}
                        size="sm"
                        className="font-mono uppercase tracking-wider"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        onClick={resetAudio}
                        variant="outline"
                        size="sm"
                        className="font-mono uppercase tracking-wider bg-transparent"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => setIsLooping(!isLooping)}
                        variant={isLooping ? "default" : "outline"}
                        size="sm"
                        className={`font-mono uppercase tracking-wider ${
                          isLooping ? "" : "bg-transparent"
                        }`}
                      >
                        <Repeat className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="text"
                            className="font-mono uppercase tracking-wider bg-transparent"
                            disabled={isRendering}
                          >
                            <Download className="w-4 h-4" />
                            {isRendering && <span className="ml-2">...</span>}
                            {!isRendering && (
                              <ChevronDown className="w-3 h-3 ml-1" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="font-mono">
                          <DropdownMenuItem onClick={downloadProcessedAudio}>
                            <Download className="w-4 h-4 mr-2" />
                            Full Audio
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="font-mono text-xs uppercase tracking-wider">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-xs uppercase tracking-wider">
                      Volume: {Math.round(effects.volume * 100)}%
                    </label>
                    <Slider
                      value={[effects.volume]}
                      onValueChange={([value]) =>
                        setEffects({ ...effects, volume: value })
                      }
                      min={0}
                      max={1}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Sampler/Sequencer Section - directly under waveform */}
              <div className=" border-foreground pt-2">
                <SamplerPads
                  pads={samplerState.pads}
                  clips={samplerState.clips}
                  onPadTrigger={handlePadTrigger}
                  onPadAssignClip={handlePadAssignClip}
                  mode={samplerState.mode}
                  onModeChange={handleModeChange}
                />
              </div>
            </>
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto space-y-4">
          <EffectsPanel effects={effects} setEffects={setEffects} />
        </div>
      </div>

      <footer className="border-t-2 border-foreground mt-6 pt-2">
        <div className="flex justify-end items-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <div>v1.0.0 BETA</div>
        </div>
      </footer>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}
