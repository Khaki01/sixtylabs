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
  private currentStepIndex: number; // Index in the sequence array
  private isPlaying: boolean;
  private timeoutId: NodeJS.Timeout | null;
  private stepCallback: (step: number) => void;
  private sequence: number[]; // Array of pad indices to play
  private nextStepDelay: number | null; // Custom delay for next step (ms)
  private readonly STEPS_PER_BEAT = 4; // 16th notes (4 steps per quarter note)

  constructor(initialBPM: number = 120) {
    this.bpm = initialBPM;
    this.currentStepIndex = 0;
    this.isPlaying = false;
    this.timeoutId = null;
    this.stepCallback = () => {};
    this.sequence = []; // Empty by default
    this.nextStepDelay = null;
  }

  /**
   * Set the callback to be called on each step
   *
   * @param callback - Function called with pad index
   */
  public onStep(callback: (step: number) => void): void {
    this.stepCallback = callback;
  }

  /**
   * Set the sequence of pad indices to play
   *
   * @param sequence - Array of pad indices (e.g., [0, 3, 5, 7] for pads with clips)
   */
  public setSequence(sequence: number[]): void {
    this.sequence = sequence;
    this.currentStepIndex = 0;
  }

  /**
   * Set custom delay for the next step (used to wait for clip to finish)
   *
   * @param delayMs - Delay in milliseconds
   */
  public setNextStepDelay(delayMs: number): void {
    this.nextStepDelay = delayMs;
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
    this.currentStepIndex = 0;
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
   * Get current pad index being played
   */
  public getCurrentStep(): number {
    if (this.sequence.length === 0) return 0;
    return this.sequence[this.currentStepIndex];
  }

  /**
   * Check if sequencer is playing
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Manually set current step index (useful for UI scrubbing)
   *
   * @param stepIndex - Index in the sequence array
   */
  public setStepIndex(stepIndex: number): void {
    if (this.sequence.length === 0) return;
    this.currentStepIndex = Math.max(0, Math.min(this.sequence.length - 1, stepIndex));
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
    if (!this.isPlaying || this.sequence.length === 0) {
      return;
    }

    // Get current pad index from sequence
    const currentPadIndex = this.sequence[this.currentStepIndex];

    // Call the step callback with the pad index
    this.stepCallback(currentPadIndex);

    // Advance to next step in sequence
    this.currentStepIndex = (this.currentStepIndex + 1) % this.sequence.length;

    // Use custom delay if set, otherwise use BPM-based timing
    const stepDuration = this.nextStepDelay !== null
      ? this.nextStepDelay
      : this.calculateStepDuration();

    // Clear custom delay for next iteration
    this.nextStepDelay = null;

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
