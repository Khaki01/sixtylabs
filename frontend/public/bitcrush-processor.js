// Bitcrush AudioWorklet Processor
// In the AudioWorkletGlobalScope, 'AudioWorkletProcessor' and 'registerProcessor' are available globally.
// We do NOT use 'window' here as it is not available in the worklet scope.

const { AudioWorkletProcessor, registerProcessor } = globalThis;

class BitcrushProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "bitDepth",
        defaultValue: 8,
        minValue: 1,
        maxValue: 16,
      },
      {
        name: "sampleRate",
        defaultValue: 0.5,
        minValue: 0.01,
        maxValue: 1,
      },
    ];
  }

  constructor() {
    super();
    this.phase = 0;
    this.lastSample = [];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input.length) {
      return true;
    }

    const bitDepth = parameters.bitDepth;
    const sampleRateReduction = parameters.sampleRate;

    for (let channel = 0; channel < input.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      if (!outputChannel) continue;

      // Initialize lastSample for this channel if needed
      if (this.lastSample[channel] === undefined) {
        this.lastSample[channel] = 0;
      }

      for (let i = 0; i < inputChannel.length; i++) {
        const currentBitDepth = bitDepth.length > 1 ? bitDepth[i] : bitDepth[0];
        const currentSampleRate =
          sampleRateReduction.length > 1
            ? sampleRateReduction[i]
            : sampleRateReduction[0];

        // Sample rate reduction
        this.phase += currentSampleRate;

        if (this.phase >= 1.0) {
          this.phase -= 1.0;

          // Bit depth reduction
          const step = Math.pow(2, currentBitDepth);
          this.lastSample[channel] = Math.round(inputChannel[i] * step) / step;
        }

        outputChannel[i] = this.lastSample[channel];
      }
    }

    return true;
  }
}

registerProcessor("bitcrush-processor", BitcrushProcessor);
