"use client";

import type React from "react";
import { audioBufferToWav } from "@/utils/audioBufferToWav";
import { useState, useRef, useEffect, useCallback } from "react";
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
} from "@/components/ui/dropdown-menu";
import { useAudioStore } from "@/lib/stores/audio-store";

export default function AudioManipulator() {
  const { theme, setTheme } = useTheme();

  // Global store state
  const {
    audioFile,
    audioBuffer,
    effects,
    samplerState,
    currentTime,
    duration,
    isPlaying,
    isLooping,
    setAudioFile,
    setAudioBuffer,
    setEffects,
    setSamplerState,
    setCurrentTime,
    setDuration,
    setIsPlaying,
    setIsLooping,
    initializeEngines,
    getAudioEngine,
    getSamplerEngine,
    getSequencerEngine,
    pauseForNavigation,
  } = useAudioStore();

  // Local UI state (not persisted across navigation)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [showNoClipsWarning, setShowNoClipsWarning] = useState(false);

  // Refs
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

  // Initialize engines on mount
  useEffect(() => {
    setMounted(true);
    setIsSignedIn(isAuthenticated());
    initializeEngines();
  }, [initializeEngines]);

  // Set up engine callbacks after engines are initialized
  useEffect(() => {
    const audioEngine = getAudioEngine();
    if (!audioEngine) return;

    audioEngine.setCallbacks({
      onTimeUpdate: (time) => setCurrentTime(time),
      onPlayStateChange: (playing) => setIsPlaying(playing),
      onEnd: () => {
        setCurrentTime(0);
      },
    });
  }, [getAudioEngine, setCurrentTime, setIsPlaying]);

  // Restore audio buffer if we have a file but engine was reset
  useEffect(() => {
    const audioEngine = getAudioEngine();
    if (!audioEngine) return;

    // If we have a stored buffer but engine doesn't, restore it
    if (audioBuffer && !audioEngine.getBuffer()) {
      // We need to reload from file since AudioBuffer can't be easily cloned
      // The buffer in store is just for reference
    }
  }, [audioBuffer, getAudioEngine]);

  // Set up sequencer step callback
  useEffect(() => {
    const sequencerEngine = getSequencerEngine();
    const audioEngine = getAudioEngine();
    if (!sequencerEngine || !audioEngine) return;

    sequencerEngine.onStep((padIndex) => {
      const currentState = samplerStateRef.current;
      const pad = currentState.pads[padIndex];
      const clip = currentState.clips.find((c) => c.id === pad?.clipId);

      if (!clip) return;

      // Stop main player if playing
      if (isPlayingRef.current) {
        audioEngine.pause();
      }

      // Get current global effects
      const currentEffects = effectsRef.current;

      // Mark pad as playing
      setSamplerState({
        ...samplerStateRef.current,
        sequencer: {
          ...samplerStateRef.current.sequencer,
          currentStep: padIndex,
        },
        pads: samplerStateRef.current.pads.map((p, i) =>
          i === padIndex
            ? { ...p, isPlaying: true }
            : { ...p, isPlaying: false }
        ),
      });

      // Reset and seek to correct position
      audioEngine.reset();
      const seekTime = currentEffects.reverse
        ? clip.visualEndTime
        : clip.visualStartTime;
      audioEngine.seek(seekTime, currentEffects, clip);
      audioEngine.play(currentEffects, clip);

      // Calculate clip duration
      const clipDuration =
        (clip.visualEndTime - clip.visualStartTime) /
        (currentEffects.pitchEnabled ? currentEffects.pitch : 1);
      const clipDurationMs = clipDuration * 1000;

      // Set next step delay
      const seqEngine = getSequencerEngine();
      seqEngine?.setNextStepDelay(clipDurationMs);

      // Auto-clear playing state
      setTimeout(() => {
        setSamplerState({
          ...samplerStateRef.current,
          pads: samplerStateRef.current.pads.map((p, i) =>
            i === padIndex ? { ...p, isPlaying: false } : p
          ),
        });
      }, clipDurationMs);
    });
  }, [getSequencerEngine, getAudioEngine, setSamplerState]);

  // Update effects chain when effects change
  useEffect(() => {
    const audioEngine = getAudioEngine();
    if (audioEngine) {
      audioEngine.getEffectsChain().updateEffects(effects);
    }
  }, [
    effects.volume,
    effects.delayTime,
    effects.delayFeedback,
    effects.delayMix,
    effects.reverbMix,
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
    getAudioEngine,
  ]);

  // Handle reverb room size and decay changes
  useEffect(() => {
    const audioEngine = getAudioEngine();
    if (audioEngine) {
      audioEngine
        .getEffectsChain()
        .recreateReverb(effects.reverbRoomSize, effects.reverbDecay);

      if (isPlaying) {
        audioEngine.pause();
        audioEngine.play(effects);
      }
    }
  }, [effects.reverbRoomSize, effects.reverbDecay, getAudioEngine]);

  // Handle effect enabled/disabled changes
  useEffect(() => {
    const audioEngine = getAudioEngine();
    if (isPlaying && audioEngine) {
      audioEngine.pause();
      audioEngine.play(effects);
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
    getAudioEngine,
  ]);

  // Handle repeat parameter changes
  useEffect(() => {
    const audioEngine = getAudioEngine();
    if (isPlaying && effects.repeatEnabled && audioEngine) {
      audioEngine.pause();
      audioEngine.play(effects);
    }
  }, [effects.repeat, effects.repeatCycleSize, getAudioEngine]);

  // Handle granular parameter changes
  useEffect(() => {
    const audioEngine = getAudioEngine();
    if (isPlaying && effects.granularEnabled && audioEngine) {
      audioEngine.pause();
      audioEngine.play(effects);
    }
  }, [effects.granularGrainSize, effects.granularChaos, getAudioEngine]);

  // Handle pitch changes
  useEffect(() => {
    const audioEngine = getAudioEngine();
    if (isPlaying && audioEngine) {
      audioEngine.updatePlaybackAfterPitchChange(effects);
    }
  }, [effects.pitch, getAudioEngine]);

  // Handle reverse
  useEffect(() => {
    const audioEngine = getAudioEngine();
    if (!audioEngine) return;

    const currentVisualTime = currentTime;

    if (isPlaying) {
      audioEngine.pause();
      audioEngine.seek(currentVisualTime, effects);
      audioEngine.play(effects);
    } else {
      const newPauseTime = duration - audioEngine.getPauseTime();
      audioEngine.setPauseTime(newPauseTime);
      setCurrentTime(currentVisualTime);
    }
  }, [effects.reverse, getAudioEngine]);

  // Update looping
  useEffect(() => {
    const audioEngine = getAudioEngine();
    if (audioEngine) {
      audioEngine.setLooping(isLooping);
    }
  }, [isLooping, getAudioEngine]);

  // Navigation handler - pause before navigating
  const handleNavigation = useCallback(() => {
    pauseForNavigation();
    setIsMenuOpen(false);
  }, [pauseForNavigation]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const audioEngine = getAudioEngine();
    if (!file || !audioEngine) return;

    if (isPlaying) {
      audioEngine.pause();
    }

    setAudioFile(file);

    try {
      const buffer = await audioEngine.loadAudioFile(file);
      setAudioBuffer(buffer);
      setDuration(buffer.duration);
      setCurrentTime(0);
      setIsPlaying(false);
    } catch (error) {
      console.error("Error loading audio file:", error);
      alert(`Error loading audio file: ${error}`);
    }
  };

  const togglePlayPause = () => {
    const audioEngine = getAudioEngine();
    const sequencerEngine = getSequencerEngine();
    if (!audioEngine || !sequencerEngine) return;

    if (isPlaying || samplerState.sequencer.isPlaying) {
      // Stop everything
      audioEngine.pause();
      sequencerEngine.stop();
      setSamplerState({
        ...samplerState,
        sequencer: {
          ...samplerState.sequencer,
          isPlaying: false,
          currentStep: 0,
        },
      });
    } else {
      // Start based on mode
      if (samplerState.mode === "sequencer") {
        const padsWithClips = samplerState.pads
          .filter((pad) => pad.clipId !== null)
          .map((pad) => pad.id);

        if (padsWithClips.length === 0 && !showNoClipsWarning) {
          setShowNoClipsWarning(true);
          setTimeout(() => setShowNoClipsWarning(false), 2000);
          return;
        }

        sequencerEngine.setSequence(padsWithClips);
        sequencerEngine.start();
        setSamplerState({
          ...samplerState,
          sequencer: {
            ...samplerState.sequencer,
            isPlaying: true,
          },
        });
      } else {
        audioEngine.play(effects);
      }
    }
  };

  const resetAudio = () => {
    const audioEngine = getAudioEngine();
    if (!audioEngine) return;
    audioEngine.reset();
  };

  const seekAudio = (time: number) => {
    const audioEngine = getAudioEngine();
    if (!audioEngine) return;
    audioEngine.seek(time, effects);
  };

  const handlePadTrigger = (padId: number) => {
    const audioEngine = getAudioEngine();
    const sequencerEngine = getSequencerEngine();
    if (!audioEngine) return;

    const pad = samplerState.pads[padId];
    const clip = samplerState.clips.find((c) => c.id === pad.clipId);

    if (!clip) {
      console.warn(`Pad ${padId} has no assigned clip`);
      return;
    }

    if (isPlaying) {
      audioEngine.pause();
    }
    if (samplerState.sequencer.isPlaying && sequencerEngine) {
      sequencerEngine.stop();
      setSamplerState({
        ...samplerState,
        sequencer: {
          ...samplerState.sequencer,
          isPlaying: false,
          currentStep: 0,
        },
      });
    }

    audioEngine.reset();
    const seekTime = effects.reverse
      ? clip.visualEndTime
      : clip.visualStartTime;
    audioEngine.seek(seekTime, effects, clip);
    audioEngine.play(effects, clip);

    if (padPlayingTimeoutRef.current) {
      clearTimeout(padPlayingTimeoutRef.current);
      padPlayingTimeoutRef.current = null;
    }

    setSamplerState({
      ...samplerState,
      pads: samplerState.pads.map((p, i) =>
        i === padId ? { ...p, isPlaying: true } : { ...p, isPlaying: false }
      ),
    });

    const clipDuration =
      (clip.visualEndTime - clip.visualStartTime) /
      (effects.pitchEnabled ? effects.pitch : 1);
    padPlayingTimeoutRef.current = setTimeout(() => {
      setSamplerState({
        ...samplerStateRef.current,
        pads: samplerStateRef.current.pads.map((p, i) =>
          i === padId ? { ...p, isPlaying: false } : p
        ),
      });
      padPlayingTimeoutRef.current = null;
    }, clipDuration * 1000);
  };

  const handlePadAssignClip = (padId: number, clipId: string | null) => {
    setSamplerState({
      ...samplerState,
      pads: samplerState.pads.map((p, i) =>
        i === padId ? { ...p, clipId } : p
      ),
    });
  };

  const handleModeChange = (mode: "sampler" | "sequencer") => {
    const audioEngine = getAudioEngine();
    const sequencerEngine = getSequencerEngine();

    if (audioEngine && isPlaying) {
      audioEngine.pause();
    }
    if (sequencerEngine && samplerState.sequencer.isPlaying) {
      sequencerEngine.stop();
    }

    setSamplerState({
      ...samplerState,
      mode,
      sequencer: {
        ...samplerState.sequencer,
        isPlaying: false,
        currentStep: 0,
      },
    });
  };

  const downloadProcessedAudio = async () => {
    const audioEngine = getAudioEngine();
    if (!audioEngine) return;
    let bufferToRender = audioEngine.getBuffer();
    if (!bufferToRender) return;

    setIsRendering(true);

    try {
      if (effects.reverse) {
        bufferToRender = audioEngine.reverseBufferForExport(bufferToRender);
      }

      if (effects.repeatEnabled && effects.repeat > 1) {
        bufferToRender = audioEngine.applyRepeatEffectForExport(
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

  return (
    <div className="min-h-screen bg-background p-2 md:p-4">
      <header className="border-b-2 border-foreground pb-2 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/home"
              onClick={handleNavigation}
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
                <Link href="/home" className="block" onClick={handleNavigation}>
                  <button className="w-full text-left hover:bg-foreground hover:text-background transition-colors px-3 py-2 tracking-widest text-sm">
                    1 HOME
                  </button>
                </Link>

                {isSignedIn ? (
                  <Link
                    href="/profile"
                    className="block"
                    onClick={handleNavigation}
                  >
                    <button className="w-full text-left hover:bg-foreground hover:text-background transition-colors px-3 py-2 tracking-widest text-sm">
                      2 PROFILE
                    </button>
                  </Link>
                ) : (
                  <Link
                    href="/sign-in"
                    className="block"
                    onClick={handleNavigation}
                  >
                    <button className="w-full text-left hover:bg-foreground hover:text-background transition-colors px-3 py-2 tracking-widest text-sm">
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
                    audioBuffer={getAudioEngine()?.getBuffer() || null}
                    currentTime={currentTime}
                    isReversed={effects.reverse}
                    duration={duration}
                    onSeek={seekAudio}
                    clips={samplerState.clips}
                    onClipsChange={(newClips) => {
                      if (newClips.length > samplerState.clips.length) {
                        const newClip = newClips[newClips.length - 1];
                        const freePadIndex = samplerState.pads.findIndex(
                          (p) => p.clipId === null
                        );

                        if (freePadIndex !== -1) {
                          setSamplerState({
                            ...samplerState,
                            clips: newClips,
                            pads: samplerState.pads.map((p, i) =>
                              i === freePadIndex
                                ? { ...p, clipId: newClip.id }
                                : p
                            ),
                          });
                          return;
                        }
                      }

                      const validClipIds = new Set(newClips.map((c) => c.id));
                      setSamplerState({
                        ...samplerState,
                        clips: newClips,
                        pads: samplerState.pads.map((p) =>
                          p.clipId && !validClipIds.has(p.clipId)
                            ? { ...p, clipId: null }
                            : p
                        ),
                      });
                    }}
                    pauseAudio={() => getAudioEngine()?.pause()}
                  />
                </div>

                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
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
                        {showNoClipsWarning && (
                          <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-warning text-warning-foreground text-xs font-mono rounded whitespace-nowrap shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            No clips to play
                            <div className="absolute top-full left-3 border-4 border-transparent border-t-warning" />
                          </div>
                        )}
                      </div>
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
