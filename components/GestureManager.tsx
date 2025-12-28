
import React, { useEffect, useRef, useState } from 'react';
import { TreeMorphState } from '../types';

interface GestureManagerProps {
  onStateChange: (state: TreeMorphState) => void;
  onGestureAction: (action: 'VIEW' | 'NEXT' | 'CLOSE') => void;
  active: boolean;
  handXRef: React.MutableRefObject<number>;
  isHandActiveRef: React.MutableRefObject<boolean>;
  statusText?: string;
}

declare const Hands: any;
declare const Camera: any;

export const GestureManager: React.FC<GestureManagerProps> = ({ 
  onStateChange, 
  onGestureAction,
  active, 
  handXRef, 
  isHandActiveRef,
  statusText: appStatusText
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [localStatus, setLocalStatus] = useState('初始化...');
  const isDestroyedRef = useRef(false);
  
  const getDistance = (p1: any, p2: any) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  useEffect(() => {
    isDestroyedRef.current = false;

    if (!active) {
      if (cameraRef.current) cameraRef.current.stop();
      if (handsRef.current) {
        try { handsRef.current.close(); } catch(e) {}
        handsRef.current = null;
      }
      isHandActiveRef.current = false;
      setIsModelLoaded(false);
      return;
    }

    const onResults = (results: any) => {
      if (isDestroyedRef.current || !results) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          isHandActiveRef.current = true;
          
          const landmarks = results.multiHandLandmarks[0];
          const handedness = results.multiHandedness[0];
          
          handXRef.current = landmarks[0].x;

          ctx.globalAlpha = 0.8;
          landmarks.forEach((point: any) => {
            ctx.beginPath();
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          });

          const handLabel = handedness.label === 'Left' ? '右手' : '左手';
          let statusPrefix = `检测到${handLabel}`;

          const wrist = landmarks[0];
          const palmCenter = landmarks[9]; 
          const refDist = getDistance(wrist, palmCenter);

          // 手指索引: 0拇指, 1食指, 2中指, 3无名指, 4小指
          const tips = [4, 8, 12, 16, 20];
          const extended = tips.map(tip => getDistance(landmarks[tip], wrist) > refDist * 1.65);
          const extendedCount = extended.filter(v => v).length;

          // 核心逻辑判断
          // 1. "1" 手势: 仅食指 (VIEW)
          if (extendedCount === 1 && extended[1]) {
            setLocalStatus(`${statusPrefix}: 预览照片`);
            onGestureAction('VIEW');
          }
          // 2. “比耶”/“2”手势: 食指、中指伸出，其余收起 (NEXT)
          else if (extendedCount === 2 && extended[1] && extended[2] && !extended[0] && !extended[3] && !extended[4]) {
            setLocalStatus(`${statusPrefix}: 下一张`);
            onGestureAction('NEXT');
          }
          // 3. “3”手势: 中指、无名指、小拇指伸出，其余收起 (CLOSE)
          else if (extendedCount === 3 && extended[2] && extended[3] && extended[4] && !extended[1] && !extended[0]) {
            setLocalStatus(`${statusPrefix}: 关闭预览`);
            onGestureAction('CLOSE');
          }
          // 4. 全开: 切换形态 (AXIS)
          else if (extendedCount >= 4) {
            setLocalStatus(`${statusPrefix}: 坐标轴模式`);
            onStateChange(TreeMorphState.TREE_SHAPE);
          }
          // 5. 握拳: 切换形态 (SCATTER)
          else if (extendedCount === 0) {
            setLocalStatus(`${statusPrefix}: 散开模式`);
            onStateChange(TreeMorphState.SCATTERED);
          } else {
            setLocalStatus(statusPrefix);
          }
        } else {
          isHandActiveRef.current = false;
          setLocalStatus('等待手势...');
        }
      }
    };

    const HandsClass = (window as any).Hands || (typeof Hands !== 'undefined' ? Hands : null);
    const CameraClass = (window as any).Camera || (typeof Camera !== 'undefined' ? Camera : null);

    if (!HandsClass) {
      setLocalStatus('引擎未加载');
      return;
    }

    try {
      const hands = new HandsClass({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
      });

      hands.setOptions({
        maxNumHands: 1, 
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      if (videoRef.current) {
        cameraRef.current = new CameraClass(videoRef.current, {
          onFrame: async () => {
            if (isDestroyedRef.current || !handsRef.current || !videoRef.current) return;
            if (videoRef.current.readyState >= 2) {
              try {
                await handsRef.current.send({ image: videoRef.current });
                if (!isModelLoaded) setIsModelLoaded(true);
              } catch (e) {}
            }
          },
          width: 320,
          height: 240
        });
        cameraRef.current.start();
      }
    } catch (err) {
      console.error("Init Error:", err);
    }

    return () => {
      isDestroyedRef.current = true;
      if (cameraRef.current) cameraRef.current.stop();
      if (handsRef.current) {
        try { handsRef.current.close(); } catch(e) {}
        handsRef.current = null;
      }
    };
  }, [active, onStateChange, onGestureAction]);

  if (!active) return null;

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-3 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="relative w-40 h-30 rounded-2xl overflow-hidden border border-black/5 shadow-2xl bg-black group transition-all duration-500 hover:scale-105">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover mirror brightness-90 contrast-110 opacity-90" 
          autoPlay 
          playsInline 
          muted 
        />
        <canvas 
          ref={canvasRef}
          width={320}
          height={240}
          className="absolute inset-0 w-full h-full object-cover mirror pointer-events-none"
        />
        {!isModelLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest">Loading Engine</span>
            </div>
          </div>
        )}
      </div>

      <div className="w-40 bg-neutral-900/95 backdrop-blur-xl py-2 px-4 rounded-xl border border-white/10 shadow-2xl flex items-center gap-3 transition-all duration-300">
        <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.5)] ${isHandActiveRef.current ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-[10px] font-black text-white tracking-[0.1em] uppercase truncate">
          {isHandActiveRef.current ? localStatus : (isModelLoaded ? '等待手势' : '初始化引擎')}
        </span>
      </div>

      <style>{`
        .mirror { transform: scaleX(-1); }
      `}</style>
    </div>
  );
};
