
import React, { useEffect, useRef, useState } from 'react';
import { TreeMorphState } from '../types';

interface GestureManagerProps {
  onStateChange: (state: TreeMorphState) => void;
  active: boolean;
  handXRef: React.MutableRefObject<number>;
  isHandActiveRef: React.MutableRefObject<boolean>;
}

declare const Hands: any;
declare const Camera: any;

export const GestureManager: React.FC<GestureManagerProps> = ({ onStateChange, active, handXRef, isHandActiveRef }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const [gestureStatus, setGestureStatus] = useState<'IDLE' | 'OPEN' | 'CLOSED'>('IDLE');

  useEffect(() => {
    if (!active) {
      if (cameraRef.current) cameraRef.current.stop();
      isHandActiveRef.current = false;
      return;
    }

    const onResults = (results: any) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        isHandActiveRef.current = true;
        
        // Track hand horizontal center
        handXRef.current = 1.0 - landmarks[0].x;

        // Finger indices for tip and MCP (knuckle)
        const fingerIndices = [
          [8, 5],   // Index
          [12, 9],  // Middle
          [16, 13], // Ring
          [20, 17], // Pinky
          [4, 2]    // Thumb (Simplified)
        ];

        let extendedFingers = 0;
        fingerIndices.forEach(([tip, mcp]) => {
          if (landmarks[tip].y < landmarks[mcp].y) {
            extendedFingers++;
          }
        });

        // SWAPPED GESTURE MAPPING:
        // Five fingers open -> TREE_SHAPE (聚合)
        if (extendedFingers >= 4) {
          onStateChange(TreeMorphState.TREE_SHAPE);
          setGestureStatus('OPEN');
        } 
        // Fist/Closed -> SCATTERED (散开)
        else if (extendedFingers <= 1) {
          onStateChange(TreeMorphState.SCATTERED);
          setGestureStatus('CLOSED');
        } else {
          setGestureStatus('IDLE');
        }
      } else {
        isHandActiveRef.current = false;
        setGestureStatus('IDLE');
      }
    };

    handsRef.current = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    handsRef.current.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    handsRef.current.onResults(onResults);

    if (videoRef.current) {
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          await handsRef.current.send({ image: videoRef.current });
        },
        width: 1280,
        height: 720
      });
      cameraRef.current.start();
    }

    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      isHandActiveRef.current = false;
    };
  }, [active, onStateChange, handXRef, isHandActiveRef]);

  if (!active) return null;

  return (
    <div className="fixed top-6 right-6 z-[60] flex flex-col items-end gap-3 animate-in fade-in slide-in-from-right duration-500">
      <div className="relative w-32 h-24 rounded-lg overflow-hidden border border-white/20 shadow-2xl bg-black/40 backdrop-blur-md">
        <video ref={videoRef} className="w-full h-full object-cover mirror" autoPlay playsInline muted />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`text-[10px] font-bold px-2 py-1 rounded bg-black/60 tracking-widest uppercase transition-all
              ${gestureStatus === 'OPEN' ? 'text-pink-500 border border-pink-500/50' : 
                gestureStatus === 'CLOSED' ? 'text-cyan-400 border border-cyan-400/50' : 'text-white/40'}`}>
              {/* Labels synchronized with logic: OPEN -> GATHER, CLOSED -> SCATTER */}
              {gestureStatus === 'OPEN' ? '聚合 (GATHER)' : gestureStatus === 'CLOSED' ? '散开 (SCATTER)' : '检测中...'}
            </div>
        </div>
      </div>
      <p className="text-[10px] text-white/50 tracking-widest uppercase">
        手势旋转: 左右移动手掌
      </p>
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};
