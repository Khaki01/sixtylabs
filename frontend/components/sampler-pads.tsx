// "use client"

// import type React from "react"

// import { useState, useEffect, useRef } from "react"
// import { Button } from "@/components/ui/button"
// import { Play, Pause, RotateCcw, X } from "lucide-react"
// import type { Clip } from "./waveform-visualizer"

// const PAD_KEYS = ["1", "2", "3", "4", "Q", "W", "E", "R", "A", "S", "D", "F", "Z", "X", "C", "V"]

// const AVAILABLE_EFFECTS = [
//   { id: "delay", name: "Delay", number: "EE01" },
//   { id: "reverb", name: "Reverb", number: "EE02" },
// ]

// interface PadEffects {
//   pitch: number
//   reverse: boolean
//   delayTime: number // in seconds (0 to 1)
//   delayFeedback: number // 0 to 0.9 (how much delay repeats)
//   delayMix: number // 0 to 1 (wet/dry mix)
//   reverbRoomSize: number
//   reverbDecay: number
//   reverbMix: number
//   enabledEffects: string[] // Array of effect IDs like ['delay']
// }

// interface SamplerPadsProps {
//   audioBuffer: AudioBuffer | null
//   clips?: Clip[]
//   selectedClipId?: string | null
//   onClipSelect?: (clipId: string | null) => void
//   isPlaying?: boolean
//   onPlayStateChange?: (isPlaying: boolean) => void
// }

// export default function SamplerPads({ 
//   audioBuffer, 
//   clips = [],
//   selectedClipId,
//   onClipSelect,
//   isPlaying: externalIsPlaying,
//   onPlayStateChange
//  }: SamplerPadsProps) {
//   const [mode, setMode] = useState<"realtime" | "sequencer">("realtime")
//   const [isSequencerPlaying, setIsSequencerPlaying] = useState(false)
//   const [currentStep, setCurrentStep] = useState(0)
//   const [activePad, setActivePad] = useState<number | null>(null)
//   const [padAssignments, setPadAssignments] = useState<(number | null)[]>(Array(16).fill(null))
//   const [selectingForPad, setSelectingForPad] = useState<number | null>(null)
//   const [padEffects, setPadEffects] = useState<PadEffects[]>(
//     Array(16)
//       .fill(null)
//       .map(() => ({
//         pitch: 1.0,
//         reverse: false,
//         delayTime: 0.3,
//         delayFeedback: 0.3,
//         delayMix: 0,
//         reverbRoomSize: 0.5,
//         reverbDecay: 0.5,
//         reverbMix: 0,
//         enabledEffects: [],
//       })),
//   )

//   const audioContextRef = useRef<AudioContext | null>(null)
//   const sourceNodesRef = useRef<Map<number, AudioBufferSourceNode>>(new Map())
//   const gainNodeRef = useRef<GainNode | null>(null)
//   const sequencerTimeoutRef = useRef<NodeJS.Timeout | null>(null)
//   const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
//   const longPressTriggeredRef = useRef(false)

//   useEffect(() => {
//     audioContextRef.current = new AudioContext()
//     const ctx = audioContextRef.current

//     gainNodeRef.current = ctx.createGain()
//     gainNodeRef.current.gain.value = 0.8
//     gainNodeRef.current.connect(ctx.destination)

//     return () => {
//       // Cleanup: stop all playing sources
//       sourceNodesRef.current.forEach((source) => {
//         try {
//           source.stop()
//           source.disconnect()
//         } catch (e) {
//           // Source might already be stopped
//         }
//       })
//       sourceNodesRef.current.clear()

//       if (audioContextRef.current) {
//         audioContextRef.current.close()
//       }
//     }
//   }, [])

//   const playClip = (clipIndex: number, padIndex: number) => {
//     if (!audioBuffer || !audioContextRef.current || !gainNodeRef.current) {
//       console.log("[v0] Cannot play clip: missing audio buffer or context")
//       return
//     }

//     const clip = clips[clipIndex]
//     if (!clip) {
//       console.log("[v0] Clip not found:", clipIndex)
//       return
//     }

//     const effects = padEffects[padIndex]

//     console.log(
//       "[v0] Playing clip",
//       clipIndex,
//       "on pad",
//       padIndex,
//       "from",
//       clip.startTime,
//       "to",
//       clip.endTime,
//       "with effects:",
//       effects,
//     )

//     if (mode === "realtime") {
//       sourceNodesRef.current.forEach((source) => {
//         try {
//           source.stop()
//           source.disconnect()
//         } catch (e) {
//           // Source might already be stopped
//         }
//       })
//       sourceNodesRef.current.clear()
//       setActivePad(null)
//     } else {
//       // In sequencer mode, only stop the existing source for this specific pad
//       const existingSource = sourceNodesRef.current.get(padIndex)
//       if (existingSource) {
//         try {
//           existingSource.stop()
//           existingSource.disconnect()
//         } catch (e) {
//           // Source might already be stopped
//         }
//         sourceNodesRef.current.delete(padIndex)
//       }
//     }

//     // Apply reverse effect to buffer if needed
//     let bufferToPlay = audioBuffer
//     if (effects.reverse) {
//       bufferToPlay = audioContextRef.current.createBuffer(
//         audioBuffer.numberOfChannels,
//         audioBuffer.length,
//         audioBuffer.sampleRate,
//       )
//       for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
//         const originalData = audioBuffer.getChannelData(channel)
//         const reversedData = bufferToPlay.getChannelData(channel)
//         for (let i = 0; i < audioBuffer.length; i++) {
//           reversedData[i] = originalData[audioBuffer.length - 1 - i]
//         }
//       }
//     }

//     const ctx = audioContextRef.current
//     const source = ctx.createBufferSource()
//     source.buffer = bufferToPlay
//     source.playbackRate.value = effects.pitch

//     // Create audio routing for delay effect
//     const dryGain = ctx.createGain()
//     const delayWetGain = ctx.createGain()
//     const reverbWetGain = ctx.createGain()
//     const delayNode = ctx.createDelay(5.0) // Max 5 seconds delay
//     const delayFeedbackGain = ctx.createGain()

//     // Set delay parameters
//     delayNode.delayTime.value = effects.delayTime
//     delayFeedbackGain.gain.value = effects.delayFeedback
//     delayWetGain.gain.value = effects.delayMix

//     const reverb = createReverb(ctx, effects.reverbRoomSize, effects.reverbDecay)
//     reverbWetGain.gain.value = effects.reverbMix

//     // Calculate dry gain (reduced by both delay and reverb mix)
//     dryGain.gain.value = 1 - Math.max(effects.delayMix, effects.reverbMix) * 0.5

//     // Connect the audio graph
//     // Dry signal (original)
//     source.connect(dryGain)
//     dryGain.connect(gainNodeRef.current)

//     // Wet signal (delayed)
//     if (effects.delayMix > 0) {
//       source.connect(delayNode)
//       delayNode.connect(delayWetGain)
//       delayWetGain.connect(gainNodeRef.current)
//       delayNode.connect(delayFeedbackGain)
//       delayFeedbackGain.connect(delayNode)
//     }

//     if (effects.reverbMix > 0) {
//       source.connect(reverb.input)
//       reverb.output.connect(reverbWetGain)
//       reverbWetGain.connect(gainNodeRef.current)
//     }

//     const duration = clip.endTime - clip.startTime
//     source.start(0, clip.startTime, duration)
//     sourceNodesRef.current.set(padIndex, source)
//     setActivePad(padIndex)

//     source.onended = () => {
//       sourceNodesRef.current.delete(padIndex)
//       setActivePad((current) => (current === padIndex ? null : current))
//     }
//   }

//   useEffect(() => {
//     setPadAssignments((prev) => {
//       const newAssignments = [...prev]
//       clips.forEach((_, index) => {
//         if (index < 16 && newAssignments[index] === null) {
//           newAssignments[index] = index
//         }
//       })
//       return newAssignments
//     })
//   }, [clips.length])

//   useEffect(() => {
//     if (mode !== "realtime") return

//     const handleKeyDown = (e: KeyboardEvent) => {
//       const key = e.key.toUpperCase()
//       const padIndex = PAD_KEYS.indexOf(key)

//       if (padIndex !== -1) {
//         const clipIndex = padAssignments[padIndex]
//         if (clipIndex !== null && clipIndex < clips.length) {
//           playClip(clipIndex, padIndex)
//         }
//       }
//     }

//     window.addEventListener("keydown", handleKeyDown)
//     return () => window.removeEventListener("keydown", handleKeyDown)
//   }, [mode, clips, padAssignments, audioBuffer])

//   useEffect(() => {
//     if (!isSequencerPlaying || mode !== "sequencer") {
//       // Clear any pending timeout when stopping
//       if (sequencerTimeoutRef.current) {
//         clearTimeout(sequencerTimeoutRef.current)
//         sequencerTimeoutRef.current = null
//       }
//       return
//     }

//     const playNextStep = () => {
//       setCurrentStep((prev) => {
//         const nextStep = (prev + 1) % 16
//         const clipIndex = padAssignments[nextStep]

//         let duration = 0.5 // Default duration if no clip assigned (500ms)

//         if (clipIndex !== null && clipIndex < clips.length) {
//           const clip = clips[clipIndex]
//           duration = clip.endTime - clip.startTime
//           playClip(clipIndex, nextStep)
//         } else {
//           // Visual feedback even if no clip assigned
//           setActivePad(nextStep)
//           setTimeout(() => setActivePad(null), 100)
//         }

//         // Schedule next step after current clip finishes
//         sequencerTimeoutRef.current = setTimeout(() => {
//           playNextStep()
//         }, duration * 1000) // Convert to milliseconds

//         return nextStep
//       })
//     }

//     // Start the sequence
//     playNextStep()

//     return () => {
//       if (sequencerTimeoutRef.current) {
//         clearTimeout(sequencerTimeoutRef.current)
//         sequencerTimeoutRef.current = null
//       }
//     }
//   }, [isSequencerPlaying, mode, clips, padAssignments, audioBuffer])

//   useEffect(() => {
//     if (!audioBuffer || !audioContextRef.current || !gainNodeRef.current) {
//       console.log("[v0] Cannot play clip: missing audio buffer or context")
//       return
//     }

//     const clip = clips[currentStep]
//     if (!clip) {
//       console.log("[v0] Clip not found:", currentStep)
//       return
//     }

//     console.log("[v0] Playing clip", currentStep, "from", clip.startTime, "to", clip.endTime)

//     // In sequencer mode, only stop the existing source for this specific pad
//     const existingSource = sourceNodesRef.current.get(currentStep)
//     if (existingSource) {
//       try {
//         existingSource.stop()
//         existingSource.disconnect()
//       } catch (e) {
//         // Source might already be stopped
//       }
//       sourceNodesRef.current.delete(currentStep)
//     }

//     // Apply reverse effect to buffer if needed
//     let bufferToPlay = audioBuffer
//     if (padEffects[currentStep].reverse) {
//       bufferToPlay = audioContextRef.current.createBuffer(
//         audioBuffer.numberOfChannels,
//         audioBuffer.length,
//         audioBuffer.sampleRate,
//       )
//       for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
//         const originalData = audioBuffer.getChannelData(channel)
//         const reversedData = bufferToPlay.getChannelData(channel)
//         for (let i = 0; i < audioBuffer.length; i++) {
//           reversedData[i] = originalData[audioBuffer.length - 1 - i]
//         }
//       }
//     }

//     const ctx = audioContextRef.current
//     const source = ctx.createBufferSource()
//     source.buffer = bufferToPlay
//     source.playbackRate.value = padEffects[currentStep].pitch

//     // Create audio routing for delay effect
//     const dryGain = ctx.createGain()
//     const delayWetGain = ctx.createGain()
//     const reverbWetGain = ctx.createGain()
//     const delayNode = ctx.createDelay(5.0) // Max 5 seconds delay
//     const delayFeedbackGain = ctx.createGain()

//     // Set delay parameters
//     delayNode.delayTime.value = padEffects[currentStep].delayTime
//     delayFeedbackGain.gain.value = padEffects[currentStep].delayFeedback
//     delayWetGain.gain.value = padEffects[currentStep].delayMix

//     const reverb = createReverb(ctx, padEffects[currentStep].reverbRoomSize, padEffects[currentStep].reverbDecay)
//     reverbWetGain.gain.value = padEffects[currentStep].reverbMix

//     // Calculate dry gain (reduced by both delay and reverb mix)
//     dryGain.gain.value = 1 - Math.max(padEffects[currentStep].delayMix, padEffects[currentStep].reverbMix) * 0.5

//     // Connect the audio graph
//     // Dry signal (original)
//     source.connect(dryGain)
//     dryGain.connect(gainNodeRef.current)

//     // Wet signal (delayed)
//     if (padEffects[currentStep].delayMix > 0) {
//       source.connect(delayNode)
//       delayNode.connect(delayWetGain)
//       delayWetGain.connect(gainNodeRef.current)
//       delayNode.connect(delayFeedbackGain)
//       delayFeedbackGain.connect(delayNode)
//     }

//     if (padEffects[currentStep].reverbMix > 0) {
//       source.connect(reverb.input)
//       reverb.output.connect(reverbWetGain)
//       reverbWetGain.connect(gainNodeRef.current)
//     }

//     const duration = clip.endTime - clip.startTime
//     source.start(0, clip.startTime, duration)
//     sourceNodesRef.current.set(currentStep, source)
//     setActivePad(currentStep)

//     source.onended = () => {
//       sourceNodesRef.current.delete(currentStep)
//       setActivePad(null)
//     }
//   }, [isSequencerPlaying, mode, clips, currentStep, audioBuffer])

//   const handlePadClick = (padIndex: number, event: React.MouseEvent) => {
//     if (event.shiftKey) {
//       setSelectingForPad(padIndex)
//       return
//     }

//     // If in realtime mode and pad has a clip, play it
//     if (mode === "realtime") {
//       const clipIndex = padAssignments[padIndex]
//       if (clipIndex !== null && clipIndex < clips.length) {
//         playClip(clipIndex, padIndex)
//       }
//     }
//   }

//   const handleTouchStart = (padIndex: number) => {
//     longPressTriggeredRef.current = false
//     longPressTimerRef.current = setTimeout(() => {
//       longPressTriggeredRef.current = true
//       setSelectingForPad(padIndex)
//       // Haptic feedback if available
//       if (navigator.vibrate) {
//         navigator.vibrate(50)
//       }
//     }, 500) // 500ms long press threshold
//   }

//   const handleTouchEnd = (padIndex: number, event: React.TouchEvent) => {
//     if (longPressTimerRef.current) {
//       clearTimeout(longPressTimerRef.current)
//       longPressTimerRef.current = null
//     }

//     // If long press was triggered, don't play the clip
//     if (longPressTriggeredRef.current) {
//       event.preventDefault()
//       return
//     }

//     // Otherwise, play the clip (normal tap)
//     if (mode === "realtime") {
//       const clipIndex = padAssignments[padIndex]
//       if (clipIndex !== null && clipIndex < clips.length) {
//         playClip(clipIndex, padIndex)
//       }
//     }
//   }

//   const handleTouchCancel = () => {
//     if (longPressTimerRef.current) {
//       clearTimeout(longPressTimerRef.current)
//       longPressTimerRef.current = null
//     }
//     longPressTriggeredRef.current = false
//   }

//   const assignClipToPad = (padIndex: number, clipIndex: number | null) => {
//     setPadAssignments((prev) => {
//       const newAssignments = [...prev]
//       newAssignments[padIndex] = clipIndex
//       return newAssignments
//     })
//     setSelectingForPad(null)
//   }

//   const updatePadEffects = (padIndex: number, newEffects: Partial<PadEffects>) => {
//     setPadEffects((prev) => {
//       const updated = [...prev]
//       updated[padIndex] = { ...updated[padIndex], ...newEffects }
//       return updated
//     })
//   }

//   const addEffectToPad = (padIndex: number, effectId: string) => {
//     setPadEffects((prev) => {
//       const updated = [...prev]
//       const currentEffects = updated[padIndex].enabledEffects
//       if (!currentEffects.includes(effectId)) {
//         updated[padIndex] = {
//           ...updated[padIndex],
//           enabledEffects: [...currentEffects, effectId],
//         }
//       }
//       return updated
//     })
//   }

//   const removeEffectFromPad = (padIndex: number, effectId: string) => {
//     setPadEffects((prev) => {
//       const updated = [...prev]
//       updated[padIndex] = {
//         ...updated[padIndex],
//         enabledEffects: updated[padIndex].enabledEffects.filter((id) => id !== effectId),
//       }
//       if (effectId === "reverb") {
//         updated[padIndex] = {
//           ...updated[padIndex],
//           reverbRoomSize: 0.5,
//           reverbDecay: 0.5,
//           reverbMix: 0,
//         }
//       }
//       return updated
//     })
//   }

//   const toggleSequencer = () => {
//     setIsSequencerPlaying(!isSequencerPlaying)
//   }

//   const resetSequencer = () => {
//     setIsSequencerPlaying(false)
//     setCurrentStep(0)
//     setActivePad(null)

//     if (sequencerTimeoutRef.current) {
//       clearTimeout(sequencerTimeoutRef.current)
//       sequencerTimeoutRef.current = null
//     }

//     sourceNodesRef.current.forEach((source) => {
//       try {
//         source.stop()
//         source.disconnect()
//       } catch (e) {
//         // Source might already be stopped
//       }
//     })
//     sourceNodesRef.current.clear()
//   }

//   // Helper function to create reverb using multiple delays
//   const createReverb = (ctx: AudioContext, roomSize: number, decay: number) => {
//     // Create multiple delay lines for reverb effect (Schroeder reverb)
//     const delays = [ctx.createDelay(1), ctx.createDelay(1), ctx.createDelay(1), ctx.createDelay(1)]

//     const gains = [ctx.createGain(), ctx.createGain(), ctx.createGain(), ctx.createGain()]

//     // Set delay times based on room size (prime numbers for natural sound)
//     const baseTimes = [0.0297, 0.0371, 0.0411, 0.0437]
//     delays.forEach((delay, i) => {
//       delay.delayTime.value = baseTimes[i] * (0.5 + roomSize * 1.5)
//       gains[i].gain.value = decay * 0.7
//     })

//     // Connect delays in parallel with feedback
//     const input = ctx.createGain()
//     const output = ctx.createGain()

//     delays.forEach((delay, i) => {
//       input.connect(delay)
//       delay.connect(gains[i])
//       gains[i].connect(output)
//       gains[i].connect(delay) // Feedback
//     })

//     return { input, output }
//   }

//   return (
//     <div className="border-2 border-foreground">
//       {/* Header */}
//       <div className="border-b-2 border-foreground p-3 bg-background h-[52px]">
//         <div className="flex items-center justify-between gap-4 h-full">
//           <div className="flex items-center gap-1 border-2 border-foreground rounded-md overflow-hidden">
//             <button
//               onClick={() => {
//                 setMode("realtime")
//                 setIsSequencerPlaying(false)
//               }}
//               className={`
//                 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors
//                 ${
//                   mode === "realtime" ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted"
//                 }
//               `}
//             >
//               Sampler
//             </button>
//             <button
//               onClick={() => setMode("sequencer")}
//               className={`
//                 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors
//                 ${
//                   mode === "sequencer"
//                     ? "bg-foreground text-background"
//                     : "bg-background text-foreground hover:bg-muted"
//                 }
//               `}
//             >
//               Sequencer
//             </button>
//           </div>

//           {mode === "sequencer" && (
//             <div className="flex items-center gap-2">
//               <Button
//                 onClick={toggleSequencer}
//                 size="sm"
//                 variant={isSequencerPlaying ? "default" : "outline"}
//                 className="font-mono uppercase tracking-wider h-7 px-2"
//               >
//                 {isSequencerPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
//               </Button>
//               <Button
//                 onClick={resetSequencer}
//                 size="sm"
//                 variant="outline"
//                 className="font-mono uppercase tracking-wider bg-transparent h-7 px-2"
//               >
//                 <RotateCcw className="w-3 h-3" />
//               </Button>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Pads Grid */}
//       <div className="p-2">
//         <div className="grid grid-cols-8 gap-2 md:gap-3">
//           {Array.from({ length: 16 }).map((_, index) => {
//             const padNumber = index + 1
//             const isActive = activePad === index
//             const isCurrentStep = isSequencerPlaying && mode === "sequencer" && currentStep === index
//             const assignedClipIndex = padAssignments[index]
//             const hasAssignment = assignedClipIndex !== null
//             const assignedClip = hasAssignment ? clips[assignedClipIndex] : null

//             return (
//               <button
//                 key={index}
//                 onClick={(e) => handlePadClick(index, e)}
//                 onTouchStart={() => handleTouchStart(index)}
//                 onTouchEnd={(e) => handleTouchEnd(index, e)}
//                 onTouchCancel={handleTouchCancel}
//                 className={`
//                   relative rounded-lg border-2 transition-all
//                   font-mono flex flex-col items-center justify-center
//                   h-12 md:h-16 lg:h-20
//                   ${
//                     isActive || isCurrentStep
//                       ? "bg-primary text-primary-foreground border-primary scale-95"
//                       : hasAssignment
//                         ? "bg-muted border-foreground hover:bg-muted/80"
//                         : "bg-background border-muted-foreground/30 hover:border-foreground hover:bg-muted/50"
//                   }
//                   active:scale-90
//                 `}
//                 style={
//                   hasAssignment && assignedClip
//                     ? {
//                         borderColor: assignedClip.color,
//                         boxShadow: `0 0 0 1px ${assignedClip.color}40`,
//                       }
//                     : undefined
//                 }
//               >
//                 {/* Pad number */}
//                 <div className="text-xs font-bold mb-0.5">{padNumber}</div>

//                 {/* Keyboard key */}
//                 <div
//                   className={`
//                   hidden lg:flex
//                   text-[7px] uppercase tracking-wider px-1 py-0.5 rounded border
//                   ${
//                     isActive || isCurrentStep
//                       ? "border-primary-foreground/30 bg-primary-foreground/10"
//                       : "border-current/20 bg-current/5"
//                   }
//                 `}
//                 >
//                   {PAD_KEYS[index]}
//                 </div>

//                 {hasAssignment && assignedClip && (
//                   <button
//                     onClick={(e) => {
//                       e.stopPropagation()
//                       setSelectingForPad(index)
//                     }}
//                     className="absolute top-1 right-1 text-[7px] font-bold bg-foreground text-background rounded px-1 mt-1 mr-px hover:bg-foreground/80 transition-colors cursor-pointer"
//                   >
//                     C{assignedClipIndex + 1}
//                   </button>
//                 )}
//               </button>
//             )
//           })}
//         </div>
//       </div>

//       {/* Clip Assignment Modal */}
//       {selectingForPad !== null && (
//         <div
//           className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
//           onClick={() => setSelectingForPad(null)}
//         >
//           <div
//             className="bg-background border-2 border-foreground rounded-lg p-4 max-w-md w-full mx-4"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="font-mono text-sm uppercase tracking-wider">Assign Clip to Pad {selectingForPad + 1}</h3>
//               <button onClick={() => setSelectingForPad(null)} className="p-1 hover:bg-muted rounded">
//                 <X className="w-4 h-4" />
//               </button>
//             </div>

//             <div className="space-y-2 max-h-64 overflow-y-auto">
//               {/* Option to clear assignment */}
//               <button
//                 onClick={() => assignClipToPad(selectingForPad, null)}
//                 className="w-full p-3 border-2 border-muted-foreground/30 rounded-lg hover:border-foreground hover:bg-muted transition-colors text-left font-mono text-sm"
//               >
//                 <div className="text-muted-foreground">Clear Assignment</div>
//               </button>

//               {/* List of available clips */}
//               {clips.length === 0 ? (
//                 <div className="p-4 text-center text-muted-foreground font-mono text-sm">
//                   No clips available. Create clips by Shift+dragging on the waveform.
//                 </div>
//               ) : (
//                 clips.map((clip, clipIndex) => (
//                   <button
//                     key={clipIndex}
//                     onClick={() => assignClipToPad(selectingForPad, clipIndex)}
//                     className="w-full p-3 border-2 border-foreground rounded-lg hover:bg-muted transition-colors text-left"
//                   >
//                     <div className="flex items-center justify-between">
//                       <div className="font-mono text-sm font-bold">Clip {clipIndex + 1}</div>
//                       <div className="text-xs text-muted-foreground font-mono">
//                         {clip.startTime.toFixed(2)}s - {clip.endTime.toFixed(2)}s
//                       </div>
//                     </div>
//                     <div className="mt-2 h-1 bg-foreground/20 rounded-full" />
//                   </button>
//                 ))
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }


"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, RotateCcw, X } from "lucide-react"
import type { Clip } from "./waveform-visualizer"

const PAD_KEYS = ["1", "2", "3", "4", "Q", "W", "E", "R", "A", "S", "D", "F", "Z", "X", "C", "V"]

interface SamplerPadsProps {
  audioBuffer: AudioBuffer | null
  clips?: Clip[]
  selectedClipId?: string | null
  onClipSelect?: (clipId: string | null) => void
  isPlaying?: boolean
  onPlayStateChange?: (isPlaying: boolean) => void
}

export default function SamplerPads({ 
  audioBuffer, 
  clips = [],
  selectedClipId,
  onClipSelect,
  isPlaying: externalIsPlaying,
  onPlayStateChange
}: SamplerPadsProps) {
  const [mode, setMode] = useState<"realtime" | "sequencer">("realtime")
  const [isSequencerPlaying, setIsSequencerPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [padAssignments, setPadAssignments] = useState<(number | null)[]>(Array(16).fill(null))
  const [selectingForPad, setSelectingForPad] = useState<number | null>(null)
  const [hoveredPad, setHoveredPad] = useState<number | null>(null)

  const sequencerTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggeredRef = useRef(false)

  // Auto-assign clips to pads when clips change
  useEffect(() => {
    setPadAssignments((prev) => {
      const newAssignments = [...prev]
      clips.forEach((_, index) => {
        if (index < 16 && newAssignments[index] === null) {
          newAssignments[index] = index
        }
      })
      return newAssignments
    })
  }, [clips.length])

  // Keyboard controls for realtime mode
  useEffect(() => {
    if (mode !== "realtime") return

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase()
      const padIndex = PAD_KEYS.indexOf(key)

      if (padIndex !== -1) {
        const clipIndex = padAssignments[padIndex]
        if (clipIndex !== null && clipIndex < clips.length) {
          handlePadPlay(padIndex)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mode, clips, padAssignments, audioBuffer])

  // Sequencer playback logic
  useEffect(() => {
    if (!isSequencerPlaying || mode !== "sequencer") {
      if (sequencerTimeoutRef.current) {
        clearTimeout(sequencerTimeoutRef.current)
        sequencerTimeoutRef.current = null
      }
      return
    }

    const playNextStep = () => {
      setCurrentStep((prev) => {
        const nextStep = (prev + 1) % 16
        const clipIndex = padAssignments[nextStep]

        let duration = 0.5 // Default 500ms if no clip

        if (clipIndex !== null && clipIndex < clips.length) {
          const clip = clips[clipIndex]
          duration = clip.endTime - clip.startTime
          // Select and play the clip through main controls
          if (onClipSelect) {
            onClipSelect(clip.id)
            setTimeout(() => {
              if (onPlayStateChange) {
                onPlayStateChange(true)
              }
            }, 50)
          }
        }

        sequencerTimeoutRef.current = setTimeout(() => {
          playNextStep()
        }, duration * 1000)

        return nextStep
      })
    }

    playNextStep()

    return () => {
      if (sequencerTimeoutRef.current) {
        clearTimeout(sequencerTimeoutRef.current)
        sequencerTimeoutRef.current = null
      }
    }
  }, [isSequencerPlaying, mode, clips, padAssignments, onClipSelect, onPlayStateChange])

  const handlePadPlay = (padIndex: number) => {
    if (!onClipSelect || !onPlayStateChange) return

    const clipIndex = padAssignments[padIndex]
    if (clipIndex !== null && clipIndex < clips.length) {
      const clip = clips[clipIndex]
      
      // If the same clip is already selected and playing, stop it
      if (selectedClipId === clip.id && externalIsPlaying) {
        onPlayStateChange(false)
      } else {
        // Select the clip and play
        onClipSelect(clip.id)
        // Small delay to let selection update
        setTimeout(() => {
          onPlayStateChange(true)
        }, 50)
      }
    }
  }

  const handlePadClick = (padIndex: number, event: React.MouseEvent) => {
    if (event.shiftKey) {
      setSelectingForPad(padIndex)
      return
    }

    if (mode === "realtime") {
      handlePadPlay(padIndex)
    }
  }

  const handleTouchStart = (padIndex: number) => {
    longPressTriggeredRef.current = false
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      setSelectingForPad(padIndex)
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, 500)
  }

  const handleTouchEnd = (padIndex: number, event: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (longPressTriggeredRef.current) {
      event.preventDefault()
      return
    }

    if (mode === "realtime") {
      handlePadPlay(padIndex)
    }
  }

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressTriggeredRef.current = false
  }

  const assignClipToPad = (padIndex: number, clipIndex: number | null) => {
    setPadAssignments((prev) => {
      const newAssignments = [...prev]
      newAssignments[padIndex] = clipIndex
      return newAssignments
    })
    setSelectingForPad(null)
  }

  const toggleSequencer = () => {
    setIsSequencerPlaying(!isSequencerPlaying)
  }

  const resetSequencer = () => {
    setIsSequencerPlaying(false)
    setCurrentStep(0)
    
    if (sequencerTimeoutRef.current) {
      clearTimeout(sequencerTimeoutRef.current)
      sequencerTimeoutRef.current = null
    }

    if (onPlayStateChange) {
      onPlayStateChange(false)
    }
    if (onClipSelect) {
      onClipSelect(null)
    }
  }

  return (
    <div className="border-2 border-foreground">
      {/* Header */}
      <div className="border-b-2 border-foreground p-3 bg-background h-[52px]">
        <div className="flex items-center justify-between gap-4 h-full">
          <div className="flex items-center gap-1 border-2 border-foreground rounded-md overflow-hidden">
            <button
              onClick={() => {
                setMode("realtime")
                setIsSequencerPlaying(false)
                if (onClipSelect) onClipSelect(null)
              }}
              className={`
                px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors
                ${mode === "realtime" ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted"}
              `}
            >
              Sampler
            </button>
            <button
              onClick={() => setMode("sequencer")}
              className={`
                px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors
                ${mode === "sequencer" ? "bg-foreground text-background" : "bg-background text-foreground hover:bg-muted"}
              `}
            >
              Sequencer
            </button>
          </div>

          {mode === "sequencer" && (
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleSequencer}
                size="sm"
                variant={isSequencerPlaying ? "default" : "outline"}
                className="font-mono uppercase tracking-wider h-7 px-2"
              >
                {isSequencerPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </Button>
              <Button
                onClick={resetSequencer}
                size="sm"
                variant="outline"
                className="font-mono uppercase tracking-wider bg-transparent h-7 px-2"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Pads Grid */}
      <div className="p-2">
        <div className="grid grid-cols-8 gap-2 md:gap-3">
          {Array.from({ length: 16 }).map((_, index) => {
            const padNumber = index + 1
            const assignedClipIndex = padAssignments[index]
            const hasAssignment = assignedClipIndex !== null
            const assignedClip = hasAssignment ? clips[assignedClipIndex] : null
            
            // Check if this pad's clip is currently selected and playing
            const isActiveClip = assignedClip && selectedClipId === assignedClip.id && externalIsPlaying
            const isCurrentStep = isSequencerPlaying && mode === "sequencer" && currentStep === index

            return (
              <button
                key={index}
                onClick={(e) => handlePadClick(index, e)}
                onTouchStart={() => handleTouchStart(index)}
                onTouchEnd={(e) => handleTouchEnd(index, e)}
                onTouchCancel={handleTouchCancel}
                onMouseEnter={() => setHoveredPad(index)}
                onMouseLeave={() => setHoveredPad(null)}
                className={`
                  relative rounded-lg border-2 transition-all
                  font-mono flex flex-col items-center justify-center
                  h-12 md:h-16 lg:h-20
                  ${isActiveClip || isCurrentStep
                    ? "bg-primary text-primary-foreground border-primary scale-95"
                    : hasAssignment
                    ? "bg-muted border-foreground hover:bg-muted/80"
                    : "bg-background border-muted-foreground/30 hover:border-foreground hover:bg-muted/50"}
                  active:scale-90
                `}
              >
                <div className="text-xs font-bold mb-0.5">{padNumber}</div>
                <div className="hidden lg:flex text-[7px] uppercase tracking-wider px-1 py-0.5 rounded border border-current/20 bg-current/5">
                  {PAD_KEYS[index]}
                </div>

                {hasAssignment && assignedClip && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectingForPad(index)
                    }}
                    className="absolute top-1 right-1 text-[7px] font-bold bg-foreground text-background rounded px-1 hover:bg-foreground/80 transition-colors"
                  >
                    C{assignedClipIndex + 1}
                  </button>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Clip Assignment Modal */}
      {selectingForPad !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectingForPad(null)}
        >
          <div
            className="bg-background border-2 border-foreground rounded-lg p-4 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-sm uppercase tracking-wider">
                Assign Clip to Pad {selectingForPad + 1}
              </h3>
              <button onClick={() => setSelectingForPad(null)} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => assignClipToPad(selectingForPad, null)}
                className="w-full p-3 border-2 border-muted-foreground/30 rounded-lg hover:border-foreground hover:bg-muted transition-colors text-left font-mono text-sm"
              >
                <div className="text-muted-foreground">Clear Assignment</div>
              </button>

              {clips.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground font-mono text-sm">
                  No clips available. Create clips by double-clicking and dragging on the waveform.
                </div>
              ) : (
                clips.map((clip, clipIndex) => (
                  <button
                    key={clipIndex}
                    onClick={() => assignClipToPad(selectingForPad, clipIndex)}
                    className="w-full p-3 border-2 border-foreground rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-sm font-bold">Clip {clipIndex + 1}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {clip.startTime.toFixed(2)}s - {clip.endTime.toFixed(2)}s
                      </div>
                    </div>
                    <div className="mt-2 h-1 bg-foreground/20 rounded-full" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}