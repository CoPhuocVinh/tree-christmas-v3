
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { TreeMode } from '../types';

interface GestureControllerProps {
  onModeChange: (mode: TreeMode) => void;
  currentMode: TreeMode;
  onHandPosition?: (x: number, y: number, detected: boolean) => void;
  onTwoHandsDetected?: (detected: boolean) => void;
  onPhotoChange?: (direction: 'next' | 'prev') => void;
  onCameraMove?: (direction: 'forward' | 'backward' | null) => void;
  onSnowToggle?: () => void;
  debugMode?: boolean;
}

export const GestureController: React.FC<GestureControllerProps> = ({ onModeChange, currentMode, onHandPosition, onTwoHandsDetected, onPhotoChange, onCameraMove, onSnowToggle, debugMode = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [gestureStatus, setGestureStatus] = useState<string>("Initializing...");
  const [handPos, setHandPos] = useState<{ x: number; y: number } | null>(null);
  const lastModeRef = useRef<TreeMode>(currentMode);
  
  // Refs to store latest callbacks (to avoid stale closure)
  const onPhotoChangeRef = useRef(onPhotoChange);
  const onCameraMoveRef = useRef(onCameraMove);
  const onSnowToggleRef = useRef(onSnowToggle);
  const onHandPositionRef = useRef(onHandPosition);
  const onTwoHandsDetectedRef = useRef(onTwoHandsDetected);
  
  // Keep refs up to date
  useEffect(() => {
    onPhotoChangeRef.current = onPhotoChange;
    onCameraMoveRef.current = onCameraMove;
    onSnowToggleRef.current = onSnowToggle;
    onHandPositionRef.current = onHandPosition;
    onTwoHandsDetectedRef.current = onTwoHandsDetected;
  }, [onPhotoChange, onCameraMove, onSnowToggle, onHandPosition, onTwoHandsDetected]);
  
  // Debug panel toggle
  const [showDebug, setShowDebug] = useState(true);
  
  // Debug states for UI log
  const [debugInfo, setDebugInfo] = useState({
    handsCount: 0,
    extendedFingers: 0,
    gesture: 'Không có',
    mode: 'FORMED',
    confidence: { open: 0, closed: 0 },
    status: 'Đang khởi tạo...',
    error: ''
  });
  
  // Debounce logic refs
  const openFrames = useRef(0);
  const closedFrames = useRef(0);
  const thumbsUpFrames = useRef(0);
  const thumbsDownFrames = useRef(0);
  const pinchFrames = useRef(0);
  const victoryFrames = useRef(0);
  const lastSnowToggleTime = useRef(0);
  const lastPhotoChangeTime = useRef(0);
  const CONFIDENCE_THRESHOLD = 5; // Number of consecutive frames to confirm gesture
  const PHOTO_CHANGE_COOLDOWN = 500; // ms cooldown between photo changes

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;

    const setupMediaPipe = async () => {
      try {
        setDebugInfo(prev => ({ ...prev, status: '🔄 Đang tải WASM...' }));
        
        // Use jsDelivr CDN (accessible in China)
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        setDebugInfo(prev => ({ ...prev, status: '🔄 Đang tải Model...' }));

        // Use local model file to avoid loading from Google Storage (blocked in China)
        // Model file should be downloaded using: npm run download-model or download-model.bat/.sh
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `/models/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        setDebugInfo(prev => ({ ...prev, status: '✅ Model sẵn sàng' }));
        startWebcam();
      } catch (error: any) {
        console.error("Error initializing MediaPipe:", error);
        console.warn("Gesture control is unavailable. The app will still work without it.");
        setGestureStatus("Gesture control unavailable");
        setDebugInfo(prev => ({ 
          ...prev, 
          status: '❌ Lỗi', 
          error: error?.message || 'Không thể tải MediaPipe'
        }));
        // Don't block the app if gesture control fails
      }
    };

    const startWebcam = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          setDebugInfo(prev => ({ ...prev, status: '🔄 Đang bật Camera...' }));
          
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: "user" }
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", predictWebcam);
            setIsLoaded(true);
            setGestureStatus("Waiting for hand...");
            setDebugInfo(prev => ({ ...prev, status: '✅ Sẵn sàng - Đang nhận diện...' }));
          }
        } catch (err: any) {
          console.error("Error accessing webcam:", err);
          setGestureStatus("Permission Denied");
          setDebugInfo(prev => ({ 
            ...prev, 
            status: '❌ Lỗi Camera', 
            error: err?.message || 'Không có quyền truy cập camera'
          }));
        }
      }
    };

    // Draw a single hand without clearing canvas
    const drawSingleHandSkeleton = (landmarks: any[], ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      // Hand connections (MediaPipe hand model)
      const connections = [
        // Thumb
        [0, 1], [1, 2], [2, 3], [3, 4],
        // Index finger
        [0, 5], [5, 6], [6, 7], [7, 8],
        // Middle finger
        [0, 9], [9, 10], [10, 11], [11, 12],
        // Ring finger
        [0, 13], [13, 14], [14, 15], [15, 16],
        // Pinky
        [0, 17], [17, 18], [18, 19], [19, 20],
        // Palm
        [5, 9], [9, 13], [13, 17]
      ];

      // Draw connections (lines)
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#D4AF37'; // Gold color
      connections.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
        
        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        ctx.stroke();
      });

      // Draw landmarks (points)
      landmarks.forEach((landmark, index) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        
        // Use green for all points
        ctx.fillStyle = '#228B22'; // Forest green color
        ctx.fill();
        
        // Add outline
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
    };

    // Draw all detected hands
    const drawAllHands = (allLandmarks: any[][]) => {
      if (!canvasRef.current || !videoRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to match video
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      // Clear canvas once
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw each hand
      allLandmarks.forEach(landmarks => {
        drawSingleHandSkeleton(landmarks, ctx, canvas);
      });
    };

    const predictWebcam = () => {
      if (!handLandmarker || !videoRef.current) return;

      const startTimeMs = performance.now();
      if (videoRef.current.videoWidth > 0) { // Ensure video is ready
        const result = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

        if (result.landmarks && result.landmarks.length > 0) {
          // Check if two hands are detected
          const twoHandsDetected = result.landmarks.length >= 2;
          
          // Update debug info - hands count
          setDebugInfo(prev => ({ ...prev, handsCount: result.landmarks.length }));
          
          if (onTwoHandsDetectedRef.current) {
            onTwoHandsDetectedRef.current(twoHandsDetected);
          }

          // Draw all detected hands at once
          drawAllHands(result.landmarks);
          
          // Detect gestures from all hands
          detectGesture(result.landmarks, result.handednesses);
        } else {
            setDebugInfo(prev => ({ 
              ...prev, 
              handsCount: 0, 
              extendedFingers: 0, 
              gesture: 'Không có',
              confidence: { open: 0, closed: 0 }
            }));
            setGestureStatus("No hand detected");
            setHandPos(null); // Clear hand position when no hand detected
            if (onHandPositionRef.current) {
              onHandPositionRef.current(0.5, 0.5, false); // No hand detected
            }
            if (onTwoHandsDetectedRef.current) {
              onTwoHandsDetectedRef.current(false);
            }
            // Clear canvas when no hand detected
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }
            }
            // Reset counters if hand is lost? 
            // Better to keep them to prevent flickering if hand blips out for 1 frame
            openFrames.current = Math.max(0, openFrames.current - 1);
            closedFrames.current = Math.max(0, closedFrames.current - 1);
        }
      }

      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    const detectGesture = (allLandmarks: any[][], handednesses?: any[][]) => {
      // Use first hand for main gesture detection
      const landmarks = allLandmarks[0];
      
      // 0 is Wrist
      // Tips: 4 (Thumb), 8 (Index), 12 (Middle), 16 (Ring), 20 (Pinky)
      // Bases (MCP): 1 (Thumb), 5, 9, 13, 17
      
      const wrist = landmarks[0];
      const thumbTip = landmarks[4];
      const thumbBase = landmarks[2];
      const indexTip = landmarks[8];
      const indexBase = landmarks[5];
      const middleTip = landmarks[12];
      const middleBase = landmarks[9];
      const ringTip = landmarks[16];
      const ringBase = landmarks[13];
      const pinkyTip = landmarks[20];
      const pinkyBase = landmarks[17];
      
      // Calculate palm center
      const palmCenterX = (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5;
      const palmCenterY = (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5;
      
      // Send hand position for camera control
      setHandPos({ x: palmCenterX, y: palmCenterY });
      if (onHandPositionRef.current) {
        onHandPositionRef.current(palmCenterX, palmCenterY, true);
      }
      
      // === Check each finger extension ===
      const fingerTips = [indexTip, middleTip, ringTip, pinkyTip];
      const fingerBases = [indexBase, middleBase, ringBase, pinkyBase];
      
      let extendedFingers = 0;
      const fingerStates = [false, false, false, false]; // index, middle, ring, pinky

      for (let i = 0; i < 4; i++) {
        const tip = fingerTips[i];
        const base = fingerBases[i];
        const distTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const distBase = Math.hypot(base.x - wrist.x, base.y - wrist.y);
        
        if (distTip > distBase * 1.5) {
          extendedFingers++;
          fingerStates[i] = true;
        }
      }
      
      // Thumb check
      const distThumbTip = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y);
      const distThumbBase = Math.hypot(thumbBase.x - wrist.x, thumbBase.y - wrist.y);
      const thumbExtended = distThumbTip > distThumbBase * 1.2;
      if (thumbExtended) extendedFingers++;
      
      // === Detect PINCH from ALL hands ===
      // Check each hand for pinch and determine which hand is pinching
      let leftHandPinch = false;
      let rightHandPinch = false;
      
      for (let i = 0; i < allLandmarks.length; i++) {
        const hand = allLandmarks[i];
        const handThumbTip = hand[4];
        const handIndexTip = hand[8];
        const handPalmX = (hand[0].x + hand[5].x + hand[9].x + hand[13].x + hand[17].x) / 5;
        
        const pinchDist = Math.hypot(handThumbTip.x - handIndexTip.x, handThumbTip.y - handIndexTip.y);
        const isHandPinching = pinchDist < 0.05;
        
        if (isHandPinching) {
          // Camera is mirrored:
          // Hand on LEFT side of screen (X < 0.5) = User's RIGHT hand
          // Hand on RIGHT side of screen (X > 0.5) = User's LEFT hand
          if (handPalmX > 0.5) {
            leftHandPinch = true; // User's left hand (right side of mirrored image)
          } else {
            rightHandPinch = true; // User's right hand (left side of mirrored image)
          }
        }
      }
      
      const isPinching = leftHandPinch || rightHandPinch;
      
      // === Detect THUMBS UP/DOWN ===
      const thumbPointingUp = thumbTip.y < thumbBase.y - 0.05;
      const thumbPointingDown = thumbTip.y > thumbBase.y + 0.05;
      const otherFingersClosed = !fingerStates[0] && !fingerStates[1] && !fingerStates[2] && !fingerStates[3];
      
      const isThumbsUp = thumbExtended && thumbPointingUp && otherFingersClosed;
      const isThumbsDown = thumbExtended && thumbPointingDown && otherFingersClosed;
      
      // === Detect VICTORY ✌️ (index + middle extended, others closed) ===
      const isVictory = fingerStates[0] && fingerStates[1] && !fingerStates[2] && !fingerStates[3] && !thumbExtended;
      
      // === DECISION LOGIC ===
      let detectedGesture = 'Không có';
      
      // Priority: Pinch > Thumbs > Wave > Open/Closed
      if (isPinching) {
        pinchFrames.current++;
        thumbsUpFrames.current = 0;
        thumbsDownFrames.current = 0;
        victoryFrames.current = 0;
        openFrames.current = 0;
        closedFrames.current = 0;
        
        const now = Date.now();
        
        if (pinchFrames.current > CONFIDENCE_THRESHOLD && onPhotoChangeRef.current) {
          if (now - lastPhotoChangeTime.current > PHOTO_CHANGE_COOLDOWN) {
            if (leftHandPinch) {
              // Left hand pinch -> Previous photo (swipe left)
              detectedGesture = '🤏 TAY TRÁI ◀️ Ảnh trước';
              console.log('[GESTURE] Calling onPhotoChange: prev');
              onPhotoChangeRef.current('prev');
              lastPhotoChangeTime.current = now;
            } else if (rightHandPinch) {
              // Right hand pinch -> Next photo (swipe right)
              detectedGesture = '🤏 TAY PHẢI ▶️ Ảnh sau';
              console.log('[GESTURE] Calling onPhotoChange: next');
              onPhotoChangeRef.current('next');
              lastPhotoChangeTime.current = now;
            }
          } else {
            detectedGesture = leftHandPinch ? '🤏 TAY TRÁI (Đợi...)' : '🤏 TAY PHẢI (Đợi...)';
          }
        } else {
          detectedGesture = leftHandPinch ? '🤏 TAY TRÁI' : '🤏 TAY PHẢI';
        }
        
      } else if (isThumbsUp) {
        thumbsUpFrames.current++;
        thumbsDownFrames.current = 0;
        pinchFrames.current = 0;
        victoryFrames.current = 0;
        openFrames.current = 0;
        closedFrames.current = 0;
        
        detectedGesture = '👍 THUMBS UP (Tới)';
        
        if (thumbsUpFrames.current > CONFIDENCE_THRESHOLD && onCameraMoveRef.current) {
          onCameraMoveRef.current('forward');
        }
        
      } else if (isThumbsDown) {
        thumbsDownFrames.current++;
        thumbsUpFrames.current = 0;
        pinchFrames.current = 0;
        victoryFrames.current = 0;
        openFrames.current = 0;
        closedFrames.current = 0;
        
        detectedGesture = '👎 THUMBS DOWN (Lùi)';
        
        if (thumbsDownFrames.current > CONFIDENCE_THRESHOLD && onCameraMoveRef.current) {
          onCameraMoveRef.current('backward');
        }
        
      } else if (isVictory) {
        victoryFrames.current++;
        thumbsUpFrames.current = 0;
        thumbsDownFrames.current = 0;
        pinchFrames.current = 0;
        openFrames.current = 0;
        closedFrames.current = 0;
        
        detectedGesture = '✌️ VICTORY (Tuyết)';
        
        // Toggle snow effect (with cooldown)
        const now = Date.now();
        if (victoryFrames.current > CONFIDENCE_THRESHOLD && now - lastSnowToggleTime.current > 2000 && onSnowToggleRef.current) {
          onSnowToggleRef.current();
          lastSnowToggleTime.current = now;
          victoryFrames.current = 0;
        }
        
      } else if (extendedFingers >= 4) {
        openFrames.current++;
        closedFrames.current = 0;
        thumbsUpFrames.current = 0;
        thumbsDownFrames.current = 0;
        pinchFrames.current = 0;
        victoryFrames.current = 0;
        
        detectedGesture = '✋ XÒE TAY';
        
        if (openFrames.current > CONFIDENCE_THRESHOLD) {
          if (lastModeRef.current !== TreeMode.CHAOS) {
            lastModeRef.current = TreeMode.CHAOS;
            onModeChange(TreeMode.CHAOS);
          }
        }
        
        // Clear camera actions
        if (onCameraMoveRef.current) onCameraMoveRef.current(null);
        
      } else if (extendedFingers <= 1 && !thumbExtended) {
        closedFrames.current++;
        openFrames.current = 0;
        thumbsUpFrames.current = 0;
        thumbsDownFrames.current = 0;
        pinchFrames.current = 0;
        victoryFrames.current = 0;
        
        detectedGesture = '✊ NẮM TAY';
        
        if (closedFrames.current > CONFIDENCE_THRESHOLD) {
          if (lastModeRef.current !== TreeMode.FORMED) {
            lastModeRef.current = TreeMode.FORMED;
            onModeChange(TreeMode.FORMED);
          }
        }
        
        // Clear camera actions
        if (onCameraMoveRef.current) onCameraMoveRef.current(null);
        
      } else {
        detectedGesture = '🤔 Không rõ';
        openFrames.current = 0;
        closedFrames.current = 0;
        thumbsUpFrames.current = 0;
        thumbsDownFrames.current = 0;
        pinchFrames.current = 0;
        victoryFrames.current = 0;
        
        // Clear camera actions
        if (onCameraMoveRef.current) onCameraMoveRef.current(null);
      }
      
      // Update debug info
      setGestureStatus(`Detected: ${detectedGesture}`);
      setDebugInfo(prev => ({
        ...prev,
        extendedFingers,
        gesture: detectedGesture,
        confidence: { 
          open: openFrames.current, 
          closed: closedFrames.current 
        },
        mode: openFrames.current > CONFIDENCE_THRESHOLD ? 'HỖN LOẠN' : 
              closedFrames.current > CONFIDENCE_THRESHOLD ? 'HOÀN CHỈNH' : prev.mode
      }));
    };

    setupMediaPipe();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (handLandmarker) handLandmarker.close();
    };
  }, [onModeChange]);

  // Sync ref with prop updates to prevent overriding in closure
  useEffect(() => {
    lastModeRef.current = currentMode;
  }, [currentMode]);

  return (
    <div className={`absolute top-6 right-[8%] z-50 flex flex-col items-end pointer-events-none ${!debugMode ? 'opacity-0 pointer-events-none w-0 h-0 overflow-hidden' : ''}`}>
      {/* Camera Preview Frame - Always rendered for gesture detection, hidden when debugMode is OFF */}
      <div className={`relative border-2 border-[#D4AF37] rounded-lg overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.3)] bg-black ${
        debugMode ? 'w-[18.75vw] h-[14.0625vw]' : 'w-1 h-1 absolute -top-[9999px]'
      }`}>
        {debugMode && (
          <div className="absolute inset-0 border border-[#F5E6BF]/20 m-1 rounded-sm z-10"></div>
        )}
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* Canvas for hand skeleton overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none z-20"
        />
        
        {/* Hand Position Indicator */}
        {debugMode && handPos && (
          <div 
            className="absolute w-2 h-2 bg-[#D4AF37] rounded-full border border-white"
            style={{
              left: `${(1 - handPos.x) * 100}%`,
              top: `${handPos.y * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}
      </div>

      {/* Toggle Debug Button - Only when debugMode ON */}
      {debugMode && (
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="mt-2 px-3 py-1.5 bg-black/70 border border-[#D4AF37]/50 rounded-lg text-[10px] font-mono text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors pointer-events-auto"
        >
          {showDebug ? '🔽 Ẩn Debug' : '🔼 Hiện Debug'}
        </button>
      )}

      {/* Debug Info Panel */}
      {debugMode && showDebug && (
        <div className="mt-2 bg-black/80 backdrop-blur-md border border-[#D4AF37]/50 rounded-lg p-3 text-xs font-mono min-w-[200px]">
          <div className="text-[#D4AF37] font-bold mb-2 text-center border-b border-[#D4AF37]/30 pb-1">
            🎄 Theo Dõi Cử Chỉ
          </div>
          
          {/* Status */}
          <div className="flex justify-between items-center mb-1">
            <span className="text-[#F5E6BF]/70">Trạng thái:</span>
            <span className={`font-bold text-[10px] ${
              debugInfo.status.includes('✅') ? 'text-green-400' : 
              debugInfo.status.includes('❌') ? 'text-red-400' : 
              'text-yellow-400'
            }`}>
              {debugInfo.status}
            </span>
          </div>
          
          {/* Error (if any) */}
          {debugInfo.error && (
            <div className="mb-2 p-1 bg-red-500/20 rounded text-[9px] text-red-300 break-words">
              {debugInfo.error}
            </div>
          )}
          
          {/* Hands Count */}
          <div className="flex justify-between items-center mb-1">
            <span className="text-[#F5E6BF]/70">Số tay:</span>
            <span className={`font-bold ${debugInfo.handsCount >= 2 ? 'text-green-400' : debugInfo.handsCount === 1 ? 'text-yellow-400' : 'text-red-400'}`}>
              {debugInfo.handsCount === 0 ? '❌ 0' : debugInfo.handsCount === 1 ? '☝️ 1' : '🙌 2'}
            </span>
          </div>
          
          {/* Extended Fingers */}
          <div className="flex justify-between items-center mb-1">
            <span className="text-[#F5E6BF]/70">Ngón duỗi:</span>
            <span className="text-[#D4AF37] font-bold">
              {debugInfo.extendedFingers}/5
            </span>
          </div>
          
          {/* Detected Gesture */}
          <div className="flex justify-between items-center mb-1">
            <span className="text-[#F5E6BF]/70">Cử chỉ:</span>
            <span className={`font-bold ${
              debugInfo.gesture.includes('XÒE') ? 'text-orange-400' : 
              debugInfo.gesture.includes('NẮM') ? 'text-cyan-400' : 
              'text-gray-400'
            }`}>
              {debugInfo.gesture}
            </span>
          </div>
          
          {/* Confidence */}
          <div className="flex justify-between items-center mb-1">
            <span className="text-[#F5E6BF]/70">Độ tin cậy:</span>
            <div className="flex gap-2 text-[10px]">
              <span className="text-orange-400">Xòe:{debugInfo.confidence.open}</span>
              <span className="text-cyan-400">Nắm:{debugInfo.confidence.closed}</span>
            </div>
          </div>
          
          {/* Current Mode */}
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-[#D4AF37]/30">
            <span className="text-[#F5E6BF]/70">Chế độ:</span>
            <span className={`font-bold px-2 py-0.5 rounded ${
              debugInfo.mode === 'HỖN LOẠN' 
                ? 'bg-orange-500/20 text-orange-400' 
                : 'bg-green-500/20 text-green-400'
            }`}>
              {debugInfo.mode === 'HỖN LOẠN' ? '💥 HỖN LOẠN' : '🎄 HOÀN CHỈNH'}
            </span>
          </div>
          
          {/* Hand Position */}
          {handPos && (
            <div className="flex justify-between items-center mt-1 text-[10px]">
              <span className="text-[#F5E6BF]/50">Vị trí:</span>
              <span className="text-[#D4AF37]/70">
                X:{handPos.x.toFixed(2)} Y:{handPos.y.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
