import { useEffect, useRef, useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { PredictResponse } from "@shared/schema";
import Footer from "@/components/Footer";
import EventHeader from "@/components/EventHeader";
import MatrixBackground from "@/components/MatrixBackground";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface DrawingCanvasProps {
  targetClass: string;
  onComplete: (result: {
    predictedClass: string;
    confidence: number;
    drawingTime: number;
    success: boolean;
  }) => void;
}

const MIN_DISTANCE = 12;
const MIN_TIME_INTERVAL = 30;
const STROKE_TIMEOUT = 200;
const PREDICTION_THRESHOLD = 0.8;
const COUNTDOWN_SECONDS = 20;

export default function DrawingCanvas({ targetClass, onComplete }: DrawingCanvasProps) {
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
        });

        const result = await response.json() as PredictResponse;

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
          
          // 즉시 화면 전환 (80% threshold를 넘긴 시점의 그림 사용)
          onComplete({
            predictedClass: result.predictedClass,
            confidence: finalConfidence,
            drawingTime,
            success: true,
          });
        }
      } catch (error) {
        console.error("예측 실패:", error);
      }
    }, 300);
  }, [targetClass, startTime, onComplete]);

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
      onComplete({
        predictedClass: "",
        confidence: 0,
        drawingTime,
        success: false,
      });
      return;
    }

    try {
      const normalized = normalizeDrawing(finalDrawing);
      const response = await apiRequest("POST", "/api/predict", {
        drawing: normalized,
      });

      const result = await response.json() as PredictResponse;
      
      // 정확도 값 정규화 (0-1 범위 보장)
      // ONNX 출력은 이미 확률이므로 그대로 사용하되, 범위 체크
      const finalConfidence = Math.min(1.0, Math.max(0.0, result.confidence));

      onComplete({
        predictedClass: result.predictedClass,
        confidence: finalConfidence,
        drawingTime,
        success: result.predictedClass === targetClass && finalConfidence >= PREDICTION_THRESHOLD,
      });
    } catch (error) {
      console.error("예측 실패:", error);
      onComplete({
        predictedClass: "",
        confidence: 0,
        drawingTime,
        success: false,
      });
    }
  };

  // 마우스 다운
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (countdown === 0 || isCompletedRef.current) return; // 완료되었으면 그리기 중지

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  // 마우스 이동
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke || countdown === 0 || isCompletedRef.current) return; // 완료되었으면 그리기 중지

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
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

  // 마우스 업
  const handleMouseUp = () => {
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

  // 캔버스 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  return (
    <div className="h-screen flex flex-col bg-black relative overflow-hidden">
      <MatrixBackground color="#26bfa6" opacity={0.2} />
      <div className="relative z-10">
        <EventHeader />
      </div>
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-6xl">
          {/* 카운트다운 표시 */}
          <div className="text-center mb-4">
            <div className="text-6xl font-bold text-white mb-2">
              {countdown}초
            </div>
            <div className="text-2xl text-gray-300">
              그려야 할 그림: <span className="text-primary font-bold">{targetClass}</span>
            </div>
          </div>

          {/* 지우개 버튼 */}
          <div className="flex justify-center mb-4">
            <Button
              onClick={handleClear}
              variant="default"
              size="lg"
              className="h-12 px-6 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
              disabled={isCompletedRef.current || countdown === 0}
            >
              <Eraser className="w-5 h-5 mr-2" />
              지우개
            </Button>
          </div>

          {/* 캔버스 */}
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="border-4 border-primary rounded-lg cursor-crosshair bg-white"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>
      </div>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

