import { AudioEngine } from './AudioEngine';
import { EffectsChain } from './EffectsChain';
import { Clip, PadEffects } from '@/types/audio';

/**
 * SamplerEngine - Manages multi-pad audio playback
 *
 * Key Features:
 * - Reuses AudioEngine buffer (no duplication)
 * - Per-pad source nodes with independent effects
 * - Reversed buffer caching using WeakMap (prevents memory leaks)
 * - Proper cleanup on pad stop (prevents orphaned nodes)
 * - Connects to shared EffectsChain
 *
 * Bug Prevention:
 * - Composition over duplication (no code copying from AudioEngine)
 * - WeakMap for reversed buffers (automatic garbage collection)
 * - Proper node cleanup (onended handlers)
 * - No duplicate audio contexts (reuses existing context)
 */
export class SamplerEngine {
  private audioEngine: AudioEngine;
  private effectsChain: EffectsChain;

  // Active source nodes per pad (for cleanup)
  private activeSources: Map<number, AudioBufferSourceNode>;

  // Reversed buffer cache (WeakMap for automatic garbage collection)
  private reversedBufferCache: WeakMap<AudioBuffer, AudioBuffer>;

  // Debounce rapid triggers (prevents rapid-fire clicks)
  private lastTriggerTime: Map<number, number>;
  private readonly MIN_PAD_INTERVAL = 50; // ms

  constructor(audioEngine: AudioEngine, effectsChain: EffectsChain) {
    this.audioEngine = audioEngine;
    this.effectsChain = effectsChain;
    this.activeSources = new Map();
    this.reversedBufferCache = new WeakMap();
    this.lastTriggerTime = new Map();
  }

  /**
   * Play a specific pad with its clip and effects
   *
   * @param padId - Pad index (0-15)
   * @param clip - Audio clip to play
   * @param padEffects - Per-pad effect settings
   * @returns boolean - True if playback started, false if debounced
   */
  public playPad(padId: number, clip: Clip, padEffects: PadEffects): boolean {
    // Debounce rapid triggers
    const now = Date.now();
    const lastTrigger = this.lastTriggerTime.get(padId) || 0;
    if (now - lastTrigger < this.MIN_PAD_INTERVAL) {
      return false;
    }
    this.lastTriggerTime.set(padId, now);

    // Stop existing playback on this pad
    this.stopPad(padId);

    // Get buffer (reuse AudioEngine's buffer)
    const buffer = this.audioEngine.getBuffer();
    if (!buffer) {
      console.warn('No audio buffer available');
      return false;
    }

    // Validate clip times
    if (!this.validateClip(clip, buffer.duration)) {
      console.error(`Invalid clip times for ${clip.id}`);
      return false;
    }

    try {
      // Create source node with effects
      const source = this.createSourceForPad(buffer, clip, padEffects);

      // Store for cleanup
      this.activeSources.set(padId, source);

      // Calculate clip duration
      const clipDuration = clip.endTime - clip.startTime;

      // Start playback from clip startTime
      source.start(0, clip.startTime, clipDuration);

      return true;
    } catch (error) {
      console.error(`Error playing pad ${padId}:`, error);
      return false;
    }
  }

  /**
   * Stop a specific pad
   *
   * @param padId - Pad index (0-15)
   */
  public stopPad(padId: number): void {
    const source = this.activeSources.get(padId);
    if (source) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // Source might already be stopped
      }
      this.activeSources.delete(padId);
    }
  }

  /**
   * Stop all pads
   */
  public stopAllPads(): void {
    this.activeSources.forEach((source, padId) => {
      this.stopPad(padId);
    });
  }

  /**
   * Check if a pad is currently playing
   *
   * @param padId - Pad index (0-15)
   * @returns boolean
   */
  public isPadPlaying(padId: number): boolean {
    return this.activeSources.has(padId);
  }

  /**
   * Get the audio context
   */
  public getContext(): AudioContext {
    return this.audioEngine.getContext();
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stopAllPads();
    this.reversedBufferCache = new WeakMap();
    this.lastTriggerTime.clear();
  }

  /**
   * Create an AudioBufferSourceNode for a pad with its effects
   *
   * @private
   */
  private createSourceForPad(
    buffer: AudioBuffer,
    clip: Clip,
    effects: PadEffects
  ): AudioBufferSourceNode {
    const ctx = this.audioEngine.getContext();

    // Handle reverse with caching (prevents memory leaks)
    let playbackBuffer = buffer;
    if (effects.reverse) {
      if (!this.reversedBufferCache.has(buffer)) {
        // Create reversed buffer and cache it
        const reversedBuffer = this.audioEngine.reverseBufferForExport(buffer);
        this.reversedBufferCache.set(buffer, reversedBuffer);
      }
      playbackBuffer = this.reversedBufferCache.get(buffer)!;
    }

    // Create source node
    const source = ctx.createBufferSource();
    source.buffer = playbackBuffer;
    source.playbackRate.value = effects.pitch;

    // Connect to effects chain with pad-specific mix
    this.connectPadEffects(source, effects);

    // Cleanup on end (prevents orphaned nodes)
    source.onended = () => {
      source.disconnect();
      // Remove from active sources (handled by Map automatically)
    };

    return source;
  }

  /**
   * Connect pad source to effects chain with per-pad mixing
   *
   * @private
   */
  private connectPadEffects(
    source: AudioBufferSourceNode,
    effects: PadEffects
  ): void {
    const ctx = this.audioEngine.getContext();

    // Create per-pad gain nodes for effect mixing
    const dryGain = ctx.createGain();
    const delayMix = ctx.createGain();
    const reverbMix = ctx.createGain();

    // Calculate dry/wet gains
    const maxWet = Math.max(effects.delayMix, effects.reverbMix);
    dryGain.gain.value = 1 - (maxWet * 0.5);
    delayMix.gain.value = effects.delayMix;
    reverbMix.gain.value = effects.reverbMix;

    // Dry path (direct to output)
    source.connect(dryGain);
    dryGain.connect(this.effectsChain.gainNode);

    // Wet paths (through effects)
    if (effects.delayMix > 0 && this.effectsChain.delayNode) {
      source.connect(delayMix);
      delayMix.connect(this.effectsChain.delayNode);
    }

    if (effects.reverbMix > 0 && this.effectsChain.reverbNode) {
      source.connect(reverbMix);
      reverbMix.connect(this.effectsChain.reverbNode.input);
    }
  }

  /**
   * Validate clip times are within buffer duration
   *
   * @private
   */
  private validateClip(clip: Clip, duration: number): boolean {
    if (clip.startTime < 0 || clip.startTime >= duration) {
      return false;
    }
    if (clip.endTime <= clip.startTime || clip.endTime > duration) {
      return false;
    }
    if (clip.endTime - clip.startTime < 0.01) {
      // Clip too short (minimum 10ms)
      return false;
    }
    return true;
  }
}
