
import React, { useState, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Experience } from './components/Experience';
import { UIOverlay } from './components/UIOverlay';
import { GestureController } from './components/GestureController';
import { TreeMode } from './types';

// Simple Error Boundary to catch 3D resource loading errors (like textures)
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error loading 3D scene:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can customize this fallback UI
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-[#D4AF37] font-serif p-8 text-center">
          <div>
            <h2 className="text-2xl mb-2">Something went wrong</h2>
            <p className="opacity-70">A resource failed to load (likely a missing image). Check the console for details.</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-4 py-2 border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [mode, setMode] = useState<TreeMode>(TreeMode.FORMED);
  const [handPosition, setHandPosition] = useState<{ x: number; y: number; detected: boolean }>({ x: 0.5, y: 0.5, detected: false });
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isLoadingShare, setIsLoadingShare] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);
  const [twoHandsDetected, setTwoHandsDetected] = useState(false);
  const [closestPhoto, setClosestPhoto] = useState<string | null>(null);
  const [cameraMove, setCameraMove] = useState<'forward' | 'backward' | null>(null);
  const [showSnow, setShowSnow] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);

  // Check for share parameter in URL on mount
  useEffect(() => {
    const loadSharedPhotos = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const shareId = urlParams.get('share');

      if (!shareId) return;

      setIsSharedView(true);
      setIsLoadingShare(true);

      try {
        // Try API first (works in vercel dev and production)
        try {
          const response = await fetch(`/api/share?id=${shareId}`);
          const data = await response.json();

          if (response.ok && data.success) {
            setUploadedPhotos(data.images);
            return;
          }
        } catch (apiError) {
          console.log('API not available, trying localStorage fallback');
        }

        // Fallback to localStorage if API fails (pure vite dev mode)
        const shareDataStr = localStorage.getItem(`share_${shareId}`);
        if (shareDataStr) {
          const shareData = JSON.parse(shareDataStr);
          setUploadedPhotos(shareData.images);
        } else {
          console.error('Share not found');
        }
      } catch (error) {
        console.error('Error loading shared photos:', error);
      } finally {
        setIsLoadingShare(false);
      }
    };

    loadSharedPhotos();
  }, []);

  const toggleMode = () => {
    setMode((prev) => (prev === TreeMode.FORMED ? TreeMode.CHAOS : TreeMode.FORMED));
  };

  const handleHandPosition = (x: number, y: number, detected: boolean) => {
    setHandPosition({ x, y, detected });
  };

  const handleTwoHandsDetected = (detected: boolean) => {
    setTwoHandsDetected(detected);
  };

  const handleClosestPhotoChange = (photoUrl: string | null) => {
    setClosestPhoto(photoUrl);
  };

  const handlePhotosUpload = (photos: string[]) => {
    setUploadedPhotos(photos);
  };

  const [photoChangeMessage, setPhotoChangeMessage] = useState<string>('');

  const handlePhotoChange = (direction: 'next' | 'prev') => {
    console.log('[DEBUG] handlePhotoChange called:', direction);
    console.log('[DEBUG] uploadedPhotos.length:', uploadedPhotos.length);
    
    if (uploadedPhotos.length === 0) {
      console.log('[DEBUG] No photos uploaded!');
      setPhotoChangeMessage('⚠️ Chưa có ảnh! Hãy tải ảnh lên trước');
      setTimeout(() => setPhotoChangeMessage(''), 2000);
      return;
    }
    
    setShowPhotoViewer(true);
    
    const newIndex = direction === 'next' 
      ? (currentPhotoIndex + 1) % uploadedPhotos.length
      : (currentPhotoIndex - 1 + uploadedPhotos.length) % uploadedPhotos.length;
    
    console.log('[DEBUG] Photo index:', currentPhotoIndex, '->', newIndex);
    setCurrentPhotoIndex(newIndex);
    
    // Don't show message overlay since Photo Viewer already displays count
    setPhotoChangeMessage('');
    
    // Auto hide after 3 seconds of no activity
    setTimeout(() => {
      setShowPhotoViewer(false);
      setPhotoChangeMessage('');
    }, 3000);
  };

  const handleCameraMove = (direction: 'forward' | 'backward' | null) => {
    setCameraMove(direction);
  };

  const handleSnowToggle = () => {
    setShowSnow(prev => !prev);
  };

  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-black via-[#001a0d] to-[#0a2f1e]">
      <ErrorBoundary>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 4, 20], fov: 45 }}
          gl={{ antialias: false, stencil: false, alpha: false }}
          shadows
        >
          <Suspense fallback={null}>
            <Experience 
              mode={mode} 
              handPosition={handPosition} 
              uploadedPhotos={uploadedPhotos} 
              twoHandsDetected={twoHandsDetected} 
              onClosestPhotoChange={handleClosestPhotoChange}
              cameraMove={cameraMove}
              showSnow={showSnow}
            />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
      
      <Loader 
        containerStyles={{ background: '#000' }} 
        innerStyles={{ width: '300px', height: '10px', background: '#333' }}
        barStyles={{ background: '#D4AF37', height: '10px' }}
        dataStyles={{ color: '#D4AF37', fontFamily: 'Cinzel' }}
      />
      
      <UIOverlay 
        mode={mode} 
        onToggle={toggleMode} 
        onPhotosUpload={handlePhotosUpload} 
        hasPhotos={uploadedPhotos.length > 0}
        uploadedPhotos={uploadedPhotos}
        isSharedView={isSharedView}
      />
      
      {/* Loading indicator for shared photos */}
      {isLoadingShare && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-[#D4AF37] font-serif text-xl">
            Đang tải ảnh được chia sẻ...
          </div>
        </div>
      )}
      
      {/* Gesture Control Module */}
      <GestureController 
        currentMode={mode} 
        onModeChange={setMode} 
        onHandPosition={handleHandPosition} 
        onTwoHandsDetected={handleTwoHandsDetected}
        onPhotoChange={handlePhotoChange}
        onCameraMove={handleCameraMove}
        onSnowToggle={handleSnowToggle}
      />
      
      {/* Photo Overlay - Shows when two hands detected */}
      {twoHandsDetected && uploadedPhotos.length > 0 && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-fade-in">
          {/* Semi-transparent backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          
          {/* Photo viewer with index */}
          <div className="relative z-50 flex flex-col items-center transform transition-all duration-500 ease-out animate-scale-in">
            {/* Photo index indicator */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-[#D4AF37] font-serif text-lg">
                🙌 {currentPhotoIndex + 1} / {uploadedPhotos.length}
              </span>
            </div>
            
            {/* Polaroid container */}
            <div className="bg-white p-4 pb-8 shadow-2xl" style={{ width: '60vmin', maxWidth: '600px' }}>
              {/* Gold clip at top */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-6 bg-gradient-to-b from-[#D4AF37] to-[#C5A028] rounded-sm shadow-lg"></div>
              
              {/* Photo - use currentPhotoIndex */}
              <img 
                src={uploadedPhotos[currentPhotoIndex]} 
                alt={`Photo ${currentPhotoIndex + 1}`}
                className="w-full aspect-square object-cover"
              />
              
              {/* Text label */}
              <div className="text-center mt-4 font-serif text-gray-700 text-sm">
                🤏 Pinch trái/phải để đổi ảnh
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Change Notification - Top center */}
      {photoChangeMessage && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-[100] pointer-events-none animate-pulse">
          <div className="bg-black/80 border border-[#D4AF37] rounded-lg px-4 py-2 text-[#D4AF37] font-medium text-sm shadow-lg">
            {photoChangeMessage}
          </div>
        </div>
      )}

      {/* Photo Viewer - Shows when pinch gesture changes photo */}
      {showPhotoViewer && uploadedPhotos.length > 0 && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          {/* Semi-transparent backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          
          {/* Photo viewer */}
          <div className="relative z-50 flex flex-col items-center">
            {/* Navigation indicators */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-white/50 text-2xl">◀️</span>
              <span className="text-[#D4AF37] font-serif text-lg">
                {currentPhotoIndex + 1} / {uploadedPhotos.length}
              </span>
              <span className="text-white/50 text-2xl">▶️</span>
            </div>
            
            {/* Polaroid container */}
            <div className="bg-white p-4 pb-8 shadow-2xl transition-all duration-300" style={{ width: '50vmin', maxWidth: '500px' }}>
              {/* Gold clip at top */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-6 bg-gradient-to-b from-[#D4AF37] to-[#C5A028] rounded-sm shadow-lg"></div>
              
              {/* Photo */}
              <img 
                src={uploadedPhotos[currentPhotoIndex]} 
                alt={`Photo ${currentPhotoIndex + 1}`} 
                className="w-full aspect-square object-cover"
              />
              
              {/* Text label */}
              <div className="text-center mt-4 font-serif text-gray-700 text-sm">
                🤏 Vuốt trái/phải để đổi ảnh
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
