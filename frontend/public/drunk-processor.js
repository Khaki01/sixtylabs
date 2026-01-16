// Drunk Effect AudioWorklet Processor
// Creates random pitch/time warping using allpass interpolation and smooth modulation
const { AudioWorkletProcessor, registerProcessor } = globalThis

class DrunkProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "wobble",
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
      },
      {
        name: "speed",
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
      },
    ]
  }

  constructor() {
    super()
    this.bufferSize = 88200
    this.buffer = []
    this.writeIndex = 0

    // Multiple LFOs with different frequencies for complex wobble
    this.lfo1Phase = 0
    this.lfo2Phase = Math.random() * Math.PI * 2
    this.lfo3Phase = Math.random() * Math.PI * 2
    this.lfo4Phase = Math.random() * Math.PI * 2

    // Random drift values that slowly change
    this.drift1 = 0
    this.drift2 = 0
    this.driftTarget1 = (Math.random() - 0.5) * 2
    this.driftTarget2 = (Math.random() - 0.5) * 2
    this.driftCounter = 0

    this.currentDelay = 2000
    this.delayVelocity = 0 // For smooth acceleration/deceleration

    this.allpassState = [0, 0]

    this.dcState = [
      { x1: 0, y1: 0 },
      { x1: 0, y1: 0 },
    ]

    // Initialize buffer for each channel
    for (let ch = 0; ch < 2; ch++) {
      this.buffer[ch] = new Float32Array(this.bufferSize)
    }
  }

  allpassInterpolate(channel, frac, s0, s1) {
    // Thiran allpass coefficient
    const a = (1 - frac) / (1 + frac)
    const output = a * s1 + s0 - a * this.allpassState[channel]
    this.allpassState[channel] = output
    return output
  }

  readSample(channel, position) {
    const bufSize = this.bufferSize
    // Ensure positive modulo
    let readIndex = position % bufSize
    if (readIndex < 0) readIndex += bufSize

    const idx0 = Math.floor(readIndex)
    const idx1 = (idx0 + 1) % bufSize
    const frac = readIndex - idx0

    const s0 = this.buffer[channel][idx0]
    const s1 = this.buffer[channel][idx1]

    // Use allpass interpolation for smooth modulated delay
    return this.allpassInterpolate(channel, frac, s0, s1)
  }

  dcBlock(channel, sample) {
    const R = 0.995
    const state = this.dcState[channel]
    const y = sample - state.x1 + R * state.y1
    state.x1 = sample
    state.y1 = y
    return y
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]

    if (!input || !input.length || !input[0]) {
      return true
    }

    const wobble = parameters.wobble
    const speed = parameters.speed

    const blockSize = input[0].length

    // Update random drift slowly
    this.driftCounter++
    if (this.driftCounter > 8000) {
      this.driftCounter = 0
      this.driftTarget1 = (Math.random() - 0.5) * 2
      this.driftTarget2 = (Math.random() - 0.5) * 2
    }
    this.drift1 += (this.driftTarget1 - this.drift1) * 0.00005
    this.drift2 += (this.driftTarget2 - this.drift2) * 0.00005

    for (let i = 0; i < blockSize; i++) {
      const currentWobble = wobble.length > 1 ? wobble[i] : wobble[0]
      const currentSpeed = speed.length > 1 ? speed[i] : speed[0]

      const baseFreq = currentSpeed * 4.0
      const lfo1 = Math.sin(this.lfo1Phase) * (0.5 + this.drift1 * 0.3)
      const lfo2 = Math.sin(this.lfo2Phase) * 0.4
      const lfo3 = Math.sin(this.lfo3Phase) * 0.7
      const lfo4 = Math.sin(this.lfo4Phase) * 0.3 * this.drift2

      // Combine LFOs for complex wobble pattern
      const combinedWobble = (lfo1 + lfo2 + lfo3 + lfo4) / 2.0

      const baseDelay = 2000
      const maxWobbleDelay = 1500 * currentWobble
      const targetDelay = baseDelay + combinedWobble * maxWobbleDelay

      // This prevents sudden jumps that cause clicks
      const maxAccel = 0.5 // Max samples/sample^2 acceleration
      const damping = 0.98

      const delayError = targetDelay - this.currentDelay
      let accel = delayError * 0.001

      // Clamp acceleration
      if (accel > maxAccel) accel = maxAccel
      if (accel < -maxAccel) accel = -maxAccel

      this.delayVelocity = this.delayVelocity * damping + accel

      const maxVelocity = 2.0
      if (this.delayVelocity > maxVelocity) this.delayVelocity = maxVelocity
      if (this.delayVelocity < -maxVelocity) this.delayVelocity = -maxVelocity

      this.currentDelay += this.delayVelocity

      // Clamp delay to safe range
      if (this.currentDelay < 100) this.currentDelay = 100
      if (this.currentDelay > this.bufferSize - 100) this.currentDelay = this.bufferSize - 100

      for (let channel = 0; channel < Math.min(input.length, output.length); channel++) {
        const inputChannel = input[channel]
        const outputChannel = output[channel]

        if (!inputChannel || !outputChannel) continue

        // Write input to circular buffer
        this.buffer[channel][this.writeIndex % this.bufferSize] = inputChannel[i]

        // Read from delay line with current (smoothed) delay
        const readPos = this.writeIndex - this.currentDelay
        let outputSample = this.readSample(channel, readPos)

        outputSample = this.dcBlock(channel, outputSample)

        outputChannel[i] = outputSample
      }

      // Update LFO phases (fast rates for wobbly sound)
      this.lfo1Phase += baseFreq * 0.00018
      this.lfo2Phase += baseFreq * 0.00028
      this.lfo3Phase += baseFreq * 0.00019
      this.lfo4Phase += baseFreq * 0.00035

      // Wrap phases
      if (this.lfo1Phase > Math.PI * 2) this.lfo1Phase -= Math.PI * 2
      if (this.lfo2Phase > Math.PI * 2) this.lfo2Phase -= Math.PI * 2
      if (this.lfo3Phase > Math.PI * 2) this.lfo3Phase -= Math.PI * 2
      if (this.lfo4Phase > Math.PI * 2) this.lfo4Phase -= Math.PI * 2

      this.writeIndex++
    }

    return true
  }
}

registerProcessor("drunk-processor", DrunkProcessor)
