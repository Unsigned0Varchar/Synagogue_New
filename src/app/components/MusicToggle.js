"use client";

import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function MusicToggle() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => {
        console.warn("Autoplay blocked by browser. User gesture required.", err);
      });
      setIsPlaying(true);
    }
  };

  return (
    <div className="music-toggle-container">
      <audio
        ref={audioRef}
        src="/background-music.mp3"
        loop
        preload="auto"
      />
      <button
        onClick={togglePlay}
        className={`music-toggle-btn ${isPlaying ? "is-playing" : ""}`}
        aria-label={isPlaying ? "Mute music" : "Play music"}
        title={isPlaying ? "Mute Music" : "Play Music"}
      >
        {isPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
        <span>{isPlaying ? "MUTE" : "PLAY"}</span>
      </button>
    </div>
  );
}
