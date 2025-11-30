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
  PlayIcon,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const SAMPLE_LIBRARY = [
  { id: 1, name: "Lo-Fi Beat 01", author: "DJ Smooth", genre: "Lo-Fi Hip Hop" },
  { id: 2, name: "Ambient Pad", author: "Synth Master", genre: "Ambient" },
  { id: 3, name: "Drum Break", author: "Beat Maker", genre: "Breakbeat" },
  { id: 4, name: "Jazz Piano Loop", author: "Keys Player", genre: "Jazz" },
  { id: 5, name: "Bass Line 808", author: "Low End Theory", genre: "Trap" },
  { id: 6, name: "Vocal Chop", author: "Voice Artist", genre: "Electronic" },
  { id: 7, name: "Guitar Riff", author: "String Theory", genre: "Rock" },
  { id: 8, name: "Synth Lead", author: "Analog Dreams", genre: "Synthwave" },
];

const WINDOW_SIZE = 4096;
const hanningWindow = new Float32Array(WINDOW_SIZE);
for (let i = 0; i < WINDOW_SIZE; i++) {
  hanningWindow[i] =
    0.5 * (1 - Math.cos((2 * Math.PI * i) / (WINDOW_SIZE - 1)));
}

export default function AudioManipulator() {
  const { theme, setTheme } = useTheme();
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(
    null
  );
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSampleLibraryOpen, setIsSampleLibraryOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [clip, setClip] = useState<Clip | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastPitchChangeTimeRef = useRef<number>(0);
  const bufferPositionAtLastChangeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const playbackRateRef = useRef<number>(1);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayFeedbackGainRef = useRef<GainNode | null>(null);
  const isLoopingRef = useRef(false);
  const isManuallyStoppingRef = useRef(false);

  const gainNodeRef = useRef<GainNode | null>(null);
  const delayWetGainRef = useRef<GainNode | null>(null);
  const convolverNodeRef = useRef<ConvolverNode | null>(null);
  const convolverWetGainRef = useRef<GainNode | null>(null);

  const granularGainRef = useRef<GainNode | null>(null);
  const nextGrainTimeRef = useRef<number>(0);
  const grainSchedulerTimerRef = useRef<number | null>(null);

  const reverbNodeRef = useRef<{
    input: GainNode;
    output: GainNode;
    delays: DelayNode[];
    gains: GainNode[];
    filters: BiquadFilterNode[];
  } | null>(null);
  const reverbWetGainRef = useRef<GainNode | null>(null);
  const tremoloNodeRef = useRef<{
    lfo: OscillatorNode;
    depth: GainNode;
    amplitude: GainNode;
  } | null>(null);
  const tremoloWetGainRef = useRef<GainNode | null>(null);

  const bitcrushProcessorRef = useRef<AudioWorkletNode | null>(null);
  const bitcrushWetGainRef = useRef<GainNode | null>(null);
  const [workletLoaded, setWorkletLoaded] = useState(false);

  const radioProcessorRef = useRef<AudioWorkletNode | null>(null);
  const radioWetGainRef = useRef<GainNode | null>(null);
  const [radioWorkletLoaded, setRadioWorkletLoaded] = useState(false);

  const [effects, setEffects] = useState({
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
    bitcrushBitDepth: 8,
    bitcrushSampleRate: 0.5,
    bitcrushMix: 0.5,
    granularGrainSize: 0.1,
    granularOverlap: 0.5,
    granularChaos: 0.5,
    granularMix: 0.5,
    radioDistortion: 0.5,
    radioStatic: 0.3,
    radioMix: 0.5,

    // flags
    pitchEnabled: true,
    delayEnabled: false,
    reverbEnabled: false,
    convolverEnabled: false,
    tremoloEnabled: false,
    bitcrushEnabled: false,
    granularEnabled: false,
    radioEnabled: false,
  });

  const effectsRef = useRef(effects);

  useEffect(() => {
    effectsRef.current = effects;
  }, [effects]);

  useEffect(() => {
    setMounted(true);
    setIsSignedIn(isAuthenticated());
  }, []);

  useEffect(() => {
    audioContextRef.current = new AudioContext();
    const ctx = audioContextRef.current;

    gainNodeRef.current = ctx.createGain();
    gainNodeRef.current.gain.value = effects.volume;
    gainNodeRef.current.connect(ctx.destination);

    granularGainRef.current = ctx.createGain();
    granularGainRef.current.gain.value = effects.granularMix;
    granularGainRef.current.connect(gainNodeRef.current);

    convolverNodeRef.current = ctx.createConvolver();
    convolverNodeRef.current.buffer = createImpulseResponse(ctx, 15, 2.5);

    convolverWetGainRef.current = ctx.createGain();
    convolverWetGainRef.current.gain.value = effects.convolverMix;

    convolverNodeRef.current.connect(convolverWetGainRef.current);
    convolverWetGainRef.current.connect(ctx.destination);

    reverbNodeRef.current = createReverb(
      ctx,
      effects.reverbRoomSize,
      effects.reverbDecay
    );
    reverbWetGainRef.current = ctx.createGain();
    reverbWetGainRef.current.gain.value = effects.reverbMix;

    reverbNodeRef.current.output.connect(reverbWetGainRef.current);
    reverbWetGainRef.current.connect(ctx.destination);

    tremoloNodeRef.current = createTremolo(
      ctx,
      effects.tremoloRate,
      effects.tremoloDepth
    );
    tremoloWetGainRef.current = ctx.createGain();
    tremoloWetGainRef.current.gain.value = effects.tremoloMix;

    tremoloNodeRef.current.amplitude.connect(tremoloWetGainRef.current);
    tremoloWetGainRef.current.connect(ctx.destination);

    ctx.audioWorklet
      .addModule("/bitcrush-processor.js")
      .then(() => {
        setWorkletLoaded(true);
        bitcrushProcessorRef.current = new AudioWorkletNode(
          ctx,
          "bitcrush-processor"
        );
        bitcrushWetGainRef.current = ctx.createGain();
        bitcrushWetGainRef.current.gain.value = effects.bitcrushMix; // use destructured variable

        bitcrushProcessorRef.current.connect(bitcrushWetGainRef.current);
        bitcrushWetGainRef.current.connect(ctx.destination);
      })
      .catch((error) => {
        console.error("[v0] Error loading bitcrush worklet:", error);
      });

    ctx.audioWorklet
      .addModule("/radio-processor.js")
      .then(() => {
        setRadioWorkletLoaded(true);
        radioProcessorRef.current = new AudioWorkletNode(
          ctx,
          "radio-processor"
        );
        radioWetGainRef.current = ctx.createGain();
        radioWetGainRef.current.gain.value = effects.radioMix;

        radioProcessorRef.current.port.onmessage = (event) => {
          if (event.data.type === "debug") {
            console.log("[v0] Radio processor:", event.data);
          }
        };

        radioProcessorRef.current.connect(radioWetGainRef.current);
        radioWetGainRef.current.connect(ctx.destination);
      })
      .catch((error) => {
        console.error("[v0] Error loading radio worklet:", error);
      });

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // effets handlers
  useEffect(() => {
    if (isPlaying) {
      pauseAudio();
      playAudio(clip ? clip : undefined);
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
  ]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(
        effects.volume,
        audioContextRef.current!.currentTime,
        0.01
      );
    }
  }, [effects.volume]);

  useEffect(() => {
    if (reverbWetGainRef.current && audioContextRef.current) {
      reverbWetGainRef.current.gain.setTargetAtTime(
        effects.reverbMix,
        audioContextRef.current.currentTime,
        0.01
      );
    }
  }, [effects.reverbMix]);

  useEffect(() => {
    if (granularGainRef.current && audioContextRef.current) {
      granularGainRef.current.gain.setTargetAtTime(
        effects.granularMix,
        audioContextRef.current.currentTime,
        0.01
      );
    }
  }, [effects.granularMix]);

  useEffect(() => {
    if (tremoloWetGainRef.current && audioContextRef.current) {
      tremoloWetGainRef.current.gain.setTargetAtTime(
        effects.tremoloMix,
        audioContextRef.current.currentTime,
        0.01
      );
    }
  }, [effects.tremoloMix]);

  useEffect(() => {
    if (tremoloNodeRef.current && audioContextRef.current) {
      const { lfo, depth } = tremoloNodeRef.current;
      const currentTime = audioContextRef.current.currentTime;

      lfo.frequency.setTargetAtTime(effects.tremoloRate, currentTime, 0.01);
      depth.gain.setTargetAtTime(effects.tremoloDepth, currentTime, 0.01);
    }
  }, [effects.tremoloRate, effects.tremoloDepth]);

  useEffect(() => {
    if (reverbNodeRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;
      const baseTimes = [
        0.0297, 0.0371, 0.0411, 0.0437, 0.0521, 0.0617, 0.0719, 0.0823,
      ];

      reverbNodeRef.current.delays.forEach((delay, i) => {
        delay.delayTime.setTargetAtTime(
          baseTimes[i] * (1 + effects.reverbRoomSize * 3),
          currentTime,
          0.1
        );
        reverbNodeRef.current!.gains[i].gain.setTargetAtTime(
          effects.reverbDecay * 0.65,
          currentTime,
          0.1
        );
        reverbNodeRef.current!.filters[i].frequency.setTargetAtTime(
          3000 - effects.reverbDecay * 1500,
          currentTime,
          0.1
        );
      });
    }
  }, [effects.reverbRoomSize, effects.reverbDecay]);

  useEffect(() => {
    if (bitcrushWetGainRef.current && audioContextRef.current) {
      bitcrushWetGainRef.current.gain.setTargetAtTime(
        effects.bitcrushMix, // use destructured variable
        audioContextRef.current.currentTime,
        0.01
      );
    }
  }, [effects.bitcrushMix]);

  useEffect(() => {
    if (radioWetGainRef.current && audioContextRef.current) {
      radioWetGainRef.current.gain.setTargetAtTime(
        effects.radioMix,
        audioContextRef.current.currentTime,
        0.01
      );
    }
  }, [effects.radioMix]);

  useEffect(() => {
    if (bitcrushProcessorRef.current && workletLoaded) {
      bitcrushProcessorRef.current.parameters.get("bitDepth")?.setValueAtTime(
        effects.bitcrushBitDepth, // use destructured variable
        audioContextRef.current!.currentTime
      );
      bitcrushProcessorRef.current.parameters.get("sampleRate")?.setValueAtTime(
        effects.bitcrushSampleRate, // use destructured variable
        audioContextRef.current!.currentTime
      );
    }
  }, [effects.bitcrushBitDepth, effects.bitcrushSampleRate, workletLoaded]);

  useEffect(() => {
    if (radioProcessorRef.current && radioWorkletLoaded) {
      radioProcessorRef.current.parameters
        .get("distortion")
        ?.setValueAtTime(
          effects.radioDistortion,
          audioContextRef.current!.currentTime
        );
      radioProcessorRef.current.parameters
        .get("static")
        ?.setValueAtTime(
          effects.radioStatic,
          audioContextRef.current!.currentTime
        );
    }
  }, [effects.radioDistortion, effects.radioStatic, radioWorkletLoaded]);

  useEffect(() => {
    if (delayNodeRef.current && audioContextRef.current && isPlaying) {
      delayNodeRef.current.delayTime.setTargetAtTime(
        effects.delayTime,
        audioContextRef.current.currentTime,
        0.01
      );
    }
  }, [effects.delayTime, isPlaying]);

  useEffect(() => {
    if (convolverWetGainRef.current && audioContextRef.current) {
      convolverWetGainRef.current.gain.setTargetAtTime(
        effects.convolverMix,
        audioContextRef.current.currentTime,
        0.01
      );
    }
  }, [effects.convolverMix]);

  useEffect(() => {
    if (delayFeedbackGainRef.current && audioContextRef.current && isPlaying) {
      delayFeedbackGainRef.current.gain.setTargetAtTime(
        effects.delayFeedback,
        audioContextRef.current.currentTime,
        0.01
      );
    }
  }, [effects.delayFeedback, isPlaying]);

  useEffect(() => {
    if (delayWetGainRef.current && audioContextRef.current && isPlaying) {
      delayWetGainRef.current.gain.setTargetAtTime(
        effects.delayMix,
        audioContextRef.current.currentTime,
        0.01
      );
    }
  }, [effects.delayMix, isPlaying]);

  useEffect(() => {
    if (
      sourceNodeRef.current &&
      audioContextRef.current &&
      isPlaying
      // effects.pitchEnabled
    ) {
      // Calculate current position before stopping
      const contextElapsed =
        audioContextRef.current.currentTime - lastPitchChangeTimeRef.current;
      const bufferElapsed = contextElapsed * playbackRateRef.current;
      const currentBufferPosition =
        bufferPositionAtLastChangeRef.current + bufferElapsed;

      // Store the current position
      pauseTimeRef.current = currentBufferPosition;

      // Restart playback with new pitch
      pauseAudio();
      playAudio(clip ? clip : undefined);
    }
  }, [effects.pitch]);

  useEffect(() => {
    if (!audioBuffer) return;

    if (effects.reverse) {
      const reversed = reverseAudioBuffer(audioBuffer);
      setProcessedBuffer(reversed);
    } else {
      setProcessedBuffer(audioBuffer);
    }
    if (clip) {
      setClip({
        ...clip,
        startTime: duration - clip.endTime,
        endTime: duration - clip.startTime,
      });
    }
  }, [effects.reverse, audioBuffer]);

  useEffect(() => {
    if (isPlaying) {
      pauseAudio();
      // since audio buffer is changed (flipped), need to flip the current node it is paused at
      pauseTimeRef.current = duration - pauseTimeRef.current;
      setTimeout(() => playAudio(), 50);
    }
  }, [processedBuffer]);

  const triggerClipUpdate = (input_clip?: Clip) => {
    if (isPlaying && input_clip) {
      const currentPosition = pauseTimeRef.current;

      // Check if current position is within the new clip bounds
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

      if (isWithinNewClip) {
        // If we're still within bounds, just continue playing with updated clip
        // The playAudio function will handle the new endpoint automatically
        pauseAudio();
        playAudio(input_clip);
        // setTimeout(() => playAudio(clip), 50);
      } else {
        // If we're outside the new clip bounds, reset to clip start
        pauseAudio();
        pauseTimeRef.current = pauseTimeRef.current;
        playAudio(input_clip);
        // setTimeout(() => playAudio(clip), 50);
      }
    } else if (!input_clip) {
      pauseAudio();
    }
  };

  const reverseAudioBuffer = (buffer: AudioBuffer): AudioBuffer => {
    const reversedBuffer = audioContextRef.current!.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      const reversedData = reversedBuffer.getChannelData(channel);

      for (let i = 0; i < channelData.length; i++) {
        reversedData[i] = channelData[channelData.length - 1 - i];
      }
    }

    return reversedBuffer;
  };

  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (isPlaying) {
      pauseAudio();
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setAudioFile(file);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = await audioContextRef.current!.decodeAudioData(
        arrayBuffer
      );

      setAudioBuffer(buffer);
      setProcessedBuffer(buffer);
      setDuration(buffer.duration);
      setCurrentTime(0);
      pauseTimeRef.current = 0;
      setIsPlaying(false);
      setClip(null);
    } catch (error) {
      console.error("Error loading audio file:", error);
      alert(`Error loading audio file: ${error}`);
    }
  };

  const handleSampleSelect = (sample: (typeof SAMPLE_LIBRARY)[0]) => {
    setIsSampleLibraryOpen(false);
  };

  const playAudio = (clipToPlay?: Clip) => {
    if (!processedBuffer || !audioContextRef.current) return;
    const clipForPlayback = clipToPlay ?? clip;

    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }

    if (delayNodeRef.current) {
      delayNodeRef.current.disconnect();
    }
    if (delayFeedbackGainRef.current) {
      delayFeedbackGainRef.current.disconnect();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (grainSchedulerTimerRef.current) {
      cancelAnimationFrame(grainSchedulerTimerRef.current);
      grainSchedulerTimerRef.current = null;
    }

    let bufferStartOffset = pauseTimeRef.current;

    let playDuration = duration;
    if (clipForPlayback) {
      if (
        !bufferStartOffset ||
        bufferStartOffset < clipForPlayback.startTime ||
        bufferStartOffset > clipForPlayback.endTime
      ) {
        bufferStartOffset = clipForPlayback.startTime;
      }
      // Calculate the actual duration of the clip
      playDuration = clipForPlayback.endTime - bufferStartOffset;
    }

    sourceNodeRef.current = audioContextRef.current.createBufferSource();
    sourceNodeRef.current.buffer = processedBuffer;
    if (effects.pitchEnabled) {
      sourceNodeRef.current.playbackRate.value = effects.pitch;
    } else {
      sourceNodeRef.current.playbackRate.value = 1;
    }

    const ctx = audioContextRef.current;
    const dryGain = ctx.createGain();

    // DRY GAIN
    const activeDelayMix = effects.delayEnabled ? effects.delayMix : 0;
    const activeReverbMix = effects.reverbEnabled ? effects.reverbMix : 0;
    const activeBitcrushMix = effects.bitcrushEnabled ? effects.bitcrushMix : 0;
    const activeGranularMix = effects.granularEnabled ? effects.granularMix : 0;
    const activeRadioMix = effects.radioEnabled ? effects.radioMix : 0;
    const activeConvolverMix = effects.convolverEnabled
      ? effects.convolverMix
      : 0;
    const activeTremoloMix = effects.tremoloEnabled ? effects.tremoloMix : 0;

    dryGain.gain.value =
      1 -
      Math.max(
        activeDelayMix,
        activeReverbMix,
        activeBitcrushMix,
        activeGranularMix,
        activeRadioMix,
        activeConvolverMix,
        activeTremoloMix
      ) *
        0.5;

    // sourceNodeRef.current.connect(dryGain);
    // dryGain.connect(gainNodeRef.current!);
    if (!effects.granularEnabled) {
      sourceNodeRef.current.connect(dryGain);
      dryGain.connect(gainNodeRef.current!);
    }

    // DELAY EFFECT
    if (effects.delayEnabled) {
      delayNodeRef.current = ctx.createDelay(2);
      delayFeedbackGainRef.current = ctx.createGain();
      delayWetGainRef.current = ctx.createGain();

      delayNodeRef.current.delayTime.value = effects.delayTime;
      delayFeedbackGainRef.current.gain.value = effects.delayFeedback;
      delayWetGainRef.current.gain.value = effects.delayMix;

      delayNodeRef.current.connect(delayFeedbackGainRef.current);
      delayFeedbackGainRef.current.connect(delayNodeRef.current);
      delayNodeRef.current.connect(delayWetGainRef.current);

      sourceNodeRef.current.connect(delayNodeRef.current);
      delayWetGainRef.current.connect(gainNodeRef.current!);
    }

    // REVERB EFFECT
    if (effects.reverbEnabled && reverbNodeRef.current) {
      sourceNodeRef.current.connect(reverbNodeRef.current.input);
    }

    // CONVOLVER EFFECT
    if (effects.convolverEnabled && convolverNodeRef.current) {
      sourceNodeRef.current.connect(convolverNodeRef.current);
    }

    // TREMOLO EFFECT
    if (effects.tremoloEnabled && tremoloNodeRef.current) {
      sourceNodeRef.current.connect(tremoloNodeRef.current.amplitude);
    }

    // BIT CRUSH EFFECT
    if (
      effects.bitcrushEnabled &&
      bitcrushProcessorRef.current &&
      workletLoaded
    ) {
      sourceNodeRef.current.connect(bitcrushProcessorRef.current);
    }

    // RADIO EFFECT
    if (
      effects.radioEnabled &&
      radioProcessorRef.current &&
      radioWorkletLoaded
    ) {
      console.log(
        "[v0] Connecting radio effect, mix:",
        effects.radioMix,
        "distortion:",
        effects.radioDistortion,
        "static:",
        effects.radioStatic
      );
      sourceNodeRef.current.connect(radioProcessorRef.current);
    }

    sourceNodeRef.current.start(0, bufferStartOffset);
    // if (!effects.granularEnabled) {
    //   sourceNodeRef.current.start(0, bufferStartOffset);
    // }
    startTimeRef.current = audioContextRef.current.currentTime;
    lastPitchChangeTimeRef.current = audioContextRef.current.currentTime;
    bufferPositionAtLastChangeRef.current = bufferStartOffset;
    playbackRateRef.current = effects.pitch;
    setIsPlaying(true);

    if (effects.granularEnabled && effects.granularMix > 0) {
      nextGrainTimeRef.current = ctx.currentTime;
      scheduleGrains(bufferStartOffset, clipForPlayback);
    }

    const updateTime = () => {
      if (audioContextRef.current && sourceNodeRef.current) {
        const contextElapsed =
          audioContextRef.current.currentTime - lastPitchChangeTimeRef.current;
        const bufferElapsed = contextElapsed * playbackRateRef.current;
        const currentBufferPosition =
          bufferPositionAtLastChangeRef.current + bufferElapsed;

        // update time forward/backward based on reverse effect
        const visualTime = effects.reverse
          ? duration - currentBufferPosition
          : currentBufferPosition;

        setCurrentTime(visualTime);

        if (bufferElapsed >= playDuration) {
          if (isManuallyStoppingRef.current) {
            return;
          }
          if (isLoopingRef.current) {
            if (clipForPlayback) {
              pauseTimeRef.current = clipForPlayback.startTime;
              playAudio(clipForPlayback);
            } else {
              pauseTimeRef.current = 0;
              playAudio();
            }
            return;
          } else {
            setIsPlaying(false);
            animationFrameRef.current = null;
            if (grainSchedulerTimerRef.current) {
              cancelAnimationFrame(grainSchedulerTimerRef.current);
              grainSchedulerTimerRef.current = null;
            }
            if (delayNodeRef.current) {
              delayNodeRef.current.disconnect();
              delayNodeRef.current = null;
            }
            if (delayFeedbackGainRef.current) {
              delayFeedbackGainRef.current.disconnect();
              delayFeedbackGainRef.current = null;
            }
            if (delayWetGainRef.current) {
              delayWetGainRef.current.disconnect();
              delayWetGainRef.current = null;
            }
            if (sourceNodeRef.current) {
              sourceNodeRef.current.stop();
              sourceNodeRef.current.disconnect();
            }
            setSelectedClipId(null);
            if (clipForPlayback) {
              setCurrentTime(
                effects.reverse
                  ? clipForPlayback.visualEndTime
                  : clipForPlayback.visualStartTime
              );
              pauseTimeRef.current = clipForPlayback.startTime;
            } else {
              setCurrentTime(0);
              pauseTimeRef.current = 0;
            }
            return;
          }
        }

        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    };
    animationFrameRef.current = requestAnimationFrame(updateTime);
  };

  const scheduleGrains = (startOffset: number, clip?: Clip | null) => {
    if (
      !audioContextRef.current ||
      !processedBuffer ||
      !granularGainRef.current ||
      !isPlaying
    )
      return;

    const ctx = audioContextRef.current;
    const lookahead = 0.1; // 100ms lookahead

    const currentEffects = effectsRef.current;

    while (nextGrainTimeRef.current < ctx.currentTime + lookahead) {
      const contextElapsed =
        nextGrainTimeRef.current - lastPitchChangeTimeRef.current;
      const bufferElapsed = contextElapsed * playbackRateRef.current;
      const currentBufferPosition =
        bufferPositionAtLastChangeRef.current + bufferElapsed;

      const chaosOffset =
        (Math.random() * 2 - 1) * currentEffects.granularChaos * 0.5; // +/- 0.5s max chaos
      let grainPosition = currentBufferPosition + chaosOffset;

      if (clip) {
        grainPosition = Math.max(
          clip.startTime,
          Math.min(
            clip.endTime - currentEffects.granularGrainSize,
            grainPosition
          )
        );
      } else {
        grainPosition = Math.max(
          0,
          Math.min(duration - currentEffects.granularGrainSize, grainPosition)
        );
      }

      const grainSource = ctx.createBufferSource();
      grainSource.buffer = processedBuffer;
      grainSource.playbackRate.value = currentEffects.pitch;

      const grainGain = ctx.createGain();

      // setValueCurveAtTime applies the window shape over the duration of the grain
      try {
        grainGain.gain.setValueCurveAtTime(
          hanningWindow,
          nextGrainTimeRef.current,
          currentEffects.granularGrainSize
        );
      } catch (e) {
        // Fallback for edge cases where duration might be invalid
        grainGain.gain.setValueAtTime(0, nextGrainTimeRef.current);
        grainGain.gain.linearRampToValueAtTime(
          1,
          nextGrainTimeRef.current + currentEffects.granularGrainSize * 0.5
        );
        grainGain.gain.linearRampToValueAtTime(
          0,
          nextGrainTimeRef.current + currentEffects.granularGrainSize
        );
      }

      grainSource.connect(grainGain);
      grainGain.connect(granularGainRef.current);

      grainSource.start(
        nextGrainTimeRef.current,
        grainPosition,
        currentEffects.granularGrainSize + 0.03
      );

      const interval = currentEffects.granularGrainSize * 0.5;
      nextGrainTimeRef.current += Math.max(0.01, interval); // Minimum 10ms interval
    }

    grainSchedulerTimerRef.current = requestAnimationFrame(() =>
      scheduleGrains(startOffset, clip)
    );
  };

  const pauseAudio = () => {
    if (sourceNodeRef.current && audioContextRef.current) {
      isManuallyStoppingRef.current = true;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (grainSchedulerTimerRef.current) {
        cancelAnimationFrame(grainSchedulerTimerRef.current);
        grainSchedulerTimerRef.current = null;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      }

      if (delayNodeRef.current) {
        delayNodeRef.current.disconnect();
        delayNodeRef.current = null;
      }
      if (delayFeedbackGainRef.current) {
        delayFeedbackGainRef.current.disconnect();
        delayFeedbackGainRef.current = null;
      }
      if (delayWetGainRef.current) {
        delayWetGainRef.current.disconnect();
        delayWetGainRef.current = null;
      }

      const contextElapsed =
        audioContextRef.current.currentTime - lastPitchChangeTimeRef.current;
      const bufferElapsed = contextElapsed * playbackRateRef.current;
      const currentBufferPosition =
        bufferPositionAtLastChangeRef.current + bufferElapsed;

      pauseTimeRef.current = currentBufferPosition;

      setIsPlaying(false);

      setTimeout(() => {
        isManuallyStoppingRef.current = false;
      }, 100);
    }
  };

  const resetAudio = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (grainSchedulerTimerRef.current) {
      cancelAnimationFrame(grainSchedulerTimerRef.current);
      grainSchedulerTimerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    pauseTimeRef.current = 0;
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const downloadProcessedAudio = async () => {
    if (!processedBuffer) return;

    setIsRendering(true);

    try {
      const offlineCtx = new OfflineAudioContext(
        processedBuffer.numberOfChannels,
        processedBuffer.length,
        processedBuffer.sampleRate
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = processedBuffer;
      source.playbackRate.value = effects.pitch;

      // const delayNode = offlineCtx.createDelay(2);
      // const delayFeedbackGain = offlineCtx.createGain();
      // const delayWetGain = offlineCtx.createGain();
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
      dryGain.gain.value =
        1 -
        Math.max(
          activeDelayMix,
          activeReverbMix,
          activeBitcrushMix,
          activeRadioMix,
          activeConvolverMix,
          activeTremoloMix
        ) *
          0.5;
      // const reverbWetGain = offlineCtx.createGain();

      source.connect(dryGain);
      dryGain.connect(offlineCtx.destination);

      // DELAY EFFECT
      if (effects.delayEnabled) {
        const delayNode = offlineCtx.createDelay(2);
        const delayFeedbackGain = offlineCtx.createGain();
        const delayWetGain = offlineCtx.createGain();

        delayNode.delayTime.value = effects.delayTime;
        delayFeedbackGain.gain.value = effects.delayFeedback;
        delayWetGain.gain.value = effects.delayMix;

        delayNode.connect(delayFeedbackGain);
        delayFeedbackGain.connect(delayNode);
        delayNode.connect(delayWetGain);

        source.connect(delayNode);
        delayWetGain.connect(offlineCtx.destination);
      }

      // REVERB EFFECT
      if (effects.reverbEnabled) {
        const reverb = createReverb(
          offlineCtx,
          effects.reverbRoomSize,
          effects.reverbDecay
        );
        const reverbWetGain = offlineCtx.createGain();
        reverbWetGain.gain.value = effects.reverbMix;

        source.connect(reverb.input);
        reverb.output.connect(reverbWetGain);
        reverbWetGain.connect(offlineCtx.destination);
      }

      // CONVOLVER EFFECT
      if (effects.convolverEnabled) {
        const convolverWetGain = offlineCtx.createGain();

        convolverWetGain.gain.value = effects.convolverMix;
        const convolver = offlineCtx.createConvolver();
        convolver.buffer = createImpulseResponse(offlineCtx, 15, 2.5);

        source.connect(convolver);
        convolver.connect(convolverWetGain);
        convolverWetGain.connect(offlineCtx.destination);
      }

      // TREMOLO EFFECT
      if (effects.tremoloEnabled) {
        const tremoloWetGain = offlineCtx.createGain();
        tremoloWetGain.gain.value = effects.tremoloMix;

        const tremolo = createTremolo(
          offlineCtx,
          effects.tremoloRate,
          effects.tremoloDepth
        );

        source.connect(tremolo.amplitude);

        tremolo.amplitude.connect(tremoloWetGain);
        tremoloWetGain.connect(offlineCtx.destination);
      }

      // BIT CRUSH EFFECT
      if (effects.bitcrushEnabled) {
        const bitcrushWetGain = offlineCtx.createGain();
        bitcrushWetGain.gain.value = effects.bitcrushMix;

        const bitcrushProcessor = new AudioWorkletNode(
          offlineCtx,
          "bitcrush-processor"
        );
        bitcrushProcessor.parameters
          .get("bitDepth")
          ?.setValueAtTime(effects.bitcrushBitDepth, 0);
        bitcrushProcessor.parameters
          .get("sampleRate")
          ?.setValueAtTime(effects.bitcrushSampleRate, 0);

        source.connect(bitcrushProcessor);

        bitcrushProcessor.connect(bitcrushWetGain);
        bitcrushWetGain.connect(offlineCtx.destination);
      }

      // RADIO EFFECT
      if (effects.radioEnabled) {
        const radioWetGain = offlineCtx.createGain();
        radioWetGain.gain.value = effects.radioMix;

        const radioProcessor = new AudioWorkletNode(
          offlineCtx,
          "radio-processor"
        );
        radioProcessor.parameters
          .get("distortion")
          ?.setValueAtTime(effects.radioDistortion, 0);
        radioProcessor.parameters
          .get("static")
          ?.setValueAtTime(effects.radioStatic, 0);

        source.connect(radioProcessor);
        radioProcessor.connect(radioWetGain);
        radioWetGain.connect(offlineCtx.destination);
      }

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
    if (!processedBuffer || !clip) return;

    setIsRendering(true);

    try {
      const startSample = Math.floor(
        clip.startTime * processedBuffer.sampleRate
      );
      const endSample = Math.floor(clip.endTime * processedBuffer.sampleRate);
      const clipLength = endSample - startSample;

      const clipBuffer = audioContextRef.current!.createBuffer(
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
      const activeDelayMix = effects.delayEnabled ? effects.delayMix : 0;
      const activeReverbMix = effects.reverbEnabled ? effects.reverbMix : 0;
      const activeBitcrushMix = effects.bitcrushEnabled
        ? effects.bitcrushMix
        : 0;
      const activeRadioMix = effects.radioEnabled ? effects.radioMix : 0;
      dryGain.gain.value =
        1 -
        Math.max(
          activeDelayMix,
          activeReverbMix,
          activeBitcrushMix,
          activeRadioMix
        ) *
          0.5;

      source.connect(dryGain);
      dryGain.connect(offlineCtx.destination);

      // DELAY EFFECT
      if (effects.delayEnabled) {
        const delayNode = offlineCtx.createDelay(2);
        const delayFeedbackGain = offlineCtx.createGain();
        const delayWetGain = offlineCtx.createGain();

        delayNode.delayTime.value = effects.delayTime;
        delayFeedbackGain.gain.value = effects.delayFeedback;
        delayWetGain.gain.value = effects.delayMix;

        delayNode.connect(delayFeedbackGain);
        delayFeedbackGain.connect(delayNode);
        delayNode.connect(delayWetGain);

        source.connect(delayNode);
        delayWetGain.connect(offlineCtx.destination);
      }

      // REVERB EFFECT
      if (effects.reverbEnabled) {
        const reverb = createReverb(
          offlineCtx,
          effects.reverbRoomSize,
          effects.reverbDecay
        );
        const reverbWetGain = offlineCtx.createGain();
        reverbWetGain.gain.value = effects.reverbMix;

        source.connect(reverb.input);
        reverb.output.connect(reverbWetGain);
        reverbWetGain.connect(offlineCtx.destination);
      }

      // CONVOLVER EFFECT
      if (effects.convolverEnabled) {
        const convolverWetGain = offlineCtx.createGain();
        convolverWetGain.gain.value = effects.convolverMix;

        const convolver = offlineCtx.createConvolver();
        convolver.buffer = createImpulseResponse(offlineCtx, 15, 2.5);

        source.connect(convolver);
        convolver.connect(convolverWetGain);
        convolverWetGain.connect(offlineCtx.destination);
      }

      // TREMOLO EFFECT
      if (effects.tremoloEnabled) {
        const tremoloWetGain = offlineCtx.createGain();
        tremoloWetGain.gain.value = effects.tremoloMix;

        const tremolo = createTremolo(
          offlineCtx,
          effects.tremoloRate,
          effects.tremoloDepth
        );

        source.connect(tremolo.amplitude);
        tremolo.amplitude.connect(tremoloWetGain);
        tremoloWetGain.connect(offlineCtx.destination);
      }

      // BIT CRUSH EFFECT
      if (effects.bitcrushEnabled) {
        const bitcrushWetGain = offlineCtx.createGain();
        bitcrushWetGain.gain.value = effects.bitcrushMix;

        const bitcrushProcessor = new AudioWorkletNode(
          offlineCtx,
          "bitcrush-processor"
        );
        bitcrushProcessor.parameters
          .get("bitDepth")
          ?.setValueAtTime(effects.bitcrushBitDepth, 0);
        bitcrushProcessor.parameters
          .get("sampleRate")
          ?.setValueAtTime(effects.bitcrushSampleRate, 0);

        source.connect(bitcrushProcessor);
        bitcrushProcessor.connect(bitcrushWetGain);
        bitcrushWetGain.connect(offlineCtx.destination);
      }

      // RADIO EFFECT
      if (effects.radioEnabled) {
        const radioWetGain = offlineCtx.createGain();
        radioWetGain.gain.value = effects.radioMix;

        const radioProcessor = new AudioWorkletNode(
          offlineCtx,
          "radio-processor"
        );
        radioProcessor.parameters
          .get("distortion")
          ?.setValueAtTime(effects.radioDistortion, 0);
        radioProcessor.parameters
          .get("static")
          ?.setValueAtTime(effects.radioStatic, 0);

        source.connect(radioProcessor);
        radioProcessor.connect(radioWetGain);
        radioWetGain.connect(offlineCtx.destination);
      }

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

  const seekAudio = (time: number) => {
    const wasPlaying = isPlaying;

    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (grainSchedulerTimerRef.current) {
      cancelAnimationFrame(grainSchedulerTimerRef.current);
      grainSchedulerTimerRef.current = null;
    }

    if (effects.reverse) {
      pauseTimeRef.current = duration - time;
      setCurrentTime(time);
    } else {
      pauseTimeRef.current = time;
      setCurrentTime(time);
    }

    setIsPlaying(false);

    if (wasPlaying) {
      playAudio();
    }
  };

  const createReverb = (
    ctx: AudioContext | OfflineAudioContext,
    roomSize: number,
    decay: number
  ) => {
    const delays = [
      ctx.createDelay(5.0),
      ctx.createDelay(5.0),
      ctx.createDelay(5.0),
      ctx.createDelay(5.0),
      ctx.createDelay(5.0),
      ctx.createDelay(5.0),
      ctx.createDelay(5.0),
      ctx.createDelay(5.0),
    ];

    const gains = [
      ctx.createGain(),
      ctx.createGain(),
      ctx.createGain(),
      ctx.createGain(),
      ctx.createGain(),
      ctx.createGain(),
      ctx.createGain(),
      ctx.createGain(),
    ];

    const filters = [
      ctx.createBiquadFilter(),
      ctx.createBiquadFilter(),
      ctx.createBiquadFilter(),
      ctx.createBiquadFilter(),
      ctx.createBiquadFilter(),
      ctx.createBiquadFilter(),
      ctx.createBiquadFilter(),
      ctx.createBiquadFilter(),
    ];

    const baseTimes = [
      0.0297, 0.0371, 0.0411, 0.0437, 0.0521, 0.0617, 0.0719, 0.0823,
    ];

    delays.forEach((delay, i) => {
      delay.delayTime.value = baseTimes[i] * (1 + roomSize * 3);
      gains[i].gain.value = decay * 0.65;

      filters[i].type = "lowpass";
      filters[i].frequency.value = 3000 - decay * 1500;
      filters[i].Q.value = 0.5;
    });

    const input = ctx.createGain();
    const output = ctx.createGain();

    const diffusion = ctx.createGain();
    diffusion.gain.value = 0.7;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    const preCompressorGain = ctx.createGain();
    preCompressorGain.gain.value = 0.4;

    delays.forEach((delay, i) => {
      input.connect(delay);
      delay.connect(filters[i]);
      filters[i].connect(gains[i]);
      gains[i].connect(preCompressorGain);
      gains[i].connect(delays[(i + 1) % delays.length]);
      gains[i].connect(diffusion);
    });

    diffusion.connect(preCompressorGain);
    preCompressorGain.connect(compressor);
    compressor.connect(output);

    return { input, output, delays, gains, filters };
  };

  const createImpulseResponse = (
    ctx: AudioContext | OfflineAudioContext,
    duration: number,
    decay: number
  ) => {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    let lastOutL = 0;
    let lastOutR = 0;
    const filterCoef = 0.05; // Controls the "blur" amount (lower = more blurred/muffled)

    for (let i = 0; i < length; i++) {
      const rawNoiseL = Math.random() * 2 - 1;
      const rawNoiseR = Math.random() * 2 - 1;

      lastOutL = lastOutL + (rawNoiseL - lastOutL) * filterCoef;
      lastOutR = lastOutR + (rawNoiseR - lastOutR) * filterCoef;

      const fadeInDuration = sampleRate * 2.5; // 2.5 seconds fade in
      const fadeIn = i < fadeInDuration ? Math.pow(i / fadeInDuration, 2) : 1;

      // Exponential decay
      const envelope = Math.pow(1 - i / length, decay) * fadeIn;

      left[i] = lastOutL * envelope;
      right[i] = lastOutR * envelope;
    }
    return impulse;
  };

  const createTremolo = (
    ctx: AudioContext | OfflineAudioContext,
    rate: number,
    depth: number
  ) => {
    // Create LFO (Low Frequency Oscillator) to modulate amplitude
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = rate;

    // Create depth control (how much the LFO affects the signal)
    const depthGain = ctx.createGain();
    depthGain.gain.value = depth;

    // Create amplitude modulator
    const amplitude = ctx.createGain();
    amplitude.gain.value = 1.0 - depth * 0.5; // Offset so it oscillates around 1.0

    // Connect LFO through depth control to amplitude modulator
    lfo.connect(depthGain);
    depthGain.connect(amplitude.gain);

    // Start the LFO
    lfo.start();

    return {
      lfo,
      depth: depthGain,
      amplitude,
    };
  };

  const handleSaveProject = async () => {
    if (!isSignedIn || (!isSignedIn && !hasUnsavedChanges)) {
      window.location.href = "/sign-in";
      return;
    }

    setIsSaving(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setHasUnsavedChanges(false);
      setLastSavedTime(new Date());
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Error saving project");
    } finally {
      setIsSaving(false);
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

                {mounted && (
                  <button
                    onClick={() => {
                      setTheme(theme === "dark" ? "light" : "dark");
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left hover:bg-foreground hover:text-background transition-colors px-3 py-2 tracking-widest text-sm"
                  >
                    4 {theme === "dark" ? "LIGHT MODE" : "DARK MODE"}
                  </button>
                )}
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
                <Dialog
                  open={isSampleLibraryOpen}
                  onOpenChange={setIsSampleLibraryOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="lg"
                      className="font-mono uppercase tracking-wider bg-transparent w-full"
                    >
                      Browse Sample Library
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="font-mono text-xl uppercase tracking-wider">
                        Sample Library
                      </DialogTitle>
                      <DialogDescription className="font-mono text-sm">
                        Select a sample from the library to load
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 mt-4">
                      {SAMPLE_LIBRARY.map((sample) => (
                        <button
                          key={sample.id}
                          onClick={() => handleSampleSelect(sample)}
                          className="w-full border-2 border-foreground p-4 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-mono font-bold text-base mb-1">
                                {sample.name}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="font-mono">
                                  By {sample.author}
                                </span>
                                <span className="font-mono">•</span>
                                <span className="font-mono uppercase tracking-wider">
                                  {sample.genre}
                                </span>
                              </div>
                            </div>
                            <PlayIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
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
                    audioBuffer={audioBuffer}
                    currentTime={currentTime}
                    isReversed={effects.reverse}
                    duration={duration}
                    onSeek={seekAudio}
                    clips={clip ? [clip] : []}
                    onClipsChange={(clips) => {
                      setClip(clips[0] || null);
                      triggerClipUpdate(clips[0] || null);
                    }}
                    pauseAudio={pauseAudio}
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
                      {selectedClipId && (
                        <span className="text-muted-foreground mr-2">
                          Clip {clip ? 1 : 0}
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
