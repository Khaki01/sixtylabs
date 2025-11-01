"use client"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface EffectsPanelProps {
  effects: {
    volume: number
    pitch: number
    reverse: boolean
  }
  setEffects: (effects: any) => void
}

export default function EffectsPanel({ effects, setEffects }: EffectsPanelProps) {
  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        className="w-full font-mono uppercase tracking-wider bg-transparent"
        onClick={() => {
          // TODO: Implement add effect functionality
          console.log("Add effect clicked")
        }}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add effect
      </Button>

      {/* Pitch & Time */}
      <div className="border-2 border-foreground p-4 space-y-4">
        <h3 className="font-mono text-sm uppercase tracking-wider border-b border-foreground pb-2">
          E00: Pitch &amp; Time
        </h3>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase tracking-wider">Pitch: {effects.pitch.toFixed(2)}x</label>
          <Slider
            value={[effects.pitch]}
            onValueChange={([value]) => setEffects({ ...effects, pitch: value })}
            min={0.25}
            max={4}
            step={0.01}
          />
        </div>

        <Button
          variant={effects.reverse ? "default" : "outline"}
          onClick={() => setEffects({ ...effects, reverse: !effects.reverse })}
          className={`w-full font-mono uppercase tracking-wider ${effects.reverse ? "" : "bg-transparent"}`}
        >
          Reverse: {effects.reverse ? "ON" : "OFF"}
        </Button>
      </div>
    </div>
  )
}


// "use client"
// import { Slider } from "@/components/ui/slider"
// import { Button } from "@/components/ui/button"

// interface EffectsPanelProps {
//   effects: {
//     volume: number
//     pitch: number
//     reverse: boolean
//   }
//   setEffects: (effects: any) => void
// }

// export default function EffectsPanel({ effects, setEffects }: EffectsPanelProps) {
//   return (
//     <div className="space-y-4">
//       {/* Pitch & Time */}
//       <div className="border-2 border-foreground p-4 space-y-4">
//         <h3 className="font-mono text-sm uppercase tracking-wider border-b border-foreground pb-2">
//           E00: Pitch &amp; Time
//         </h3>

//         <div className="space-y-2">
//           <label className="font-mono text-xs uppercase tracking-wider">Pitch: {effects.pitch.toFixed(2)}x</label>
//           <Slider
//             value={[effects.pitch]}
//             onValueChange={([value]) => setEffects({ ...effects, pitch: value })}
//             min={0.25}
//             max={4}
//             step={0.01}
//           />
//         </div>

//         <Button
//           variant={effects.reverse ? "default" : "outline"}
//           onClick={() => setEffects({ ...effects, reverse: !effects.reverse })}
//           className={`w-full font-mono uppercase tracking-wider ${effects.reverse ? "" : "bg-transparent"}`}
//         >
//           Reverse: {effects.reverse ? "ON" : "OFF"}
//         </Button>
//       </div>
//     </div>
//   )
// }
