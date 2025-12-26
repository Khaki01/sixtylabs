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

  // Reverb effect nodes
  public reverbNode: {
    input: GainNode;
    output: GainNode;
    delays: DelayNode[];
    gains: GainNode[];
    filters: BiquadFilterNode[];
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

    // Update reverb
    if (this.reverbNode) {
      this.reverbWetGain.gain.setTargetAtTime(
        effects.reverbMix,
        currentTime,
        0.01
      );
      const baseTimes = [
        0.0297, 0.0371, 0.0411, 0.0437, 0.0521, 0.0617, 0.0719, 0.0823,
      ];
      this.reverbNode.delays.forEach((delay, i) => {
        delay.delayTime.setTargetAtTime(
          baseTimes[i] * (1 + effects.reverbRoomSize * 3),
          currentTime,
          0.1
        );
        this.reverbNode!.gains[i].gain.setTargetAtTime(
          effects.reverbDecay * 0.65,
          currentTime,
          0.1
        );
        this.reverbNode!.filters[i].frequency.setTargetAtTime(
          3000 - effects.reverbDecay * 1500,
          currentTime,
          0.1
        );
      });
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
  }

  /**
   * Create delay effect for playback
   */
  public createDelayForPlayback(
    delayTime: number,
    feedback: number,
    mix: number
  ): { delay: DelayNode; feedbackGain: GainNode; wetGain: GainNode } {
    const delay = this.ctx.createDelay(2);
    const feedbackGain = this.ctx.createGain();
    const wetGain = this.ctx.createGain();

    delay.delayTime.value = delayTime;
    feedbackGain.gain.value = feedback;
    wetGain.gain.value = mix;

    delay.connect(feedbackGain);
    feedbackGain.connect(delay);
    delay.connect(wetGain);

    return { delay, feedbackGain, wetGain };
  }

  /**
   * Create reverb effect
   */
  private createReverb(roomSize: number, decay: number) {
    const delays = Array.from({ length: 8 }, () => this.ctx.createDelay(5.0));
    const gains = Array.from({ length: 8 }, () => this.ctx.createGain());
    const filters = Array.from({ length: 8 }, () =>
      this.ctx.createBiquadFilter()
    );

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

    const input = this.ctx.createGain();
    const output = this.ctx.createGain();
    const diffusion = this.ctx.createGain();
    diffusion.gain.value = 0.7;

    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    const preCompressorGain = this.ctx.createGain();
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
    this.reverbNode?.output.disconnect();
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
  }
}
