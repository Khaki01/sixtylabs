import type { EffectsState } from "@/types/audio";

/**
 * EffectsChain manages all audio effect nodes and their routing.
 * It handles the creation, connection, and parameter updates of effects.
 */
export class EffectsChain {
  private ctx: AudioContext;
  private destination: AudioDestinationNode;

  // Main gain node
  public gainNode: GainNode;

  // Delay effect nodes
  public delayNode: DelayNode | null = null;
  public delayFeedbackGain: GainNode | null = null;
  public delayWetGain: GainNode | null = null;

  // Reverb effect nodes (convolution-based)
  public reverbNode: {
    input: GainNode;
    output: GainNode;
    convolver: ConvolverNode;
    filter: BiquadFilterNode;
  } | null = null;
  public reverbWetGain: GainNode;

  // Convolver effect nodes
  public convolverNode: ConvolverNode;
  public convolverWetGain: GainNode;

  // Tremolo effect nodes
  public tremoloNode: {
    lfo: OscillatorNode;
    depth: GainNode;
    amplitude: GainNode;
  } | null = null;
  public tremoloWetGain: GainNode;

  // EQ effect nodes
  public eqNode: {
    lowLP: BiquadFilterNode[];
    midLP: BiquadFilterNode[];
    midHP: BiquadFilterNode[];
    highHP: BiquadFilterNode[];
    lowGain: GainNode;
    midGain: GainNode;
    highGain: GainNode;
    output: GainNode;
  } | null = null;
  public eqWetGain: GainNode;

  // Bitcrush effect nodes
  public bitcrushProcessor: AudioWorkletNode | null = null;
  public bitcrushWetGain: GainNode;

  // Radio effect nodes
  public radioProcessor: AudioWorkletNode | null = null;
  public radioWetGain: GainNode;

  // Drunk effect nodes
  public drunkProcessor: AudioWorkletNode | null = null;
  public drunkWetGain: GainNode;

  // Granular effect nodes
  public granularGain: GainNode;

  // Worklet loaded flags
  public workletLoaded = false;
  public radioWorkletLoaded = false;
  public drunkWorkletLoaded = false;

  constructor(audioContext: AudioContext) {
    this.ctx = audioContext;
    this.destination = audioContext.destination;

    // Create main gain node
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.destination);

    // Create granular gain
    this.granularGain = this.ctx.createGain();
    this.granularGain.connect(this.gainNode);

    // Create convolver
    this.convolverNode = this.ctx.createConvolver();
    this.convolverNode.buffer = this.createImpulseResponse(15, 2.5);
    this.convolverWetGain = this.ctx.createGain();
    this.convolverWetGain.gain.value = 0.5;
    this.convolverNode.connect(this.convolverWetGain);
    this.convolverWetGain.connect(this.destination);

    // Create reverb
    this.reverbNode = this.createReverb(0.5, 0.5);
    this.reverbWetGain = this.ctx.createGain();
    this.reverbWetGain.gain.value = 0.5;
    this.reverbNode.output.connect(this.reverbWetGain);
    this.reverbWetGain.connect(this.destination);

    // Create tremolo
    this.tremoloNode = this.createTremolo(5, 0.5);
    this.tremoloWetGain = this.ctx.createGain();
    this.tremoloWetGain.gain.value = 0.5;
    this.tremoloNode.amplitude.connect(this.tremoloWetGain);
    this.tremoloWetGain.connect(this.destination);

    // Create EQ
    this.eqNode = this.createEQ(1, 1, 1);
    this.eqWetGain = this.ctx.createGain();
    this.eqWetGain.gain.value = 1.0;
    this.eqNode.output.connect(this.eqWetGain);
    this.eqWetGain.connect(this.destination);

    // Load worklets
    this.loadWorklets();

    // Initialize other wet gains (will be created on demand)
    this.bitcrushWetGain = this.ctx.createGain();
    this.radioWetGain = this.ctx.createGain();
    this.drunkWetGain = this.ctx.createGain();
  }

  private async loadWorklets() {
    try {
      // Load bitcrush worklet
      await this.ctx.audioWorklet.addModule("/bitcrush-processor.js");

      // Check if context is still running before creating nodes
      if (this.ctx.state === "closed") return;

      this.workletLoaded = true;
      this.bitcrushProcessor = new AudioWorkletNode(
        this.ctx,
        "bitcrush-processor"
      );
      this.bitcrushWetGain.gain.value = 0.5;
      this.bitcrushProcessor.connect(this.bitcrushWetGain);
      this.bitcrushWetGain.connect(this.destination);
    } catch (error) {
      console.error("Error loading bitcrush worklet:", error);
    }

    try {
      // Load radio worklet
      await this.ctx.audioWorklet.addModule("/radio-processor.js");

      // Check if context is still running before creating nodes
      if (this.ctx.state === "closed") return;

      this.radioWorkletLoaded = true;
      this.radioProcessor = new AudioWorkletNode(this.ctx, "radio-processor");
      this.radioWetGain.gain.value = 0.5;
      this.radioProcessor.connect(this.radioWetGain);
      this.radioWetGain.connect(this.destination);
    } catch (error) {
      console.error("Error loading radio worklet:", error);
    }

    try {
      // Load drunk worklet
      await this.ctx.audioWorklet.addModule("/drunk-processor.js");

      // Check if context is still running before creating nodes
      if (this.ctx.state === "closed") return;

      this.drunkWorkletLoaded = true;
      this.drunkProcessor = new AudioWorkletNode(this.ctx, "drunk-processor");
      this.drunkWetGain.gain.value = 0.5;
      this.drunkProcessor.connect(this.drunkWetGain);
      this.drunkWetGain.connect(this.destination);
    } catch (error) {
      console.error("Error loading drunk worklet:", error);
    }
  }

  /**
   * Update effect parameters
   */
  public updateEffects(effects: EffectsState) {
    const currentTime = this.ctx.currentTime;

    // Update volume
    this.gainNode.gain.setTargetAtTime(effects.volume, currentTime, 0.01);

    // Update granular mix
    this.granularGain.gain.setTargetAtTime(
      effects.granularMix,
      currentTime,
      0.01
    );

    // Update reverb (convolution-based - only wet mix can be updated in real-time)
    // Room size and decay require regenerating the impulse response (handled by recreateReverb)
    if (this.reverbNode) {
      this.reverbWetGain.gain.setTargetAtTime(
        effects.reverbMix,
        currentTime,
        0.01
      );
    }

    // Update convolver
    this.convolverWetGain.gain.setTargetAtTime(
      effects.convolverMix,
      currentTime,
      0.01
    );

    // Update tremolo
    if (this.tremoloNode) {
      this.tremoloWetGain.gain.setTargetAtTime(
        effects.tremoloMix,
        currentTime,
        0.01
      );
      this.tremoloNode.lfo.frequency.setTargetAtTime(
        effects.tremoloRate,
        currentTime,
        0.01
      );
      this.tremoloNode.depth.gain.setTargetAtTime(
        effects.tremoloDepth,
        currentTime,
        0.01
      );
    }

    // Update EQ
    if (this.eqNode) {
      this.eqWetGain.gain.setTargetAtTime(effects.eqMix, currentTime, 0.01);
      this.eqNode.lowGain.gain.setTargetAtTime(
        effects.eqLowGain,
        currentTime,
        0.01
      );
      this.eqNode.midGain.gain.setTargetAtTime(
        effects.eqMidGain,
        currentTime,
        0.01
      );
      this.eqNode.highGain.gain.setTargetAtTime(
        effects.eqHighGain,
        currentTime,
        0.01
      );
    }

    // Update bitcrush
    if (this.bitcrushProcessor && this.workletLoaded) {
      this.bitcrushWetGain.gain.setTargetAtTime(
        effects.bitcrushMix,
        currentTime,
        0.01
      );
      this.bitcrushProcessor.parameters
        .get("bitDepth")
        ?.setValueAtTime(effects.bitcrushBitDepth, currentTime);
      this.bitcrushProcessor.parameters
        .get("sampleRate")
        ?.setValueAtTime(effects.bitcrushSampleRate, currentTime);
    }

    // Update radio
    if (this.radioProcessor && this.radioWorkletLoaded) {
      this.radioWetGain.gain.setTargetAtTime(
        effects.radioMix,
        currentTime,
        0.01
      );
      this.radioProcessor.parameters
        .get("distortion")
        ?.setValueAtTime(effects.radioDistortion, currentTime);
      this.radioProcessor.parameters
        .get("static")
        ?.setValueAtTime(effects.radioStatic, currentTime);
    }

    // Update drunk
    if (this.drunkProcessor && this.drunkWorkletLoaded) {
      this.drunkWetGain.gain.setTargetAtTime(
        effects.drunkMix,
        currentTime,
        0.01
      );
      this.drunkProcessor.parameters
        .get("wobble")
        ?.setValueAtTime(effects.drunkWobble, currentTime);
      this.drunkProcessor.parameters
        .get("speed")
        ?.setValueAtTime(effects.drunkSpeed, currentTime);
    }

    // Update delay
    if (this.delayNode && this.delayFeedbackGain && this.delayWetGain) {
      const currentDelayTime = this.delayNode.delayTime.value;
      const newDelayTime = effects.delayTime;

      // If delay time is changing, briefly mute to hide the discontinuity
      if (Math.abs(currentDelayTime - newDelayTime) > 0.001) {
        // Quick fade out
        this.delayWetGain.gain.setTargetAtTime(0, currentTime, 0.01);
        // Change delay time after fade out
        this.delayNode.delayTime.setValueAtTime(newDelayTime, currentTime + 0.03);
        // Fade back in to target mix
        this.delayWetGain.gain.setTargetAtTime(effects.delayMix, currentTime + 0.05, 0.02);
      } else {
        // No delay time change, just update mix normally
        this.delayWetGain.gain.setTargetAtTime(effects.delayMix, currentTime, 0.01);
      }

      this.delayFeedbackGain.gain.setTargetAtTime(
        effects.delayFeedback,
        currentTime,
        0.01
      );
    }
  }

  /**
   * Create delay effect for playback
   */
  public createDelayForPlayback(
    delayTime: number,
    feedback: number,
    mix: number
  ): { delay: DelayNode; feedbackGain: GainNode; wetGain: GainNode } {
    // Clean up old delay nodes if they exist
    if (this.delayNode) {
      this.delayNode.disconnect();
      this.delayNode = null;
    }
    if (this.delayFeedbackGain) {
      this.delayFeedbackGain.disconnect();
      this.delayFeedbackGain = null;
    }
    if (this.delayWetGain) {
      this.delayWetGain.disconnect();
      this.delayWetGain = null;
    }

    const delay = this.ctx.createDelay(2);
    const feedbackGain = this.ctx.createGain();
    const wetGain = this.ctx.createGain();

    delay.delayTime.value = delayTime;
    feedbackGain.gain.value = feedback;
    wetGain.gain.value = mix;

    delay.connect(feedbackGain);
    feedbackGain.connect(delay);
    delay.connect(wetGain);

    // Store references for real-time updates
    this.delayNode = delay;
    this.delayFeedbackGain = feedbackGain;
    this.delayWetGain = wetGain;

    return { delay, feedbackGain, wetGain };
  }

  /**
   * Recreate reverb with new parameters (room size and decay)
   * Must be called when those parameters change since convolution reverb
   * requires regenerating the impulse response
   */
  public recreateReverb(roomSize: number, decay: number) {
    // Disconnect old reverb if exists
    if (this.reverbNode) {
      this.reverbNode.input.disconnect();
      this.reverbNode.output.disconnect();
      this.reverbNode.convolver.disconnect();
      this.reverbNode.filter.disconnect();
    }

    // Create new reverb with updated parameters
    this.reverbNode = this.createReverb(roomSize, decay);

    // Reconnect to wet gain
    this.reverbNode.output.connect(this.reverbWetGain);
  }

  /**
   * Create reverb effect (convolution-based)
   * Uses a generated impulse response with white noise and exponential decay
   */
  private createReverb(roomSize: number, decay: number) {
    const convolver = this.ctx.createConvolver();

    // Calculate duration based on room size (approx 1s to 4s)
    const duration = 1 + roomSize * 3;
    // decay 1 -> factor 1 (slow fade), decay 0 -> factor 5 (fast fade)
    const decayFactor = 1 + (1 - decay) * 4;

    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      // Create a smooth exponential decay curve
      const n = i / length;
      // Apply a slight fade-in (0.01s) to avoid clicks, then exponential decay
      const fadeIn = i < rate * 0.01 ? i / (rate * 0.01) : 1;
      const volume = fadeIn * Math.pow(1 - n, decayFactor);

      // Generate white noise
      left[i] = (Math.random() * 2 - 1) * volume;
      right[i] = (Math.random() * 2 - 1) * volume;
    }

    convolver.buffer = impulse;

    const input = this.ctx.createGain();
    const output = this.ctx.createGain();

    // Add a low-pass filter to simulate air absorption in a hall (warmer, "soft" sound)
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 5000; // Cut harsh high frequencies

    input.connect(convolver);
    convolver.connect(filter);
    filter.connect(output);

    return { input, output, convolver, filter };
  }

  /**
   * Create impulse response for convolver
   */
  private createImpulseResponse(duration: number, decay: number): AudioBuffer {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    let lastOutL = 0;
    let lastOutR = 0;
    const filterCoef = 0.05;

    for (let i = 0; i < length; i++) {
      const rawNoiseL = Math.random() * 2 - 1;
      const rawNoiseR = Math.random() * 2 - 1;

      lastOutL = lastOutL + (rawNoiseL - lastOutL) * filterCoef;
      lastOutR = lastOutR + (rawNoiseR - lastOutR) * filterCoef;

      const fadeInDuration = sampleRate * 2.5;
      const fadeIn = i < fadeInDuration ? Math.pow(i / fadeInDuration, 2) : 1;
      const envelope = Math.pow(1 - i / length, decay) * fadeIn;

      left[i] = lastOutL * envelope;
      right[i] = lastOutR * envelope;
    }

    return impulse;
  }

  /**
   * Create tremolo effect
   */
  private createTremolo(rate: number, depth: number) {
    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = rate;

    const depthGain = this.ctx.createGain();
    depthGain.gain.value = depth;

    const amplitude = this.ctx.createGain();
    amplitude.gain.value = 1.0 - depth * 0.5;

    lfo.connect(depthGain);
    depthGain.connect(amplitude.gain);
    lfo.start();

    return { lfo, depth: depthGain, amplitude };
  }

  /**
   * Create EQ effect
   */
  private createEQ(lowGain: number, midGain: number, highGain: number) {
    const LOW_CROSSOVER = 200;
    const HIGH_CROSSOVER = 3000;
    const FILTER_ORDER = 4;

    const createCascadedFilters = (
      type: BiquadFilterType,
      frequency: number,
      count: number
    ) => {
      const filters: BiquadFilterNode[] = [];
      for (let i = 0; i < count; i++) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = type;
        filter.frequency.value = frequency;
        filter.Q.value = 0.707;
        filters.push(filter);
      }
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      return filters;
    };

    const lowLP = createCascadedFilters("lowpass", LOW_CROSSOVER, FILTER_ORDER);
    const midHP = createCascadedFilters(
      "highpass",
      LOW_CROSSOVER,
      FILTER_ORDER
    );
    const midLP = createCascadedFilters(
      "lowpass",
      HIGH_CROSSOVER,
      FILTER_ORDER
    );
    const highHP = createCascadedFilters(
      "highpass",
      HIGH_CROSSOVER,
      FILTER_ORDER
    );

    const lowGainNode = this.ctx.createGain();
    lowGainNode.gain.value = lowGain;

    const midGainNode = this.ctx.createGain();
    midGainNode.gain.value = midGain;

    const highGainNode = this.ctx.createGain();
    highGainNode.gain.value = highGain;

    const output = this.ctx.createGain();

    lowLP[lowLP.length - 1].connect(lowGainNode);
    lowGainNode.connect(output);

    midHP[midHP.length - 1].connect(midLP[0]);
    midLP[midLP.length - 1].connect(midGainNode);
    midGainNode.connect(output);

    highHP[highHP.length - 1].connect(highGainNode);
    highGainNode.connect(output);

    return {
      lowLP,
      midLP,
      midHP,
      highHP,
      lowGain: lowGainNode,
      midGain: midGainNode,
      highGain: highGainNode,
      output,
    };
  }

  /**
   * Cleanup and disconnect all nodes
   */
  public dispose() {
    this.gainNode.disconnect();
    this.granularGain.disconnect();
    this.convolverNode?.disconnect();
    this.convolverWetGain.disconnect();
    if (this.reverbNode) {
      this.reverbNode.input.disconnect();
      this.reverbNode.output.disconnect();
      this.reverbNode.convolver.disconnect();
      this.reverbNode.filter.disconnect();
    }
    this.reverbWetGain.disconnect();
    this.tremoloNode?.lfo.stop();
    this.tremoloNode?.amplitude.disconnect();
    this.tremoloWetGain.disconnect();
    this.eqNode?.output.disconnect();
    this.eqWetGain.disconnect();
    this.bitcrushProcessor?.disconnect();
    this.bitcrushWetGain.disconnect();
    this.radioProcessor?.disconnect();
    this.radioWetGain.disconnect();
    this.drunkProcessor?.disconnect();
    this.drunkWetGain.disconnect();
    this.delayNode?.disconnect();
    this.delayFeedbackGain?.disconnect();
    this.delayWetGain?.disconnect();
  }
}
