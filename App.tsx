
import React, { useState, Suspense, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Scene } from './components/Scene';
import { TreeMorphState } from './types';
import { GestureManager } from './components/GestureManager';

function App() {
  const [treeState, setTreeState] = useState<TreeMorphState>(TreeMorphState.TREE_SHAPE);
  const [userImages, setUserImages] = useState<string[]>([]);
  const [photoScale, setPhotoScale] = useState<number>(1.5);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isGestureEnabled, setIsGestureEnabled] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs for high-frequency hand tracking data to avoid re-renders
  const handXRef = useRef<number>(0.5);
  const isHandActiveRef = useRef<boolean>(false);

  const toggleState = useCallback(() => {
    setTreeState(prev => 
      prev === TreeMorphState.TREE_SHAPE 
        ? TreeMorphState.SCATTERED 
        : TreeMorphState.TREE_SHAPE
    );
  }, []);

  const handleGestureStateChange = useCallback((newState: TreeMorphState) => {
    setTreeState(newState);
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
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoClick = (url: string) => {
    setViewingImage(url);
  };

  const closeViewer = () => {
    setViewingImage(null);
  };

  const handleDeletePhoto = () => {
    if (viewingImage) {
      setUserImages(prev => prev.filter(img => img !== viewingImage));
      setViewingImage(null);
    }
  };

  const clearAllPhotos = () => {
    if (window.confirm("确定要清空所有记忆吗？")) {
        setUserImages([]);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        multiple 
        accept="image/*" 
        onChange={handleFileUpload} 
      />

      <GestureManager 
        active={isGestureEnabled} 
        onStateChange={handleGestureStateChange} 
        handXRef={handXRef}
        isHandActiveRef={isHandActiveRef}
      />

      {/* Image Viewer Overlay */}
      {viewingImage && (
        <div 
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300"
          onClick={closeViewer}
        >
          <div 
            className="relative p-1 border border-white/20 bg-black shadow-2xl mb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={viewingImage} 
              alt="Memory" 
              className="max-h-[65vh] max-w-[90vw] object-contain"
            />
          </div>
          
          <div className="flex gap-4" onClick={(e) => e.stopPropagation()}>
             <button
                onClick={handleDeletePhoto}
                className="px-6 py-2 bg-transparent border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 font-bold text-xs tracking-widest"
              >
                删除
              </button>
              <button
                onClick={closeViewer}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white font-bold tracking-widest text-xs border border-white/30 transition-all duration-300"
              >
                关闭
              </button>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <div className="absolute inset-0">
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ 
            antialias: true, 
            toneMapping: 3, 
            toneMappingExposure: 1.2 
          }}
        >
          <Suspense fallback={null}>
            <Scene 
              treeState={treeState} 
              userImages={userImages} 
              photoScale={photoScale} 
              onPhotoClick={handlePhotoClick}
              handXRef={handXRef}
              isHandActiveRef={isHandActiveRef}
            />
          </Suspense>
        </Canvas>
      </div>
      
      {/* Loading Overlay */}
      <Loader 
        containerStyles={{ background: '#000000' }}
        barStyles={{ background: '#ffffff', height: '2px' }}
        dataStyles={{ fontFamily: 'Montserrat', fontSize: '12px', color: '#ffffff', fontWeight: 600 }}
      />

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-6 md:p-12 z-10">
        
        {/* Header / Logo Section */}
        <header className="pointer-events-auto select-none flex justify-between items-start">
          <div className="flex flex-col">
             <h1 className="text-4xl md:text-5xl font-bold tracking-widest text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
               人生坐标
             </h1>
             <span className="text-[10px] md:text-xs tracking-[0.4em] text-white/60 mt-2 pl-1 uppercase font-light">
               Life Coordinates
             </span>
          </div>
          
          <button 
            onClick={() => setIsGestureEnabled(!isGestureEnabled)}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-2 border rounded-full transition-all duration-300
              ${isGestureEnabled ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400' : 'bg-white/5 border-white/20 text-white/60'}`}
          >
            <div className={`w-2 h-2 rounded-full ${isGestureEnabled ? 'bg-cyan-400 animate-pulse' : 'bg-white/40'}`}></div>
            <span className="text-[10px] font-bold tracking-widest uppercase">
              {isGestureEnabled ? '手势已启用' : '手势控制'}
            </span>
          </button>
        </header>

        {/* Center/Bottom Controls */}
        <div className="flex flex-col items-center pointer-events-auto pb-12 gap-6 w-full max-w-md mx-auto">
            
            {/* Scale Control (Visible only if images exist) */}
            {userImages.length > 0 && (
              <div className="flex flex-col items-center w-full gap-2 bg-black/40 backdrop-blur-md p-4 rounded-lg border border-white/10 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between w-full">
                    <label className="text-[10px] font-bold tracking-widest text-white/70 uppercase">
                      照片大小
                    </label>
                    <button 
                        onClick={clearAllPhotos}
                        className="text-[10px] font-bold tracking-widest text-red-500 hover:text-red-400 uppercase underline"
                    >
                        清空图库
                    </button>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="4.0" 
                  step="0.1" 
                  value={photoScale}
                  onChange={(e) => setPhotoScale(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-300"
                />
              </div>
            )}

            {/* Control Buttons Group */}
            <div className="flex space-x-4">
                <button
                  onClick={toggleState}
                  className="group relative px-6 py-3 md:px-8 md:py-3 bg-transparent border border-white/30 hover:border-white overflow-hidden transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="absolute inset-0 w-0 bg-white transition-all duration-[250ms] ease-out group-hover:w-full opacity-10"></div>
                  <span className="relative z-10 text-white font-bold tracking-[0.2em] text-xs">
                    {/* Consistent label: shows the current effect name as requested */}
                    {treeState === TreeMorphState.TREE_SHAPE ? '聚合' : '散开'}
                  </span>
                </button>

                <button
                  onClick={triggerFileUpload}
                  className="group relative px-6 py-3 md:px-8 md:py-3 bg-transparent border border-white/30 hover:border-white overflow-hidden transition-all duration-300 backdrop-blur-sm"
                >
                  <div className="absolute inset-0 w-0 bg-white transition-all duration-[250ms] ease-out group-hover:w-full opacity-10"></div>
                  <span className="relative z-10 text-white font-bold tracking-[0.2em] text-xs">
                    {userImages.length > 0 ? '添加记忆' : '上传记忆'}
                  </span>
                </button>
            </div>
            
            <div className="flex gap-4 mt-2">
                <div className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${treeState === TreeMorphState.TREE_SHAPE ? 'bg-[#00BBFF]' : 'bg-gray-700'}`}></div>
                <div className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${treeState === TreeMorphState.TREE_SHAPE ? 'bg-[#FF00AA]' : 'bg-gray-700'}`}></div>
                <div className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${treeState === TreeMorphState.TREE_SHAPE ? 'bg-[#FFDD00]' : 'bg-gray-700'}`}></div>
            </div>
        </div>

        {/* Footer info */}
        <div className="absolute bottom-4 right-4 md:bottom-10 md:right-10 hidden md:block text-right">
             <div className="flex flex-col items-end space-y-1 text-white/50">
                <span className="text-[10px] font-bold px-2 py-1 tracking-widest border border-white/10">X: 婚姻现状</span>
                <span className="text-[10px] font-bold px-2 py-1 tracking-widest border border-white/10">Y: 情感态度</span>
                <span className="text-[10px] font-bold px-2 py-1 tracking-widest border border-white/10">Z: 年龄</span>
             </div>
        </div>
      </div>
    </div>
  );
}

export default App;
