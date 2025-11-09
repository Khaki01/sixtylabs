// "use client";

// import type React from "react";
// import { useState, useEffect, useRef } from "react";
// import { Button } from "@/components/ui/button";
// import { Play, Pause, RotateCcw, X } from "lucide-react";
// import type { Clip } from "./waveform-visualizer";

// const PAD_KEYS = [
//   "1",
//   "2",
//   "3",
//   "4",
//   "Q",
//   "W",
//   "E",
//   "R",
//   "A",
//   "S",
//   "D",
//   "F",
//   "Z",
//   "X",
//   "C",
//   "V",
// ];

// interface SamplerPadsProps {
//   audioBuffer: AudioBuffer | null;
//   clips?: Clip[];
//   selectedClipId?: string | null;
//   onClipSelect?: (clipId: string | null) => void;
//   isPlaying?: boolean;
//   onPlayStateChange?: (isPlaying: boolean) => void;
//   setSamplerMode: (input: "sampler" | "sequencer") => void;
//   setIsPadsPlaying: (input: boolean) => void;
// }

// export default function SamplerPads({
//   audioBuffer,
//   clips = [],
//   selectedClipId,
//   onClipSelect,
//   isPlaying: externalIsPlaying,
//   onPlayStateChange,
//   setSamplerMode,
//   setIsPadsPlaying,
// }: SamplerPadsProps) {
//   const [mode, setMode] = useState<"realtime" | "sequencer">("realtime");
//   const [isSequencerPlaying, setIsSequencerPlaying] = useState(false);
//   const [currentStep, setCurrentStep] = useState(0);
//   const [padAssignments, setPadAssignments] = useState<(number | null)[]>(
//     Array(16).fill(null)
//   );
//   const [selectingForPad, setSelectingForPad] = useState<number | null>(null);
//   const [hoveredPad, setHoveredPad] = useState<number | null>(null);

//   const sequencerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
//   const longPressTriggeredRef = useRef(false);

//   // Auto-assign clips to pads when clips change
//   useEffect(() => {
//     setPadAssignments((prev) => {
//       const newAssignments = [...prev];
//       clips.forEach((_, index) => {
//         if (index < 16 && newAssignments[index] === null) {
//           newAssignments[index] = index;
//         }
//       });
//       return newAssignments;
//     });
//   }, [clips.length]);

//   // Keyboard controls for realtime mode
//   useEffect(() => {
//     if (mode !== "realtime") return;

//     const handleKeyDown = (e: KeyboardEvent) => {
//       const key = e.key.toUpperCase();
//       const padIndex = PAD_KEYS.indexOf(key);

//       if (padIndex !== -1) {
//         const clipIndex = padAssignments[padIndex];
//         if (clipIndex !== null && clipIndex < clips.length) {
//           handlePadPlay(padIndex);
//         }
//       }
//     };

//     window.addEventListener("keydown", handleKeyDown);
//     return () => window.removeEventListener("keydown", handleKeyDown);
//   }, [mode, clips, padAssignments, audioBuffer]);

//   // Sequencer playback logic
//   // useEffect(() => {
//   //   if (!isSequencerPlaying || mode !== "sequencer") {
//   //     if (sequencerTimeoutRef.current) {
//   //       clearTimeout(sequencerTimeoutRef.current);
//   //       sequencerTimeoutRef.current = null;
//   //     }
//   //     return;
//   //   }

//   //   const playNextStep = () => {
//   //     setCurrentStep((prev) => {
//   //       const nextStep = (prev + 1) % 16;
//   //       const clipIndex = padAssignments[nextStep];

//   //       let duration = 0.5; // Default 500ms if no clip

//   //       if (clipIndex !== null && clipIndex < clips.length) {
//   //         const clip = clips[clipIndex];
//   //         duration = clip.endTime - clip.startTime;
//   //         // Select and play the clip through main controls
//   //         if (onClipSelect) {
//   //           onClipSelect(clip.id);
//   //           setTimeout(() => {
//   //             if (onPlayStateChange) {
//   //               onPlayStateChange(true);
//   //             }
//   //           }, 100);
//   //         }
//   //       }

//   //       sequencerTimeoutRef.current = setTimeout(() => {
//   //         playNextStep();
//   //       }, duration * 1000);

//   //       return nextStep;
//   //     });
//   //   };

//   //   playNextStep();

//   //   return () => {
//   //     if (sequencerTimeoutRef.current) {
//   //       clearTimeout(sequencerTimeoutRef.current);
//   //       sequencerTimeoutRef.current = null;
//   //     }
//   //   };
//   // }, [
//   //   isSequencerPlaying,
//   //   mode,
//   //   clips,
//   //   padAssignments,
//   //   onClipSelect,
//   //   onPlayStateChange,
//   // ]);

//   useEffect(() => {
//     setIsPadsPlaying(isSequencerPlaying);
//   }, [isSequencerPlaying]);

//   const handlePadPlay = (padIndex: number) => {
//     if (!onClipSelect || !onPlayStateChange) return;

//     const clipIndex = padAssignments[padIndex];
//     if (clipIndex !== null && clipIndex < clips.length) {
//       const clip = clips[clipIndex];

//       // If the same clip is already selected and playing, stop it
//       if (selectedClipId === clip.id && externalIsPlaying) {
//         onClipSelect(null);
//         onPlayStateChange(false);
//       } else {
//         // Select the clip and play
//         onClipSelect(clip.id);
//         // Small delay to let selection update
//         setTimeout(() => {
//           onPlayStateChange(true);
//         }, 100);
//       }
//     }
//   };

//   const handlePadClick = (padIndex: number, event: React.MouseEvent) => {
//     if (event.shiftKey) {
//       setSelectingForPad(padIndex);
//       return;
//     }

//     if (mode === "realtime") {
//       handlePadPlay(padIndex);
//     }
//   };

//   const handleTouchStart = (padIndex: number) => {
//     longPressTriggeredRef.current = false;
//     longPressTimerRef.current = setTimeout(() => {
//       longPressTriggeredRef.current = true;
//       setSelectingForPad(padIndex);
//       if (navigator.vibrate) {
//         navigator.vibrate(50);
//       }
//     }, 500);
//   };

//   const handleTouchEnd = (padIndex: number, event: React.TouchEvent) => {
//     if (longPressTimerRef.current) {
//       clearTimeout(longPressTimerRef.current);
//       longPressTimerRef.current = null;
//     }

//     if (longPressTriggeredRef.current) {
//       event.preventDefault();
//       return;
//     }

//     if (mode === "realtime") {
//       handlePadPlay(padIndex);
//     }
//   };

//   const handleTouchCancel = () => {
//     if (longPressTimerRef.current) {
//       clearTimeout(longPressTimerRef.current);
//       longPressTimerRef.current = null;
//     }
//     longPressTriggeredRef.current = false;
//   };

//   const assignClipToPad = (padIndex: number, clipIndex: number | null) => {
//     setPadAssignments((prev) => {
//       const newAssignments = [...prev];
//       newAssignments[padIndex] = clipIndex;
//       return newAssignments;
//     });
//     setSelectingForPad(null);
//   };

//   const toggleSequencer = () => {
//     setIsSequencerPlaying(!isSequencerPlaying);
//   };

//   const resetSequencer = () => {
//     setIsSequencerPlaying(false);
//     setCurrentStep(0);

//     if (sequencerTimeoutRef.current) {
//       clearTimeout(sequencerTimeoutRef.current);
//       sequencerTimeoutRef.current = null;
//     }

//     if (onPlayStateChange) {
//       onPlayStateChange(false);
//     }
//     if (onClipSelect) {
//       onClipSelect(null);
//     }
//   };

//   return (
//     <div className="border-2 border-foreground">
//       {/* Header */}
//       <div className="border-b-2 border-foreground p-3 bg-background h-[52px]">
//         <div className="flex items-center justify-between gap-4 h-full">
//           <div className="flex items-center gap-1 border-2 border-foreground rounded-md overflow-hidden">
//             <button
//               onClick={() => {
//                 setMode("realtime");
//                 setSamplerMode("sampler");
//                 setIsSequencerPlaying(false);
//                 if (onClipSelect) onClipSelect(null);
//               }}
//               className={`
//                 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors
//                 ${
//                   mode === "realtime"
//                     ? "bg-foreground text-background"
//                     : "bg-background text-foreground hover:bg-muted"
//                 }
//               `}
//             >
//               Sampler
//             </button>
//             <button
//               onClick={() => {
//                 setMode("sequencer");
//                 setSamplerMode("sequencer");
//               }}
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
//                 {isSequencerPlaying ? (
//                   <Pause className="w-3 h-3" />
//                 ) : (
//                   <Play className="w-3 h-3" />
//                 )}
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
//             const padNumber = index + 1;
//             const assignedClipIndex = padAssignments[index];
//             const hasAssignment = assignedClipIndex !== null;
//             const assignedClip = hasAssignment
//               ? clips[assignedClipIndex]
//               : null;

//             // Check if this pad's clip is currently selected and playing
//             const isActiveClip =
//               assignedClip &&
//               selectedClipId === assignedClip.id &&
//               externalIsPlaying;
//             const isCurrentStep =
//               isSequencerPlaying &&
//               mode === "sequencer" &&
//               currentStep === index;

//             return (
//               <button
//                 key={index}
//                 onClick={(e) => handlePadClick(index, e)}
//                 onTouchStart={() => handleTouchStart(index)}
//                 onTouchEnd={(e) => handleTouchEnd(index, e)}
//                 onTouchCancel={handleTouchCancel}
//                 onMouseEnter={() => setHoveredPad(index)}
//                 onMouseLeave={() => setHoveredPad(null)}
//                 className={`
//                   relative rounded-lg border-2 transition-all
//                   font-mono flex flex-col items-center justify-center
//                   h-12 md:h-16 lg:h-20
//                   ${
//                     isActiveClip || isCurrentStep
//                       ? "bg-primary text-primary-foreground border-primary scale-95"
//                       : hasAssignment
//                       ? "bg-muted border-foreground hover:bg-muted/80"
//                       : "bg-background border-muted-foreground/30 hover:border-foreground hover:bg-muted/50"
//                   }
//                   active:scale-90
//                 `}
//               >
//                 <div className="text-xs font-bold mb-0.5">{padNumber}</div>
//                 <div className="hidden lg:flex text-[7px] uppercase tracking-wider px-1 py-0.5 rounded border border-current/20 bg-current/5">
//                   {PAD_KEYS[index]}
//                 </div>

//                 {hasAssignment && assignedClip && (
//                   <div
//                     role="button"
//                     tabIndex={0}
//                     onClick={(e) => {
//                       e.stopPropagation();
//                       setSelectingForPad(index);
//                     }}
//                     className="absolute top-1 right-1 text-[7px] font-bold bg-foreground text-background rounded px-1 hover:bg-foreground/80 transition-colors cursor-pointer select-none"
//                   >
//                     C{assignedClipIndex + 1}
//                   </div>
//                 )}
//               </button>
//             );
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
//               <h3 className="font-mono text-sm uppercase tracking-wider">
//                 Assign Clip to Pad {selectingForPad + 1}
//               </h3>
//               <button
//                 onClick={() => setSelectingForPad(null)}
//                 className="p-1 hover:bg-muted rounded"
//               >
//                 <X className="w-4 h-4" />
//               </button>
//             </div>

//             <div className="space-y-2 max-h-64 overflow-y-auto">
//               <button
//                 onClick={() => assignClipToPad(selectingForPad, null)}
//                 className="w-full p-3 border-2 border-muted-foreground/30 rounded-lg hover:border-foreground hover:bg-muted transition-colors text-left font-mono text-sm"
//               >
//                 <div className="text-muted-foreground">Clear Assignment</div>
//               </button>

//               {clips.length === 0 ? (
//                 <div className="p-4 text-center text-muted-foreground font-mono text-sm">
//                   No clips available. Create clips by double-clicking and
//                   dragging on the waveform.
//                 </div>
//               ) : (
//                 clips.map((clip, clipIndex) => (
//                   <button
//                     key={clipIndex}
//                     onClick={() => assignClipToPad(selectingForPad, clipIndex)}
//                     className="w-full p-3 border-2 border-foreground rounded-lg hover:bg-muted transition-colors text-left"
//                   >
//                     <div className="flex items-center justify-between">
//                       <div className="font-mono text-sm font-bold">
//                         Clip {clipIndex + 1}
//                       </div>
//                       <div className="text-xs text-muted-foreground font-mono">
//                         {clip.startTime.toFixed(2)}s - {clip.endTime.toFixed(2)}
//                         s
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
//   );
// }

"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, X } from "lucide-react";
import type { Clip } from "./waveform-visualizer";

const PAD_KEYS = [
  "1",
  "2",
  "3",
  "4",
  "Q",
  "W",
  "E",
  "R",
  "A",
  "S",
  "D",
  "F",
  "Z",
  "X",
  "C",
  "V",
];

// CHANGED: Updated interface with new sequencer props
interface SamplerPadsProps {
  audioBuffer: AudioBuffer | null;
  clips?: Clip[];
  selectedClipId?: string | null;
  onClipSelect?: (clipId: string | null) => void;
  isPlaying?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  samplerMode?: "sequencer" | "sampler";
  setSamplerMode?: (mode: "sequencer" | "sampler") => void;
  isPadsPlaying?: boolean;
  onSequencerPlayPause?: () => void;
  onSequencerReset?: () => void;
  currentSequencerStep?: number;
  padAssignments?: (number | null)[];
  onPadAssignmentsChange?: (assignments: (number | null)[]) => void;
}

export default function SamplerPads({
  audioBuffer,
  clips = [],
  selectedClipId,
  onClipSelect,
  isPlaying: externalIsPlaying,
  onPlayStateChange,
  samplerMode = "sampler",
  setSamplerMode,
  isPadsPlaying = false,
  onSequencerPlayPause,
  onSequencerReset,
  currentSequencerStep = 0,
  padAssignments: externalPadAssignments = Array(16).fill(null),
  onPadAssignmentsChange,
}: SamplerPadsProps) {
  const [selectingForPad, setSelectingForPad] = useState<number | null>(null);
  const [hoveredPad, setHoveredPad] = useState<number | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggeredRef = useRef(false);

  // Use external pad assignments from parent
  const padAssignments = externalPadAssignments;

  // CHANGED: Auto-assign clips to pads when clips change
  useEffect(() => {
    if (!onPadAssignmentsChange) return;

    const newAssignments = [...padAssignments];
    let hasChanges = false;

    clips.forEach((_, index) => {
      if (index < 16 && newAssignments[index] === null) {
        newAssignments[index] = index;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      onPadAssignmentsChange(newAssignments);
    }
  }, [clips.length, onPadAssignmentsChange]);

  // Keyboard controls for sampler mode (realtime pad triggering)
  useEffect(() => {
    if (samplerMode !== "sampler") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const padIndex = PAD_KEYS.indexOf(key);

      if (padIndex !== -1) {
        const clipIndex = padAssignments[padIndex];
        if (clipIndex !== null && clipIndex < clips.length) {
          handlePadPlay(padIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [samplerMode, clips, padAssignments]);

  const handlePadPlay = (padIndex: number) => {
    if (!onClipSelect || !onPlayStateChange) return;

    const clipIndex = padAssignments[padIndex];
    if (clipIndex !== null && clipIndex < clips.length) {
      const clip = clips[clipIndex];

      // If the same clip is already selected and playing, stop it
      if (selectedClipId === clip.id && externalIsPlaying) {
        onClipSelect(null);
        onPlayStateChange(false);
      } else {
        // Select the clip and play
        onClipSelect(clip.id);
        setTimeout(() => {
          onPlayStateChange(true);
        }, 100);
      }
    }
  };

  const handlePadClick = (padIndex: number, event: React.MouseEvent) => {
    if (event.shiftKey) {
      setSelectingForPad(padIndex);
      return;
    }

    if (samplerMode === "sampler") {
      handlePadPlay(padIndex);
    }
  };

  const handleTouchStart = (padIndex: number) => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setSelectingForPad(padIndex);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchEnd = (padIndex: number, event: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (longPressTriggeredRef.current) {
      event.preventDefault();
      return;
    }

    if (samplerMode === "sampler") {
      handlePadPlay(padIndex);
    }
  };

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTriggeredRef.current = false;
  };

  const assignClipToPad = (padIndex: number, clipIndex: number | null) => {
    if (onPadAssignmentsChange) {
      const newAssignments = [...padAssignments];
      newAssignments[padIndex] = clipIndex;
      onPadAssignmentsChange(newAssignments);
    }
    setSelectingForPad(null);
  };

  return (
    <div className="border-2 border-foreground">
      {/* Header */}
      <div className="border-b-2 border-foreground p-3 bg-background h-[52px]">
        <div className="flex items-center justify-between gap-4 h-full">
          <div className="flex items-center gap-1 border-2 border-foreground rounded-md overflow-hidden">
            <button
              onClick={() => {
                if (setSamplerMode) setSamplerMode("sampler");
                if (onSequencerReset) onSequencerReset();
              }}
              className={`
                px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors
                ${
                  samplerMode === "sampler"
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-muted"
                }
              `}
            >
              Sampler
            </button>
            <button
              onClick={() => {
                if (setSamplerMode) setSamplerMode("sequencer");
              }}
              className={`
                px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors
                ${
                  samplerMode === "sequencer"
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-muted"
                }
              `}
            >
              Sequencer
            </button>
          </div>

          {samplerMode === "sequencer" && (
            <div className="flex items-center gap-2">
              <Button
                onClick={onSequencerPlayPause}
                size="sm"
                variant={isPadsPlaying ? "default" : "outline"}
                className="font-mono uppercase tracking-wider h-7 px-2"
              >
                {isPadsPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </Button>
              <Button
                onClick={onSequencerReset}
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
            const padNumber = index + 1;
            const assignedClipIndex = padAssignments[index];
            const hasAssignment = assignedClipIndex !== null;
            const assignedClip = hasAssignment
              ? clips[assignedClipIndex]
              : null;

            // Check if this pad's clip is currently selected and playing
            const isActiveClip =
              assignedClip &&
              selectedClipId === assignedClip.id &&
              externalIsPlaying;

            // CHANGED: Check if this is the current step in sequencer mode
            const isCurrentStep =
              isPadsPlaying &&
              samplerMode === "sequencer" &&
              currentSequencerStep === index;

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
                  ${
                    isActiveClip || isCurrentStep
                      ? "bg-primary text-primary-foreground border-primary scale-95"
                      : hasAssignment
                      ? "bg-muted border-foreground hover:bg-muted/80"
                      : "bg-background border-muted-foreground/30 hover:border-foreground hover:bg-muted/50"
                  }
                  active:scale-90
                `}
              >
                <div className="text-xs font-bold mb-0.5">{padNumber}</div>
                <div className="hidden lg:flex text-[7px] uppercase tracking-wider px-1 py-0.5 rounded border border-current/20 bg-current/5">
                  {PAD_KEYS[index]}
                </div>

                {hasAssignment && assignedClip && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectingForPad(index);
                    }}
                    className="absolute top-1 right-1 text-[7px] font-bold bg-foreground text-background rounded px-1 hover:bg-foreground/80 transition-colors cursor-pointer select-none"
                  >
                    C{assignedClipIndex + 1}
                  </div>
                )}
              </button>
            );
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
              <button
                onClick={() => setSelectingForPad(null)}
                className="p-1 hover:bg-muted rounded"
              >
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
                  No clips available. Create clips by double-clicking and
                  dragging on the waveform.
                </div>
              ) : (
                clips.map((clip, clipIndex) => (
                  <button
                    key={clipIndex}
                    onClick={() => assignClipToPad(selectingForPad, clipIndex)}
                    className="w-full p-3 border-2 border-foreground rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-sm font-bold">
                        Clip {clipIndex + 1}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {clip.startTime.toFixed(2)}s - {clip.endTime.toFixed(2)}
                        s
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
  );
}
