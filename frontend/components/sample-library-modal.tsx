"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Play, Pause, Music } from "lucide-react";

// Sample library - add your samples here
// Files should be placed in /public/samples/
export const SAMPLE_LIBRARY = [
  {
    id: "0",
    name: "Aaliyah - 4 Page Letter",
    filename: "Aaliyah - 4 Page Letter.mp3",
    category: "sample",
  },
  {
    id: "1",
    name: "Ahmad Jamal - Pastures",
    filename: "Ahmad Jamal - Pastures.mp3",
    category: "sample",
  },
  {
    id: "2",
    name: "Angelo Badalamenti - Twin Peaks Theme",
    filename: "Angelo Badalamenti - Twin Peaks Theme.mp3",
    category: "sample",
  },
  {
    id: "3",
    name: "Candi Station - Young Hearts Run Free",
    filename: "Candi Station - Young Hearts Run Free.mp3",
    category: "sample",
  },
  {
    id: "4",
    name: "Chet Baker - Almost Blue",
    filename: "Chet Baker - Almost Blue.mp3",
    category: "sample",
  },
  {
    id: "5",
    name: "Daft Punk - Something About Us",
    filename: "Daft Punk - Something About Us.mp3",
    category: "sample",
  },
  {
    id: "6",
    name: "Dean Blunt - 100",
    filename: "Dean Blunt - 100.mp3",
    category: "sample",
  },
  {
    id: "7",
    name: "Donell Jones - Believe In Me",
    filename: "Donell Jones - Believe In Me.mp3",
    category: "sample",
  },
  {
    id: "8",
    name: "Four Tet - SW9 9SL",
    filename: "Four Tet - SW9 9SL.wav",
    category: "sample",
  },
  {
    id: "9",
    name: "Frank Ocean - Cayendo",
    filename: "Frank Ocean - Cayendo.mp3",
    category: "sample",
  },
  {
    id: "10",
    name: "Home - Resonance",
    filename: "Home - Resonance.wav",
    category: "sample",
  },
  {
    id: "11",
    name: "Marvin Gaye - Mercy Mercy Me (The Ecology)",
    filename: "Marvin Gaye - Mercy Mercy Me (The Ecology).wav",
    category: "sample",
  },
  {
    id: "12",
    name: "Michael Jackson -Baby Be Mine",
    filename: "Michael Jackson -Baby Be Mine.wav",
    category: "sample",
  },
  {
    id: "13",
    name: "Ninetoes - Finder",
    filename: "Ninetoes - Finder.wav",
    category: "sample",
  },
  {
    id: "14",
    name: "Pink Floyd - Pillow Of Winds",
    filename: "Pink Floyd - Pillow Of Winds.mp3",
    category: "sample",
  },
  {
    id: "15",
    name: "Ponderosa Twins Plus One - Bound",
    filename: "Ponderosa Twins Plus One - Bound.mp3",
    category: "sample",
  },
  {
    id: "16",
    name: "The S.O.S. Band - No One's Gonna Love You",
    filename: "The S.O.S. Band - No One's Gonna Love You.mp3",
    category: "sample",
  },
];

interface SampleLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (sampleUrl: string, sampleName: string) => void;
}

export default function SampleLibraryModal({
  isOpen,
  onClose,
  onSelectSample,
}: SampleLibraryModalProps) {
  const [previewingSampleId, setPreviewingSampleId] = useState<string | null>(
    null,
  );
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getSampleUrl = (filename: string) => {
    // Check if it's the demo file (in root public) or a library sample
    if (filename === "demo-audio.mp3") {
      return `/${filename}`;
    }
    return `/samples/${filename}`;
  };

  const stopCurrentPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPreviewingSampleId(null);
  };

  const handlePreview = (sampleId: string, filename: string) => {
    // If clicking the same sample that's playing, stop it
    if (previewingSampleId === sampleId) {
      stopCurrentPreview();
      return;
    }

    // Stop any current preview first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Start new preview
    const audio = new Audio(getSampleUrl(filename));
    audio.volume = 0.5;
    audio.onended = () => setPreviewingSampleId(null);
    audio.play().catch(console.error);
    audioRef.current = audio;
    setPreviewingSampleId(sampleId);
  };

  const handleSelect = (sample: (typeof SAMPLE_LIBRARY)[0]) => {
    stopCurrentPreview();
    setLoadingSampleId(sample.id);

    try {
      const url = getSampleUrl(sample.filename);
      onSelectSample(url, sample.name);
      onClose();
    } finally {
      setLoadingSampleId(null);
    }
  };

  const handleClose = () => {
    stopCurrentPreview();
    onClose();
  };

  if (!isOpen) return null;

  // Group samples by category
  const categories = SAMPLE_LIBRARY.reduce(
    (acc, sample) => {
      if (!acc[sample.category]) {
        acc[sample.category] = [];
      }
      acc[sample.category].push(sample);
      return acc;
    },
    {} as Record<string, typeof SAMPLE_LIBRARY>,
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/35 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="border-2 border-foreground bg-background w-full max-w-md max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="border-b-2 border-foreground p-4 flex items-center justify-between">
            <h2 className="font-mono text-lg uppercase tracking-wider">
              Sample Library
            </h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {SAMPLE_LIBRARY.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-mono text-sm">No samples available</p>
                <p className="text-xs mt-2">Add samples to /public/samples/</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(categories).map(([category, samples]) => (
                  <div key={category}>
                    <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {samples.map((sample) => (
                        <div
                          key={sample.id}
                          className="border-2 border-foreground p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm truncate">
                              {sample.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {sample.filename}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-mono w-9 h-9 p-0"
                              onClick={() =>
                                handlePreview(sample.id, sample.filename)
                              }
                            >
                              {previewingSampleId === sample.id ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-mono uppercase"
                              onClick={() => handleSelect(sample)}
                              disabled={loadingSampleId === sample.id}
                            >
                              {loadingSampleId === sample.id ? "..." : "Load"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t-2 border-foreground p-4">
            <p className="text-xs text-muted-foreground text-center font-mono">
              Click play to preview, load to use
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
