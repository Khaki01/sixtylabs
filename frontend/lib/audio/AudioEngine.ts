import type { EffectsState, Clip } from "@/types/audio";
import { EffectsChain } from "./EffectsChain";

const WINDOW_SIZE = 4096;
const hanningWindow = new Float32Array(WINDOW_SIZE);
for (let i = 0; i < WINDOW_SIZE; i++) {
  hanningWindow[i] =
    0.5 * (1 - Math.cos((2 * Math.PI * i) / (WINDOW_SIZE - 1)));
}

/**
 * AudioEngine manages the Web Audio API context and playback
 */
export class AudioEngine {
  private ctx: AudioContext;
  private effectsChain: EffectsChain;

  // Audio buffer - always original, never modified
  private audioBuffer: AudioBuffer | null = null;

  // Playback state
  private sourceNode: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  private startTime = 0;
  private pauseTime = 0;
  private playbackRate = 1;
  private lastPitchChangeTime = 0;
  private bufferPositionAtLastChange = 0;
  private isManuallyStoppingRef = false;

  // Looping
  private isLooping = false;

  // Granular synthesis
  private nextGrainTime = 0;
  private grainSchedulerTimer: number | null = null;

  // Repeat effect caching
  private cachedRepeatBuffer: AudioBuffer | null = null;
  private cachedRepeatParams: { factor: number; cycleSize: number; inputBuffer: AudioBuffer } | null = null;

  // Animation frame for time updates
  private animationFrame: number | null = null;

  // Callbacks
  private onTimeUpdate?: (time: number) => void;
  private onPlayStateChange?: (isPlaying: boolean) => void;
  private onEnd?: () => void;

  constructor() {
    this.ctx = new AudioContext();
    this.effectsChain = new EffectsChain(this.ctx);
  }

  /**
   * Get the audio context
   */
  public getContext(): AudioContext {
    return this.ctx;
  }

  /**
   * Get the effects chain
   */
  public getEffectsChain(): EffectsChain {
    return this.effectsChain;
  }

  /**
   * Load audio from file
   */
  public async loadAudioFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.audioBuffer = buffer;

    // Clear repeat effect cache when new audio is loaded
    this.cachedRepeatBuffer = null;
    this.cachedRepeatParams = null;

    return buffer;
  }

  /**
   * Get audio buffer (always returns original for waveform display)
   */
  public getBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  /**
   * Get original audio buffer (same as getBuffer - kept for compatibility)
   */
  public getOriginalBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  /**
   * Create a reversed version of the buffer (private helper)
   */
  private reverseBuffer(buffer: AudioBuffer): AudioBuffer {
    const reversedBuffer = this.ctx.createBuffer(
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
  }

  /**
   * Set callbacks
   */
  public setCallbacks(callbacks: {
    onTimeUpdate?: (time: number) => void;
    onPlayStateChange?: (isPlaying: boolean) => void;
    onEnd?: () => void;
  }) {
    this.onTimeUpdate = callbacks.onTimeUpdate;
    this.onPlayStateChange = callbacks.onPlayStateChange;
    this.onEnd = callbacks.onEnd;
  }

  /**
   * Set looping
   */
  public setLooping(loop: boolean) {
    this.isLooping = loop;
  }

  /**
   * Play audio
   */
  public play(effects: EffectsState, clip?: Clip) {
    if (!this.audioBuffer) return;

    this.stop();

    // Determine which buffer to use - apply reverse first
    let bufferToPlay = this.audioBuffer;
    if (effects.reverse) {
      bufferToPlay = this.reverseBuffer(this.audioBuffer);
    }

    // Apply repeat effect AFTER reverse (so other effects work correctly)
    if (effects.repeatEnabled && effects.repeat > 1) {
      bufferToPlay = this.applyRepeatEffectForExport(
        bufferToPlay,
        effects.repeat,
        effects.repeatCycleSize
      );
    }

    let bufferStartOffset = this.pauseTime;
    let playDuration = bufferToPlay.duration;

    // Handle clip playback
    if (clip) {
      if (effects.reverse) {
        // When reversed, convert clip times
        const reversedStart = bufferToPlay.duration - clip.endTime;
        const reversedEnd = bufferToPlay.duration - clip.startTime;

        if (
          !bufferStartOffset ||
          bufferStartOffset < reversedStart ||
          bufferStartOffset > reversedEnd
        ) {
          bufferStartOffset = reversedStart;
        }
        playDuration = reversedEnd - bufferStartOffset;
      } else {
        if (
          !bufferStartOffset ||
          bufferStartOffset < clip.startTime ||
          bufferStartOffset > clip.endTime
        ) {
          bufferStartOffset = clip.startTime;
        }
        playDuration = clip.endTime - bufferStartOffset;
      }
    }

    // Create source node
    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = bufferToPlay;
    if (effects.pitchEnabled) {
      this.sourceNode.playbackRate.value = effects.pitch;
    } else {
      this.sourceNode.playbackRate.value = 1;
    }

    // Calculate dry gain
    const activeDelayMix = effects.delayEnabled ? effects.delayMix : 0;
    const activeReverbMix = effects.reverbEnabled ? effects.reverbMix : 0;
    const activeBitcrushMix = effects.bitcrushEnabled ? effects.bitcrushMix : 0;
    const activeGranularMix = effects.granularEnabled ? effects.granularMix : 0;
    const activeRadioMix = effects.radioEnabled ? effects.radioMix : 0;
    const activeConvolverMix = effects.convolverEnabled
      ? effects.convolverMix
      : 0;
    const activeTremoloMix = effects.tremoloEnabled ? effects.tremoloMix : 0;
    const activeDrunkMix = effects.drunkEnabled ? effects.drunkMix : 0;
    const activeEqMix = effects.eqEnabled ? effects.eqMix : 0;

    const maxOtherEffectMix = Math.max(
      activeDelayMix,
      activeReverbMix,
      activeBitcrushMix,
      activeGranularMix,
      activeRadioMix,
      activeConvolverMix,
      activeTremoloMix,
      activeDrunkMix
    );

    let dryGainValue = 1 - maxOtherEffectMix * 0.5;
    if (effects.eqEnabled) {
      dryGainValue = dryGainValue * (1 - activeEqMix);
    }

    const dryGain = this.ctx.createGain();
    dryGain.gain.value = dryGainValue;

    // Connect source to dry path (unless granular is enabled)
    if (!effects.granularEnabled) {
      this.sourceNode.connect(dryGain);
      dryGain.connect(this.effectsChain.gainNode);
    }

    // Connect effects
    if (effects.delayEnabled) {
      const { delay, feedbackGain, wetGain } =
        this.effectsChain.createDelayForPlayback(
          effects.delayTime,
          effects.delayFeedback,
          effects.delayMix
        );
      this.sourceNode.connect(delay);
      wetGain.connect(this.effectsChain.gainNode);
    }

    if (effects.reverbEnabled && this.effectsChain.reverbNode) {
      this.sourceNode.connect(this.effectsChain.reverbNode.input);
    }

    if (effects.convolverEnabled && this.effectsChain.convolverNode) {
      this.sourceNode.connect(this.effectsChain.convolverNode);
    }

    if (effects.tremoloEnabled && this.effectsChain.tremoloNode) {
      this.sourceNode.connect(this.effectsChain.tremoloNode.amplitude);
    }

    if (
      effects.bitcrushEnabled &&
      this.effectsChain.bitcrushProcessor &&
      this.effectsChain.workletLoaded
    ) {
      this.sourceNode.connect(this.effectsChain.bitcrushProcessor);
    }

    if (
      effects.radioEnabled &&
      this.effectsChain.radioProcessor &&
      this.effectsChain.radioWorkletLoaded
    ) {
      this.sourceNode.connect(this.effectsChain.radioProcessor);
    }

    if (
      effects.drunkEnabled &&
      this.effectsChain.drunkProcessor &&
      this.effectsChain.drunkWorkletLoaded
    ) {
      this.sourceNode.connect(this.effectsChain.drunkProcessor);
    }

    if (effects.eqEnabled && this.effectsChain.eqNode) {
      this.sourceNode.connect(this.effectsChain.eqNode.lowLP[0]);
      this.sourceNode.connect(this.effectsChain.eqNode.midHP[0]);
      this.sourceNode.connect(this.effectsChain.eqNode.highHP[0]);
    }

    // Start playback
    this.sourceNode.start(0, bufferStartOffset);
    this.startTime = this.ctx.currentTime;
    this.lastPitchChangeTime = this.ctx.currentTime;
    this.bufferPositionAtLastChange = bufferStartOffset;
    this.playbackRate = effects.pitchEnabled ? effects.pitch : 1;
    this.isPlaying = true;

    if (this.onPlayStateChange) {
      this.onPlayStateChange(true);
    }

    // Start granular synthesis if enabled
    if (effects.granularEnabled && effects.granularMix > 0) {
      this.nextGrainTime = this.ctx.currentTime;
      this.scheduleGrains(bufferStartOffset, clip, effects, bufferToPlay);
    }

    // Start time update loop
    this.updateTime(playDuration, clip, effects);
  }

  /**
   * Schedule granular synthesis grains
   */
  private scheduleGrains(
    startOffset: number,
    clip: Clip | undefined,
    effects: EffectsState,
    bufferToPlay: AudioBuffer
  ) {
    if (!bufferToPlay || !this.effectsChain.granularGain || !this.isPlaying)
      return;

    const lookahead = 0.1;
    const duration = bufferToPlay.duration;

    while (this.nextGrainTime < this.ctx.currentTime + lookahead) {
      const contextElapsed = this.nextGrainTime - this.lastPitchChangeTime;
      const bufferElapsed = contextElapsed * this.playbackRate;
      const currentBufferPosition =
        this.bufferPositionAtLastChange + bufferElapsed;

      const chaosOffset =
        (Math.random() * 2 - 1) * effects.granularChaos * 0.5;
      let grainPosition = currentBufferPosition + chaosOffset;

      if (clip) {
        const clipStart = effects.reverse
          ? duration - clip.endTime
          : clip.startTime;
        const clipEnd = effects.reverse
          ? duration - clip.startTime
          : clip.endTime;
        grainPosition = Math.max(
          clipStart,
          Math.min(clipEnd - effects.granularGrainSize, grainPosition)
        );
      } else {
        grainPosition = Math.max(
          0,
          Math.min(duration - effects.granularGrainSize, grainPosition)
        );
      }

      const grainSource = this.ctx.createBufferSource();
      grainSource.buffer = bufferToPlay;
      grainSource.playbackRate.value = effects.granularPitch;

      const grainGain = this.ctx.createGain();

      try {
        grainGain.gain.setValueCurveAtTime(
          hanningWindow,
          this.nextGrainTime,
          effects.granularGrainSize
        );
      } catch (e) {
        grainGain.gain.setValueAtTime(0, this.nextGrainTime);
        grainGain.gain.linearRampToValueAtTime(
          1,
          this.nextGrainTime + effects.granularGrainSize * 0.5
        );
        grainGain.gain.linearRampToValueAtTime(
          0,
          this.nextGrainTime + effects.granularGrainSize
        );
      }

      grainSource.connect(grainGain);
      grainGain.connect(this.effectsChain.granularGain);

      grainSource.start(
        this.nextGrainTime,
        grainPosition,
        effects.granularGrainSize + 0.03
      );

      const interval = effects.granularGrainSize * 0.5;
      this.nextGrainTime += Math.max(0.01, interval);
    }

    this.grainSchedulerTimer = requestAnimationFrame(() =>
      this.scheduleGrains(startOffset, clip, effects, bufferToPlay)
    );
  }

  /**
   * Update time loop
   */
  private updateTime(
    playDuration: number,
    clip: Clip | undefined,
    effects: EffectsState
  ) {
    if (!this.sourceNode || !this.audioBuffer) return;

    const contextElapsed = this.ctx.currentTime - this.lastPitchChangeTime;
    const bufferElapsed = contextElapsed * this.playbackRate;
    const currentBufferPosition =
      this.bufferPositionAtLastChange + bufferElapsed;

    const duration = this.audioBuffer.duration;

    // Calculate visual time (for display in UI)
    // When reversed, we need to show the time from the original buffer perspective
    let visualTime;
    if (effects.reverse) {
      visualTime = duration - currentBufferPosition;
    } else {
      visualTime = currentBufferPosition;
    }

    if (this.onTimeUpdate) {
      this.onTimeUpdate(visualTime);
    }

    if (bufferElapsed >= playDuration) {
      if (this.isManuallyStoppingRef) {
        return;
      }

      if (this.isLooping) {
        if (clip) {
          this.pauseTime = effects.reverse
            ? duration - clip.endTime
            : clip.startTime;
          this.play(effects, clip);
        } else {
          this.pauseTime = 0;
          this.play(effects);
        }
        return;
      } else {
        this.stop();
        if (this.onEnd) {
          this.onEnd();
        }
        return;
      }
    }

    this.animationFrame = requestAnimationFrame(() =>
      this.updateTime(playDuration, clip, effects)
    );
  }

  /**
   * Pause audio
   */
  public pause() {
    if (!this.sourceNode) return;

    this.isManuallyStoppingRef = true;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.grainSchedulerTimer) {
      cancelAnimationFrame(this.grainSchedulerTimer);
      this.grainSchedulerTimer = null;
    }

    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
    }

    const contextElapsed = this.ctx.currentTime - this.lastPitchChangeTime;
    const bufferElapsed = contextElapsed * this.playbackRate;
    const currentBufferPosition =
      this.bufferPositionAtLastChange + bufferElapsed;

    this.pauseTime = currentBufferPosition;
    this.isPlaying = false;

    if (this.onPlayStateChange) {
      this.onPlayStateChange(false);
    }

    setTimeout(() => {
      this.isManuallyStoppingRef = false;
    }, 100);
  }

  /**
   * Stop and cleanup
   */
  private stop() {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.grainSchedulerTimer) {
      cancelAnimationFrame(this.grainSchedulerTimer);
      this.grainSchedulerTimer = null;
    }
  }

  /**
   * Reset playback
   */
  public reset() {
    this.stop();
    this.pauseTime = 0;
    this.isPlaying = false;

    if (this.onPlayStateChange) {
      this.onPlayStateChange(false);
    }

    if (this.onTimeUpdate) {
      this.onTimeUpdate(0);
    }
  }

  /**
   * Seek to time
   */
  public seek(time: number, effects: EffectsState, clip?: Clip) {
    const wasPlaying = this.isPlaying;

    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.grainSchedulerTimer) {
      cancelAnimationFrame(this.grainSchedulerTimer);
      this.grainSchedulerTimer = null;
    }

    const duration = this.audioBuffer?.duration || 0;

    // When seeking, time is always in original buffer coordinates
    // If reversed, we need to convert it for internal playback
    if (effects.reverse) {
      this.pauseTime = duration - time;
    } else {
      this.pauseTime = time;
    }

    this.isPlaying = false;

    if (this.onTimeUpdate) {
      this.onTimeUpdate(time);
    }

    if (wasPlaying) {
      this.play(effects, clip);
    }
  }

  /**
   * Get playing state
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current pause time
   */
  public getPauseTime(): number {
    return this.pauseTime;
  }

  /**
   * Set pause time
   */
  public setPauseTime(time: number) {
    this.pauseTime = time;
  }

  /**
   * Update playback after pitch change
   */
  public updatePlaybackAfterPitchChange(
    effects: EffectsState,
    clip?: Clip
  ): void {
    if (!this.sourceNode || !this.isPlaying) return;

    const contextElapsed = this.ctx.currentTime - this.lastPitchChangeTime;
    const bufferElapsed = contextElapsed * this.playbackRate;
    const currentBufferPosition =
      this.bufferPositionAtLastChange + bufferElapsed;

    this.pauseTime = currentBufferPosition;
    this.pause();
    this.play(effects, clip);
  }

  /**
   * Create reversed buffer for export (kept for download functionality)
   */
  public reverseBufferForExport(buffer: AudioBuffer): AudioBuffer {
    return this.reverseBuffer(buffer);
  }

  /**
   * Apply repeat effect (creates same-length buffer with repeated cycles)
   * Based on correct implementation from /Desktop/repeat project
   */
  public applyRepeatEffectForExport(
    buffer: AudioBuffer,
    repeatFactor: number,
    cycleSizeMs: number
  ): AudioBuffer {
    if (repeatFactor <= 1) {
      return buffer;
    }

    // Check if we can use cached buffer (same input buffer and parameters)
    if (
      this.cachedRepeatBuffer &&
      this.cachedRepeatParams &&
      this.cachedRepeatParams.factor === repeatFactor &&
      this.cachedRepeatParams.cycleSize === cycleSizeMs &&
      this.cachedRepeatParams.inputBuffer === buffer
    ) {
      return this.cachedRepeatBuffer;
    }

    const sampleRate = buffer.sampleRate;
    const cycleSizeSamples = Math.floor((cycleSizeMs / 1000) * sampleRate);
    const repeatCount = Math.floor(repeatFactor);
    const crossfadeSamples = Math.min(32, Math.floor(cycleSizeSamples * 0.1));

    // Create output buffer with SAME length as input (no stretching)
    const outputBuffer = this.ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      sampleRate
    );

    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const inputData = buffer.getChannelData(channel);
      const outputData = outputBuffer.getChannelData(channel);

      let outputIndex = 0;

      // Process the input in chunks, but compress the repeats to fit original duration
      // Each input cycle gets repeated, but we advance through input faster
      const inputStep = cycleSizeSamples * repeatCount; // How much input to skip per output cycle group

      for (
        let inputStart = 0;
        inputStart < buffer.length && outputIndex < buffer.length;
        inputStart += inputStep
      ) {
        const cycleLength = Math.min(
          cycleSizeSamples,
          buffer.length - inputStart
        );

        // Repeat this cycle 'repeatCount' times
        for (
          let rep = 0;
          rep < repeatCount && outputIndex < buffer.length;
          rep++
        ) {
          for (let i = 0; i < cycleLength && outputIndex < buffer.length; i++) {
            let sample = inputData[inputStart + i];

            // Apply crossfade at cycle boundaries to reduce clicks
            if (i < crossfadeSamples && rep > 0) {
              const fadeIn = i / crossfadeSamples;
              sample *= fadeIn;
            }
            if (i >= cycleLength - crossfadeSamples && rep < repeatCount - 1) {
              const fadeOut = (cycleLength - i) / crossfadeSamples;
              sample *= fadeOut;
            }

            outputData[outputIndex] = sample;
            outputIndex++;
          }
        }
      }

      // Fill any remaining samples with silence (shouldn't happen, but safety)
      while (outputIndex < buffer.length) {
        outputData[outputIndex] = 0;
        outputIndex++;
      }
    }

    // Cache the buffer for future use
    this.cachedRepeatBuffer = outputBuffer;
    this.cachedRepeatParams = {
      factor: repeatFactor,
      cycleSize: cycleSizeMs,
      inputBuffer: buffer
    };

    return outputBuffer;
  }

  /**
   * Cleanup
   */
  public dispose() {
    this.stop();
    this.effectsChain.dispose();
    this.ctx.close();
  }
}
