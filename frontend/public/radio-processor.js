// Static Distortion AudioWorklet Processor
const { AudioWorkletProcessor, registerProcessor } = globalThis

class RadioProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "distortion",
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: "static",
        defaultValue: 0.3,
        minValue: 0,
        maxValue: 1,
      },
    ]
  }

  constructor() {
    super()
    this.phase = 0
    this.noisePhase = 0
    this.frameCount = 0
    this.lfoPhase = 0
    this.lfoRate = 0.1 + Math.random() * 0.3 // Random slow oscillation
    this.noiseColor = Math.random() // For pink noise simulation
    this.lastNoise = 0
    this.crackleTimer = 0
    this.crackleThreshold = Math.random() * 100
  }

  distort(sample, amount) {
    const gain = 1 + amount * 20
    return Math.tanh(sample * gain)
  }

  generateStatic() {
    // Pink noise approximation (smoother than white noise)
    const white = Math.random() * 2 - 1
    this.lastNoise = (this.lastNoise * 0.9 + white * 0.1) * 0.5

    // Random crackles and pops
    this.crackleTimer++
    if (this.crackleTimer > this.crackleThreshold) {
      this.crackleTimer = 0
      this.crackleThreshold = 50 + Math.random() * 100
      return (Math.random() * 2 - 1) * 2 // Sudden spike
    }

    return this.lastNoise
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]

    if (!input || !input.length || !input[0]) {
      return true
    }

    const distortion = parameters.distortion
    const staticAmount = parameters.static

    if (this.frameCount % 100 === 0) {
      this.port.postMessage({
        type: "debug",
        distortion: distortion[0],
        static: staticAmount[0],
        inputLength: input[0].length,
        hasOutput: !!output[0],
      })
    }
    this.frameCount++

    this.lfoPhase += this.lfoRate * 0.001
    if (this.lfoPhase > Math.PI * 2) {
      this.lfoPhase -= Math.PI * 2
      // Randomize LFO rate occasionally for variation
      this.lfoRate = 0.1 + Math.random() * 0.3
    }
    const lfoValue = Math.sin(this.lfoPhase) * 0.3 + 0.7 // 0.4 to 1.0 range

    for (let channel = 0; channel < Math.min(input.length, output.length); channel++) {
      const inputChannel = input[channel]
      const outputChannel = output[channel]

      if (!inputChannel || !outputChannel) continue

      for (let i = 0; i < inputChannel.length; i++) {
        const currentDistortion = distortion.length > 1 ? distortion[i] : distortion[0]
        const currentStatic = staticAmount.length > 1 ? staticAmount[i] : staticAmount[0]

        let sample = inputChannel[i]

        // Apply distortion
        sample = this.distort(sample, currentDistortion)

        const staticNoise = this.generateStatic() * currentStatic * lfoValue
        sample = sample * (1 - currentStatic * 0.5) + staticNoise

        // Final soft clipping
        sample = Math.tanh(sample * 1.2)

        outputChannel[i] = sample
      }
    }

    return true
  }
}

registerProcessor("radio-processor", RadioProcessor)
