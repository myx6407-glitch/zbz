import React, { useState, Suspense, useRef, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Scene } from './components/Scene';
import { TreeMorphState } from './types';
import { GestureManager } from './components/GestureManager';

const Logo: React.FC = () => (
  <div className="flex items-center select-none pointer-events-auto transition-all duration-500">
    <div className="relative">
      <img 
        src="https://file.uhsea.com/2512/c6ecfe403a3e29fa1d2afc9c8ead0238ZV.png" 
        alt="人生坐标" 
        className="h-20 md:h-28 w-auto object-contain filter"
      />
    </div>
  </div>
);

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [treeState, setTreeState] = useState<TreeMorphState>(TreeMorphState.TREE_SHAPE);
  const [userImages, setUserImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isGestureEnabled, setIsGestureEnabled] = useState<boolean>(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeAxis, setActiveAxis] = useState<'X' | 'Y' | 'Z' | null>(null);
  
  const [viewingRotation, setViewingRotation] = useState(0);
  const isRotating = useRef(false);
  const startX = useRef(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handXRef = useRef<number>(0.5);
  const isHandActiveRef = useRef<boolean>(false);
  const lastGestureTime = useRef<number>(0);

  const currentIndexRef = useRef(currentIndex);
  const userImagesRef = useRef(userImages);
  const viewingImageRef = useRef(viewingImage);
  const treeStateRef = useRef(treeState);

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { userImagesRef.current = userImages; }, [userImages]);
  useEffect(() => { viewingImageRef.current = viewingImage; }, [viewingImage]);
  useEffect(() => { treeStateRef.current = treeState; }, [treeState]);

  const startExperience = () => {
    setIsFading(true);
    setTimeout(() => { setShowSplash(false); }, 1200);
  };

  const returnToSplash = () => {
    setIsFading(false);
    setShowSplash(true);
  };

  const toggleState = useCallback(() => {
    setTreeState(prev => prev === TreeMorphState.TREE_SHAPE ? TreeMorphState.SCATTERED : TreeMorphState.TREE_SHAPE);
  }, []);

  const handleGestureStateChange = useCallback((newState: TreeMorphState) => {
    if (newState !== treeStateRef.current) {
      setTreeState(newState);
    }
  }, []);

  const handleGestureAction = useCallback((action: 'VIEW' | 'NEXT' | 'CLOSE') => {
    const images = userImagesRef.current;
    const now = Date.now();
    if (now - lastGestureTime.current < 1000) return; 
    lastGestureTime.current = now;

    if (action === 'NEXT' && images.length > 0) {
      const nextIdx = (currentIndexRef.current + 1) % images.length;
      setCurrentIndex(nextIdx);
      if (viewingImageRef.current) {
        setViewingImage(images[nextIdx]);
        setViewingRotation(0);
      }
    } else if (action === 'VIEW' && images.length > 0) {
      if (!viewingImageRef.current) {
        setViewingImage(images[currentIndexRef.current]);
        setViewingRotation(0);
      }
    } else if (action === 'CLOSE') {
      if (viewingImageRef.current) {
        setViewingImage(null);
      }
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const newImages: string[] = [];
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newImages.push(e.target.result as string);
          if (newImages.length === files.length) {
            setUserImages(prev => [...prev, ...newImages]);
            if (userImages.length === 0) setCurrentIndex(0);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (userImages.length === 0) return;
    let newIdx = direction === 'next' 
      ? (currentIndex + 1) % userImages.length 
      : (currentIndex - 1 + userImages.length) % userImages.length;
    setCurrentIndex(newIdx);
    setViewingImage(userImages[newIdx]);
    setViewingRotation(0);
  };

  const handleDeletePhoto = (url: string) => {
    const idx = userImages.indexOf(url);
    if (idx === -1) return;
    
    const newImages = userImages.filter(img => img !== url);
    setUserImages(newImages);
    
    if (newImages.length === 0) {
      setViewingImage(null);
      setCurrentIndex(0);
    } else {
      // 自动导航到新的位置
      const nextIdx = idx >= newImages.length ? newImages.length - 1 : idx;
      setCurrentIndex(nextIdx);
      setViewingImage(newImages[nextIdx]);
      setViewingRotation(0);
    }
  };

  const handleViewPointerDown = (e: React.PointerEvent) => {
    isRotating.current = true;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleViewPointerMove = (e: React.PointerEvent) => {
    if (!isRotating.current) return;
    const deltaX = e.clientX - startX.current;
    startX.current = e.clientX;
    setViewingRotation(prev => prev + deltaX * 0.5);
  };

  const handleViewPointerUp = (e: React.PointerEvent) => {
    isRotating.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const clearAllPhotos = () => {
    setUserImages([]);
    setShowClearConfirm(false);
  };

  // 坐标轴详细说明
  const axisInfo = {
    X: "聚焦 适婚青年的真实情绪波动，对 “个体在当前婚姻阶段下的主观情绪与意愿” 的捕捉。",
    Y: "不再是 “单身 / 已婚” 的二元划分，而是细化为 “主动单身”“被动单身”“稳定恋爱”“婚姻筹备”“已婚适应”“离异调整” 等更贴合现实的状态。",
    Z: "“ 20-29 岁适婚青年” 的年龄划分，作为垂直主轴贯穿始终，剥离 “年龄 = 必须完成某件事” 的绑架属性。"
  };

  return (
    <div 
      className="relative w-full h-screen text-black overflow-hidden font-['Montserrat']"
      style={{
        backgroundImage: "url('https://file.uhsea.com/2512/c561d2074eb963ef1ab0c38efbca7a84ZR.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      
      {/* Main UI Layer */}
      <div className={`absolute inset-0 z-10 pointer-events-none p-6 flex flex-col justify-between transition-opacity duration-1000 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-4 items-start pointer-events-auto">
            <Logo />
            <div className="flex flex-col gap-3">
              <button onClick={returnToSplash} className="flex items-center justify-center w-12 h-12 bg-white/40 backdrop-blur-md border border-black/5 rounded-full hover:bg-black hover:text-white hover:scale-110 active:scale-95 transition-all duration-500 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center w-12 h-12 bg-white/40 backdrop-blur-md border border-black/5 rounded-full hover:bg-black hover:text-white hover:scale-110 active:scale-95 transition-all duration-500 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept="image/*" className="hidden" />
            </div>
          </div>

          <div className="flex flex-col gap-4 items-end pointer-events-auto">
            <button 
              onClick={() => setIsGestureEnabled(!isGestureEnabled)}
              className={`px-6 py-2 rounded-full border border-black/10 transition-all duration-300 shadow-sm text-xs font-bold tracking-widest uppercase ${isGestureEnabled ? 'bg-neutral-800 text-white border-neutral-800 scale-105' : 'bg-white text-black hover:bg-black/5'}`}
            >
              {isGestureEnabled ? '退出手势' : '开启手势'}
            </button>
            <GestureManager 
              active={isGestureEnabled} 
              onStateChange={handleGestureStateChange}
              onGestureAction={handleGestureAction}
              handXRef={handXRef}
              isHandActiveRef={isHandActiveRef}
            />
          </div>
        </div>

        <div className="flex justify-between items-end pointer-events-auto w-full">
          <div className="flex flex-col gap-4 items-start">
            {userImages.length > 0 && (
              <div className="bg-black/5 px-4 py-2 rounded-full backdrop-blur-sm mb-2 border border-black/5 flex items-center gap-3">
                <span className="text-[10px] font-black tracking-widest text-black/40">
                  {currentIndex + 1} / {userImages.length}
                </span>
                <div className="w-12 h-[1px] bg-black/10"></div>
                <span className="text-[9px] font-bold text-black/20 uppercase tracking-tighter italic">Double click to focus</span>
              </div>
            )}
            
            <button 
              onClick={toggleState}
              className={`px-10 py-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs font-black tracking-[0.3em] uppercase border ${treeState === TreeMorphState.TREE_SHAPE ? 'bg-black text-white border-black' : 'bg-white text-black border-black/10'}`}
            >
              {treeState === TreeMorphState.TREE_SHAPE ? '散开形态 / SCATTER' : '坐标轴形态 / AXIS'}
            </button>
          </div>

          {userImages.length > 0 && (
            <button 
              onClick={() => setShowClearConfirm(true)} 
              className="px-4 py-2 text-[9px] font-bold text-black/30 hover:text-red-500 transition-colors uppercase tracking-[0.2em]"
            >
              清空照片 / RESET
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center pointer-events-auto p-6 animate-in fade-in duration-300">
           <div className="bg-white max-w-sm w-full p-12 rounded-3xl flex flex-col items-center text-center gap-10 shadow-2xl border border-white/20">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-black tracking-[0.3em] uppercase text-black">确认清空所有照片？</h3>
                <p className="text-[10px] font-bold text-black/30 tracking-widest uppercase">This action cannot be undone.</p>
              </div>
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={clearAllPhotos} 
                  className="w-full py-5 bg-black text-white rounded-xl text-[11px] font-black tracking-[0.4em] uppercase hover:bg-neutral-800 transition-all active:scale-95"
                >
                  确认 / CONFIRM
                </button>
                <button 
                  onClick={() => setShowClearConfirm(false)} 
                  className="w-full py-5 bg-white text-black border border-black/10 rounded-xl text-[11px] font-black tracking-[0.4em] uppercase hover:bg-black/5 transition-all active:scale-95"
                >
                  取消 / CANCEL
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Canvas Layer */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-[2000ms] ${showSplash ? 'opacity-0 scale-95 blur-md' : 'opacity-100 scale-100 blur-0'}`}>
        <Suspense fallback={null}>
          <Canvas shadows gl={{ alpha: true }}>
            <Scene 
              treeState={treeState}
              userImages={userImages}
              onPhotoClick={(url) => {
                const idx = userImages.indexOf(url);
                if (idx !== -1) setCurrentIndex(idx);
                setViewingImage(url);
                setViewingRotation(0);
              }}
              handXRef={handXRef}
              isHandActiveRef={isHandActiveRef}
              isDraggingPhoto={isDraggingPhoto}
              setIsDraggingPhoto={setIsDraggingPhoto}
            />
          </Canvas>
          <Loader />
        </Suspense>
      </div>

      {/* Photo Viewer */}
      {viewingImage && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-in fade-in duration-500 overflow-hidden" style={{ perspective: '1200px' }}>
          <div className="absolute inset-0 cursor-zoom-out pointer-events-auto" onClick={() => setViewingImage(null)} />
          
          <button 
            className="absolute left-8 z-[60] p-6 text-black/30 hover:text-black hover:scale-125 transition-all pointer-events-auto hidden md:block"
            onClick={(e) => { e.stopPropagation(); navigatePhoto('prev'); }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>

          <button 
            className="absolute right-8 z-[60] p-6 text-black/30 hover:text-black hover:scale-125 transition-all pointer-events-auto hidden md:block"
            onClick={(e) => { e.stopPropagation(); navigatePhoto('next'); }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>

          <div 
            className="relative group max-w-[90vw] max-h-[90vh] pointer-events-auto animate-in zoom-in-95 duration-500 touch-none select-none cursor-grab active:cursor-grabbing" 
            onClick={e => e.stopPropagation()}
            onPointerDown={handleViewPointerDown}
            onPointerMove={handleViewPointerMove}
            onPointerUp={handleViewPointerUp}
            onPointerCancel={handleViewPointerUp}
            style={{ 
              transform: `rotateY(${viewingRotation}deg)`,
              transformStyle: 'preserve-3d',
              transition: isRotating.current ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
            }}
          >
            <img 
              src={viewingImage} 
              alt="Viewing" 
              className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-sm" 
              draggable={false}
              style={{ filter: 'brightness(1.15)' }}
            />
            
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 flex items-center justify-center gap-4 w-full" style={{ transform: 'translateZ(50px)' }}>
               <button 
                onClick={() => setViewingImage(null)} 
                className="px-10 py-3 bg-black text-white border border-white/10 rounded-full text-[11px] font-black tracking-widest uppercase hover:scale-105 active:scale-95 transition-all shadow-xl"
               >
                 关闭 / CLOSE
               </button>
               
               <button 
                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(viewingImage); }} 
                className="group flex items-center gap-2 px-8 py-3 bg-white/40 backdrop-blur-md text-black/60 border border-black/5 rounded-full text-[11px] font-black tracking-widest uppercase hover:bg-red-600 hover:text-white hover:border-red-600 hover:scale-105 active:scale-95 transition-all shadow-lg"
               >
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:rotate-12">
                   <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                   <line x1="10" y1="11" x2="10" y2="17"></line>
                   <line x1="14" y1="11" x2="14" y2="17"></line>
                 </svg>
                 删除 / REMOVE
               </button>
            </div>
          </div>

          <div className="absolute bottom-10 text-[9px] font-bold text-black/20 uppercase tracking-[0.2em]">
             COORDINATES ILLUSTRATED
          </div>
        </div>
      )}

      {/* Splash Screen Layer */}
      {showSplash && (
        <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-all duration-[1200ms] ${isFading ? 'opacity-0 scale-110 blur-xl pointer-events-none' : 'opacity-100 scale-100 blur-0'}`}>
          
          {/* Axis Labels & Buttons - Bottom Left of Splash Screen */}
          <div className="absolute bottom-10 left-10 flex flex-col gap-6 items-start pointer-events-auto">
            {/* Axis Info Popover */}
            {activeAxis && (
              <div className="max-w-xs bg-white/80 backdrop-blur-xl border border-black/5 p-5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-start mb-2">
                   <span className="text-[10px] font-black text-black/20 uppercase tracking-[0.2em]">{activeAxis}轴说明</span>
                   <button onClick={(e) => { e.stopPropagation(); setActiveAxis(null); }} className="text-black/20 hover:text-black/50 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                   </button>
                </div>
                <p className="text-[11px] font-bold text-black/70 leading-relaxed tracking-wide text-left">
                  {axisInfo[activeAxis]}
                </p>
              </div>
            )}

            {/* Axis Buttons Group */}
            <div className="flex flex-col gap-2.5">
              {[
                { label: "X轴 / 婚姻阶段 Marriage stage", id: 'X' as const },
                { label: "Y轴 / 情感态度 Emotional attitude", id: 'Y' as const },
                { label: "Z轴 / 年龄 Age (垂直)", id: 'Z' as const }
              ].map((axis) => (
                <button 
                  key={axis.id} 
                  onClick={() => setActiveAxis(activeAxis === axis.id ? null : axis.id)}
                  className={`group bg-white/5 backdrop-blur-sm border border-black/5 px-4 py-2.5 rounded-md self-start transition-all hover:bg-white/40 active:scale-95 ${activeAxis === axis.id ? 'bg-white/60 border-black/20 scale-105' : ''}`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-[0.2em] leading-none transition-colors ${activeAxis === axis.id ? 'text-black' : 'text-black/20 group-hover:text-black/40'}`}>
                    {axis.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center max-w-2xl text-center gap-20 px-12">
            <div className="scale-[1.8] mb-8"><Logo /></div>
            <div className="space-y-6">
              <h2 className="text-[11px] font-bold tracking-[0.4em] uppercase text-black/60 leading-relaxed">
                从没有“标准人生”，<br/>而是找到属于自己的平衡。
              </h2>
            </div>
            <button onClick={startExperience} className="group relative px-16 py-6 rounded-full shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] hover:scale-105 transition-all bg-white border border-black/10">
              <div className="relative flex flex-col items-center gap-1.5">
                <span className="text-black text-[13px] font-black tracking-[0.5em] uppercase">开始探索</span>
                <span className="text-black/30 text-[8px] font-bold tracking-[0.7em] uppercase">ENTER</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;