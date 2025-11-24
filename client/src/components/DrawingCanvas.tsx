import { useEffect, useRef, useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { PredictResponse } from "@shared/schema";
import Footer from "@/components/Footer";
import EventHeader from "@/components/EventHeader";
import MatrixBackground from "@/components/MatrixBackground";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";
import { CATEGORY_NAMES } from "@shared/categories";
import { useIsMobile } from "@/hooks/use-mobile";
import type { User } from "@shared/types";

interface DrawingCanvasProps {
  targetClass: string;
  user: User | null; // 사용자 정보 추가
  onComplete: (result: {
    predictedClass: string;
    confidence: number;
    drawingTime: number;
    success: boolean;
    drawingImage?: string | null;
  }) => void;
}

const MIN_DISTANCE = 12;
const MIN_TIME_INTERVAL = 30;
const STROKE_TIMEOUT = 200;
const PREDICTION_THRESHOLD = 0.8;
const COUNTDOWN_SECONDS = 20;

const CLASS_NAMES = CATEGORY_NAMES;

export default function DrawingCanvas({ targetClass, user, onComplete }: DrawingCanvasProps) {
  const isMobile = useIsMobile(); // 모바일 레이아웃 감지
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState<number[][][]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number[]; y: number[] } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [lastRecordedX, setLastRecordedX] = useState<number | null>(null);
  const [lastRecordedY, setLastRecordedY] = useState<number | null>(null);
  const [lastRecordedTime, setLastRecordedTime] = useState<number | null>(null);
  const [lastStrokeTime, setLastStrokeTime] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false); // 완료 상태 추적 (UI용)
  const isCompletedRef = useRef(false); // 완료 상태 추적 (실제 로직용 - 클로저 문제 해결)
  const predictionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [realtimePrediction, setRealtimePrediction] = useState<{
    predictedClass: string;
    confidence: number;
  } | null>(null); // 실시간 예측 결과

  // 카운트다운 및 시간 측정
  useEffect(() => {
    if (startTime === null) {
      setStartTime(Date.now());
    }

    // 이미 완료되었으면 카운트다운 중지
    if (isCompletedRef.current) {
      return;
    }

    if (countdown === 0) {
      // 카운트다운이 0이 되는 시점의 시간 측정
      const endTime = Date.now();
      const actualTime = startTime ? (endTime - startTime) / 1000 : COUNTDOWN_SECONDS;
      
      // handleComplete에 실제 시간 전달을 위해 수정 필요
      handleComplete(actualTime);
      return;
    }

    const timer = setInterval(() => {
      // 완료되었는지 다시 확인
      if (isCompletedRef.current) {
        clearInterval(timer);
        return;
      }
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, startTime]);

  // 실시간 예측 (디바운싱)
  const predictDrawing = useCallback(async (drawingData: number[][][]) => {
    if (drawingData.length === 0 || isCompletedRef.current) return; // 이미 완료되었으면 예측 중지

    // 이전 예측 취소
    if (predictionTimeoutRef.current) {
      clearTimeout(predictionTimeoutRef.current);
    }

    // 100ms 후 예측 실행 (디바운싱 - 모델이 메모리에 있어서 더 빠르게)
    predictionTimeoutRef.current = setTimeout(async () => {
      // 예측 중에 완료되었는지 다시 확인 (useRef 사용으로 최신 값 보장)
      if (isCompletedRef.current) return;

      try {
        const normalized = normalizeDrawing(drawingData);
        const response = await apiRequest("POST", "/api/predict", {
          drawing: normalized,
          // 사용자 정보 (로그용, 선택적)
          user: user ? {
            company: user.company,
            employeeId: user.employeeId,
            name: user.name,
            department: user.department,
          } : undefined,
        });

        const result = await response.json() as PredictResponse;

        // 실시간 예측 결과 표시
        setRealtimePrediction({
          predictedClass: result.predictedClass,
          confidence: result.confidence,
        });

        // 80% 이상 정확도로 맞췄는지 확인
        if (
          result.predictedClass === targetClass &&
          result.confidence >= PREDICTION_THRESHOLD
        ) {
          // 완료 상태로 설정 (카운트다운 중지 및 추가 예측 방지)
          isCompletedRef.current = true; // useRef 먼저 업데이트
          setIsCompleted(true); // UI 상태 업데이트
          
          // 이전 예측 취소
          if (predictionTimeoutRef.current) {
            clearTimeout(predictionTimeoutRef.current);
          }

          // 실제 그림 그리기 시작 시간부터 현재까지의 시간 측정
          const drawingTime = startTime ? (Date.now() - startTime) / 1000 : 0;
          
          // 정확도 값 정규화 (0-1 범위 보장)
          const finalConfidence = Math.min(1.0, Math.max(0.0, result.confidence));
          
          // canvas를 이미지로 변환
          const canvas = canvasRef.current;
          const drawingImage = canvas ? canvas.toDataURL('image/png') : null;
          
          // 즉시 화면 전환 (80% threshold를 넘긴 시점의 그림 사용)
          setRealtimePrediction(null); // 실시간 예측 메시지 제거
          onComplete({
            predictedClass: result.predictedClass,
            confidence: finalConfidence,
            drawingTime,
            success: true,
            drawingImage,
          });
        }
      } catch (error) {
        console.error("예측 실패:", error);
      }
    }, 300);
  }, [targetClass, startTime, onComplete, user]);

  // 그림 정규화 함수
  const normalizeDrawing = (drawing: number[][][]): number[][][] => {
    if (drawing.length === 0) return drawing;

    // 다운샘플링
    const downsampled = drawing.map((stroke) => {
      if (stroke[0].length <= 30) return stroke;
      const x = stroke[0];
      const y = stroke[1];
      const step = Math.ceil(x.length / 30);
      const downsampledX: number[] = [x[0]];
      const downsampledY: number[] = [y[0]];

      for (let i = step; i < x.length - 1; i += step) {
        downsampledX.push(x[i]);
        downsampledY.push(y[i]);
      }

      downsampledX.push(x[x.length - 1]);
      downsampledY.push(y[y.length - 1]);

      return [downsampledX, downsampledY];
    });

    // 모든 좌표 수집
    let allX: number[] = [];
    let allY: number[] = [];
    for (const stroke of downsampled) {
      allX = allX.concat(stroke[0]);
      allY = allY.concat(stroke[1]);
    }

    if (allX.length === 0) return drawing;

    // 범위 계산
    const xMin = Math.min(...allX);
    const xMax = Math.max(...allX);
    const yMin = Math.min(...allY);
    const yMax = Math.max(...allY);

    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    // 정규화
    const normalized: number[][][] = [];
    for (const stroke of downsampled) {
      const normX = stroke[0].map((x) => Math.round(((x - xMin) / xRange) * 255));
      const normY = stroke[1].map((y) => Math.round(((y - yMin) / yRange) * 255));
      normalized.push([normX, normY]);
    }

    return normalized;
  };

  // 완료 처리 (20초가 지났거나 수동 완료 시)
  const handleComplete = async (providedTime?: number) => {
    // 이미 완료되었으면 중복 실행 방지
    if (isCompletedRef.current) return;
    
    isCompletedRef.current = true; // useRef 먼저 업데이트
    setIsCompleted(true); // UI 상태 업데이트

    if (predictionTimeoutRef.current) {
      clearTimeout(predictionTimeoutRef.current);
    }

    const finalDrawing = currentStroke
      ? [...drawing, [currentStroke.x, currentStroke.y]]
      : drawing;

    // 시간 측정: 제공된 시간이 있으면 사용, 없으면 현재 시간 기준
    const drawingTime = providedTime !== undefined 
      ? providedTime 
      : (startTime ? (Date.now() - startTime) / 1000 : COUNTDOWN_SECONDS);

    if (finalDrawing.length === 0) {
      const canvas = canvasRef.current;
      const drawingImage = canvas ? canvas.toDataURL('image/png') : null;
      onComplete({
        predictedClass: "",
        confidence: 0,
        drawingTime,
        success: false,
        drawingImage,
      });
      return;
    }

    try {
      const normalized = normalizeDrawing(finalDrawing);
      const response = await apiRequest("POST", "/api/predict", {
        drawing: normalized,
        // 사용자 정보 (로그용, 선택적)
        user: user ? {
          company: user.company,
          employeeId: user.employeeId,
          name: user.name,
          department: user.department,
        } : undefined,
      });

      const result = await response.json() as PredictResponse;
      
      // 정확도 값 정규화 (0-1 범위 보장)
      // ONNX 출력은 이미 확률이므로 그대로 사용하되, 범위 체크
      const finalConfidence = Math.min(1.0, Math.max(0.0, result.confidence));

      // canvas를 이미지로 변환
      const canvas = canvasRef.current;
      const drawingImage = canvas ? canvas.toDataURL('image/png') : null;

      onComplete({
        predictedClass: result.predictedClass,
        confidence: finalConfidence,
        drawingTime,
        success: result.predictedClass === targetClass && finalConfidence >= PREDICTION_THRESHOLD,
        drawingImage,
      });
    } catch (error) {
      console.error("예측 실패:", error);
      const canvas = canvasRef.current;
      const drawingImage = canvas ? canvas.toDataURL('image/png') : null;
      onComplete({
        predictedClass: "",
        confidence: 0,
        drawingTime,
        success: false,
        drawingImage,
      });
    }
  };

  // 좌표 가져오기 (마우스/터치 공통)
  const getCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // 그리기 시작 (마우스/터치 공통)
  const startDrawing = (x: number, y: number) => {
    if (countdown === 0 || isCompletedRef.current) return;

    // 이전 스트로크가 일정 시간 지나면 자동으로 끊기
    if (lastStrokeTime && Date.now() - lastStrokeTime > STROKE_TIMEOUT && currentStroke) {
      setDrawing((prev) => [...prev, [currentStroke.x, currentStroke.y]]);
      setCurrentStroke(null);
    }

    setIsDrawing(true);
    const newStroke = { x: [x], y: [y] };
    setCurrentStroke(newStroke);
    setLastRecordedX(x);
    setLastRecordedY(y);
    setLastRecordedTime(Date.now());
    setLastStrokeTime(Date.now());

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  // 마우스 다운
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e.clientX, e.clientY);
    if (coords) {
      startDrawing(coords.x, coords.y);
    }
  };

  // 터치 시작
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // 스크롤 방지
    e.stopPropagation(); // 이벤트 전파 방지
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const coords = getCoordinates(touch.clientX, touch.clientY);
    if (coords) {
      startDrawing(coords.x, coords.y);
    }
  };

  // 그리기 이동 (마우스/터치 공통)
  const moveDrawing = (x: number, y: number) => {
    if (!isDrawing || !currentStroke || countdown === 0 || isCompletedRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const currentTime = Date.now();

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // 포인트 기록 조건 확인
    let shouldRecord = false;
    if (lastRecordedX === null || lastRecordedY === null || lastRecordedTime === null) {
      shouldRecord = true;
    } else {
      const distance = Math.sqrt(
        Math.pow(x - lastRecordedX, 2) + Math.pow(y - lastRecordedY, 2)
      );
      const timeElapsed = currentTime - lastRecordedTime;

      if (distance >= MIN_DISTANCE && timeElapsed >= MIN_TIME_INTERVAL) {
        shouldRecord = true;
      }
    }

    if (shouldRecord) {
      setCurrentStroke((prev) => {
        if (!prev) return null;
        const updated = { x: [...prev.x, x], y: [...prev.y, y] };
        
        // 실시간 예측 (현재까지의 그림 포함)
        const currentDrawing = [...drawing];
        predictDrawing([...currentDrawing, [updated.x, updated.y]]);
        
        return updated;
      });
      setLastRecordedX(x);
      setLastRecordedY(y);
      setLastRecordedTime(currentTime);
      setLastStrokeTime(currentTime);
    }
  };

  // 마우스 이동
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e.clientX, e.clientY);
    if (coords) {
      moveDrawing(coords.x, coords.y);
    }
  };

  // 터치 이동
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // 스크롤 방지
    e.stopPropagation(); // 이벤트 전파 방지
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const coords = getCoordinates(touch.clientX, touch.clientY);
    if (coords) {
      moveDrawing(coords.x, coords.y);
    }
  };

  // 그리기 종료 (마우스/터치 공통)
  const endDrawing = () => {
    if (isDrawing && currentStroke) {
      const newDrawing = [...drawing, [currentStroke.x, currentStroke.y]];
      setDrawing(newDrawing);
      setCurrentStroke(null);
      setLastRecordedX(null);
      setLastRecordedY(null);
      setLastRecordedTime(null);

      // 예측 실행
      predictDrawing(newDrawing);
    }
    setIsDrawing(false);
  };

  // 마우스 업
  const handleMouseUp = () => {
    endDrawing();
  };

  // 터치 종료
  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation(); // 이벤트 전파 방지
    endDrawing();
  };

  // 지우개 기능: 모든 그림 지우기
  const handleClear = () => {
    if (isCompletedRef.current) return; // 완료되었으면 지우기 불가
    
    // drawing 상태 초기화
    setDrawing([]);
    setCurrentStroke(null);
    setLastRecordedX(null);
    setLastRecordedY(null);
    setLastRecordedTime(null);
    setIsDrawing(false);
    setRealtimePrediction(null); // 실시간 예측 메시지도 초기화
    
    // canvas 지우기
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  };

  // 캔버스 초기화 및 크기 조정
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // iOS Safari 호환성을 위한 터치 이벤트 리스너 추가
    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    // 모바일/데스크톱에 따라 캔버스 크기 조정
    if (isMobile) {
      // 모바일: 화면 크기에 맞게 조정 (최대 너비 90%, 비율 유지)
      const maxWidth = Math.min(window.innerWidth * 0.9, 400);
      const maxHeight = Math.min(window.innerHeight * 0.5, 300);
      canvas.width = maxWidth;
      canvas.height = maxHeight;
      canvas.style.width = `${maxWidth}px`;
      canvas.style.height = `${maxHeight}px`;
    } else {
      // 데스크톱: 고정 크기
      canvas.width = 800;
      canvas.height = 600;
      canvas.style.width = "800px";
      canvas.style.height = "600px";
    }

    // iOS Safari 호환성을 위한 터치 이벤트 리스너 (passive: false로 설정)
    canvas.addEventListener('touchstart', preventScroll, { passive: false });
    canvas.addEventListener('touchmove', preventScroll, { passive: false });
    canvas.addEventListener('touchend', preventScroll, { passive: false });
    canvas.addEventListener('touchcancel', preventScroll, { passive: false });

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "black";
    ctx.lineWidth = isMobile ? 3 : 2; // 모바일에서는 조금 더 두껍게
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    return () => {
      // 클린업: 이벤트 리스너 제거
      canvas.removeEventListener('touchstart', preventScroll);
      canvas.removeEventListener('touchmove', preventScroll);
      canvas.removeEventListener('touchend', preventScroll);
      canvas.removeEventListener('touchcancel', preventScroll);
    };
  }, [isMobile]);

  return (
    <div className="h-screen flex flex-col bg-black relative overflow-hidden">
      <MatrixBackground color="#26bfa6" opacity={0.2} />
      <div className="relative z-10">
        <EventHeader />
      </div>
      <div className={`flex-1 flex items-center justify-center ${isMobile ? 'p-3 pt-20' : 'p-4'} relative z-10`}>
        <div className={`w-full ${isMobile ? 'max-w-md' : 'max-w-6xl'}`}>
          {/* 카운트다운 표시 */}
          <div className={`text-center ${isMobile ? 'mb-3' : 'mb-4'}`}>
            <div className={`${isMobile ? 'text-4xl' : 'text-6xl'} font-bold text-white ${isMobile ? 'mb-1' : 'mb-2'}`}>
              {countdown}초
            </div>
            <div className={`${isMobile ? 'text-base' : 'text-2xl'} text-gray-300`}>
              그려야 할 그림: <span className="text-primary font-bold">{CLASS_NAMES[targetClass] || targetClass}</span>
            </div>
          </div>

          {/* 지우개 버튼 */}
          <div className={`flex justify-center ${isMobile ? 'mb-3' : 'mb-4'}`}>
            <Button
              onClick={handleClear}
              variant="default"
              size={isMobile ? "default" : "lg"}
              className={`${isMobile ? 'h-10 px-4 text-sm' : 'h-12 px-6 text-lg'} font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg ${isMobile ? 'w-full' : ''}`}
              disabled={isCompletedRef.current || countdown === 0}
            >
              <Eraser className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} mr-2`} />
              지우개
            </Button>
          </div>

          {/* 캔버스 */}
          <div className="flex justify-center" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              className={`${isMobile ? 'border-2' : 'border-4'} border-primary rounded-lg ${isMobile ? '' : 'cursor-crosshair'} bg-white`}
              style={{ touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            />
          </div>

          {/* 실시간 예측 결과 표시 */}
          {realtimePrediction && !isCompletedRef.current && (
            <div className={`${isMobile ? 'mt-4' : 'mt-6'} flex justify-center`}>
              <div className={`bg-gray-900/95 border border-primary/30 rounded-xl ${isMobile ? 'px-4 py-3' : 'px-6 py-4'} shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300`}>
                {realtimePrediction.confidence === 0 || Math.round(realtimePrediction.confidence * 100) === 0 ? (
                  <p className={`${isMobile ? 'text-sm' : 'text-xl'} text-gray-400 text-center`}>
                    이게 뭔지 모르겠어요...
                  </p>
                ) : (
                  <p className={`${isMobile ? 'text-sm' : 'text-xl'} text-white text-center`}>
                    아 지금{" "}
                    <span className="text-primary font-bold">
                      {CLASS_NAMES[realtimePrediction.predictedClass] || realtimePrediction.predictedClass}
                    </span>
                    와{" "}
                    <span className="text-primary font-bold">
                      {Math.round(realtimePrediction.confidence * 100)}%
                    </span>
                    비슷하네요
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

