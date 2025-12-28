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
import FeedbackDialog from "./feedback-dialog";
import Link from "next/link";
import type { Clip } from "./waveform-visualizer";
import { isAuthenticated } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { AudioEngine } from "@/lib/audio/AudioEngine";
import type { EffectsState } from "@/types/audio";

export default function AudioManipulator() {
  const { theme, setTheme } = useTheme();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [clip, setClip] = useState<Clip | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const audioEngineRef = useRef<AudioEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Initialize AudioEngine
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
        setCurrentTime(clip ? clip.visualStartTime : 0);
      },
    });

    return () => {
      engine.dispose();
    };
  }, []);

  // Update effects chain when effects change
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.getEffectsChain().updateEffects(effects);
    }
  }, [
    effects.volume,
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
      audioEngineRef.current.play(effects, clip || undefined);
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
      audioEngineRef.current.play(effects, clip || undefined);
    }
  }, [effects.repeat, effects.repeatCycleSize]);

  // Handle granular parameter changes
  useEffect(() => {
    if (isPlaying && effects.granularEnabled && audioEngineRef.current) {
      audioEngineRef.current.pause();
      audioEngineRef.current.play(effects, clip || undefined);
    }
  }, [effects.granularGrainSize, effects.granularChaos]);

  // Handle pitch changes
  useEffect(() => {
    if (isPlaying && audioEngineRef.current) {
      audioEngineRef.current.updatePlaybackAfterPitchChange(
        effects,
        clip || undefined
      );
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
      audioEngineRef.current.seek(currentVisualTime, effects, clip || undefined);
      audioEngineRef.current.play(effects, clip || undefined);
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
      setClip(null);
    } catch (error) {
      console.error("Error loading audio file:", error);
      alert(`Error loading audio file: ${error}`);
    }
  };

  const triggerClipUpdate = (input_clip?: Clip) => {
    if (!audioEngineRef.current) return;

    if (isPlaying && input_clip) {
      const currentPosition = audioEngineRef.current.getPauseTime();

      let isWithinNewClip;
      if (effects.reverse) {
        isWithinNewClip =
          currentPosition >= input_clip.endTime &&
          currentPosition <= input_clip.startTime;
      } else {
        isWithinNewClip =
          currentPosition >= input_clip.startTime &&
          currentPosition <= input_clip.endTime;
      }

      audioEngineRef.current.pause();
      if (!isWithinNewClip) {
        audioEngineRef.current.setPauseTime(input_clip.startTime);
      }
      audioEngineRef.current.play(effects, input_clip);
    } else if (!input_clip) {
      audioEngineRef.current.pause();
    }
  };

  const togglePlayPause = () => {
    if (!audioEngineRef.current) return;

    if (isPlaying) {
      audioEngineRef.current.pause();
    } else {
      audioEngineRef.current.play(effects, clip || undefined);
    }
  };

  const resetAudio = () => {
    if (!audioEngineRef.current) return;
    audioEngineRef.current.reset();
    setClip(null);
  };

  const seekAudio = (time: number) => {
    if (!audioEngineRef.current) return;
    audioEngineRef.current.seek(time, effects, clip || undefined);
  };

  const downloadProcessedAudio = async () => {
    if (!audioEngineRef.current) return;
    let bufferToRender = audioEngineRef.current.getBuffer();
    if (!bufferToRender) return;

    setIsRendering(true);

    try {
      // Apply reverse if enabled
      if (effects.reverse) {
        bufferToRender = audioEngineRef.current.reverseBufferForExport(
          bufferToRender
        );
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

  const downloadClips = async () => {
    if (!audioEngineRef.current || !clip) return;
    const processedBuffer = audioEngineRef.current.getBuffer();
    if (!processedBuffer) return;

    setIsRendering(true);

    try {
      const startSample = Math.floor(
        clip.startTime * processedBuffer.sampleRate
      );
      const endSample = Math.floor(clip.endTime * processedBuffer.sampleRate);
      const clipLength = endSample - startSample;

      const ctx = audioEngineRef.current.getContext();
      const clipBuffer = ctx.createBuffer(
        processedBuffer.numberOfChannels,
        clipLength,
        processedBuffer.sampleRate
      );

      for (
        let channel = 0;
        channel < processedBuffer.numberOfChannels;
        channel++
      ) {
        const sourceData = processedBuffer.getChannelData(channel);
        const clipData = clipBuffer.getChannelData(channel);
        for (let j = 0; j < clipLength; j++) {
          clipData[j] = sourceData[startSample + j];
        }
      }

      const offlineCtx = new OfflineAudioContext(
        clipBuffer.numberOfChannels,
        clipBuffer.length,
        clipBuffer.sampleRate
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = clipBuffer;
      source.playbackRate.value = effects.pitch;

      const dryGain = offlineCtx.createGain();
      dryGain.gain.value = 1;

      source.connect(dryGain);
      dryGain.connect(offlineCtx.destination);

      source.start(0);
      const renderedBuffer = await offlineCtx.startRendering();

      const wavBlob = audioBufferToWav(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fourpage-clip-${clip.id}-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsRendering(false);
    } catch (error) {
      console.error("Error rendering clip:", error);
      alert("Error processing clip for download");
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
                    4 {mounted ? (theme === "dark" ? "LIGHT MODE" : "DARK MODE") : "THEME"}
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
                    clips={clip ? [clip] : []}
                    onClipsChange={(clips) => {
                      setClip(clips[0] || null);
                      triggerClipUpdate(clips[0] || undefined);
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
                          {clip && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={downloadClips}>
                                <Download className="w-4 h-4 mr-2" />
                                Clip Only
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="font-mono text-xs uppercase tracking-wider">
                      {clip && (
                        <span className="text-muted-foreground mr-2">
                          Clip {1}
                        </span>
                      )}
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
            </>
          )}
        </div>

        <div className="space-y-4">
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
