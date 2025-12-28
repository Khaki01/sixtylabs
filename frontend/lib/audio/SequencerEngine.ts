/**
 * SequencerEngine - Handles auto-sequencing through sampler pads
 *
 * Key Features:
 * - BPM-based step timing using setTimeout
 * - Proper cleanup (no race conditions)
 * - Callback-based architecture (triggers pad via parent handler)
 * - 16-step sequencer (matches 16 pads)
 *
 * Bug Prevention:
 * - Single timeout reference with proper cleanup
 * - No orphaned timers (cleared on stop)
 * - No duplicate scheduling (checks isPlaying)
 */
export class SequencerEngine {
  private bpm: number;
  private currentStep: number;
  private isPlaying: boolean;
  private timeoutId: NodeJS.Timeout | null;
  private stepCallback: (step: number) => void;
  private readonly STEPS_PER_BEAT = 4; // 16th notes (4 steps per quarter note)

  constructor(initialBPM: number = 120) {
    this.bpm = initialBPM;
    this.currentStep = 0;
    this.isPlaying = false;
    this.timeoutId = null;
    this.stepCallback = () => {};
  }

  /**
   * Set the callback to be called on each step
   *
   * @param callback - Function called with step number (0-15)
   */
  public onStep(callback: (step: number) => void): void {
    this.stepCallback = callback;
  }

  /**
   * Start the sequencer from current step
   */
  public start(): void {
    if (this.isPlaying) {
      return; // Already playing
    }

    this.isPlaying = true;
    this.scheduleNextStep();
  }

  /**
   * Pause the sequencer (maintains current step)
   */
  public pause(): void {
    this.isPlaying = false;
    this.clearTimeout();
  }

  /**
   * Stop the sequencer (resets to step 0)
   */
  public stop(): void {
    this.isPlaying = false;
    this.clearTimeout();
    this.currentStep = 0;
  }

  /**
   * Set BPM (updates immediately, even while playing)
   *
   * @param bpm - Beats per minute (60-240)
   */
  public setBPM(bpm: number): void {
    this.bpm = Math.max(60, Math.min(240, bpm));

    // If playing, restart timing with new BPM
    if (this.isPlaying) {
      this.clearTimeout();
      this.scheduleNextStep();
    }
  }

  /**
   * Get current BPM
   */
  public getBPM(): number {
    return this.bpm;
  }

  /**
   * Get current step (0-15)
   */
  public getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Check if sequencer is playing
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Manually set current step (useful for UI scrubbing)
   *
   * @param step - Step number (0-15)
   */
  public setStep(step: number): void {
    this.currentStep = Math.max(0, Math.min(15, step));
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stop();
    this.stepCallback = () => {};
  }

  /**
   * Schedule the next step using setTimeout
   *
   * @private
   */
  private scheduleNextStep(): void {
    if (!this.isPlaying) {
      return;
    }

    // Call the step callback
    this.stepCallback(this.currentStep);

    // Advance to next step
    this.currentStep = (this.currentStep + 1) % 16;

    // Calculate delay for next step
    const stepDuration = this.calculateStepDuration();

    // Schedule next step
    this.timeoutId = setTimeout(() => {
      this.scheduleNextStep();
    }, stepDuration);
  }

  /**
   * Calculate duration of one step in milliseconds
   *
   * @private
   * @returns Step duration in ms
   */
  private calculateStepDuration(): number {
    // BPM = quarter notes per minute
    // We want 16th notes (4 steps per quarter note)
    const quarterNoteDuration = 60000 / this.bpm; // ms per beat
    const sixteenthNoteDuration = quarterNoteDuration / this.STEPS_PER_BEAT;
    return sixteenthNoteDuration;
  }

  /**
   * Clear the current timeout
   *
   * @private
   */
  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
