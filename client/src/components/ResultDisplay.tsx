import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Home } from "lucide-react";
import Footer from "@/components/Footer";
import EventHeader from "@/components/EventHeader";
import MatrixBackground from "@/components/MatrixBackground";
import { useSuccessConfetti } from "@/hooks/useSuccessConfetti";

interface ResultDisplayProps {
  targetClass: string;
  predictedClass: string;
  confidence: number;
  drawingTime: number;
  success: boolean;
  onReset: () => void;
}

const CLASS_NAMES: Record<string, string> = {
  cat: "고양이",
  dog: "강아지",
  airplane: "비행기",
  car: "자동차",
  bird: "새",
};

const MAX_DRAWING_TIME = 20; // 최대 그림 그리기 시간 (초)

export default function ResultDisplay({
  targetClass,
  predictedClass,
  confidence,
  drawingTime,
  success,
  onReset,
}: ResultDisplayProps) {
  // 성공 시 폭죽 효과
  useSuccessConfetti(success);

  return (
    <div 
      className={`h-screen flex flex-col bg-black relative overflow-hidden ${
        !success ? 'animate-screen-shake' : ''
      }`}
    >
      <MatrixBackground color="#26bfa6" opacity={0.2} density={0.4} />
      <div className="relative z-10">
        <EventHeader />
      </div>
      <div className="flex-1 flex items-center justify-center overflow-y-auto p-4 relative z-10">
        <div className="w-full max-w-5xl">
          {/* 상단: 아이콘, 메시지 */}
          <div className="text-center space-y-3 pt-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mx-auto">
              <Sparkles className="w-14 h-14 text-primary" />
            </div>
            <div className="space-y-3">
              {/* 결과 메시지 */}
              <div className="mt-4">
                <h1
                  className={`text-5xl font-bold ${
                    success
                      ? "text-primary"
                      : "text-gray-400"
                  }`}
                >
                  {success ? "성공!" : "실패"}
                </h1>
              </div>
            </div>
          </div>

          {/* 중앙: 결과 정보 */}
          <div className="flex flex-col items-center gap-6 mt-6 mb-4">
            <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
              <Card className="border-2 border-gray-700 bg-gray-900/90">
                <div className="pt-6 pb-6 text-center space-y-3">
                  <p className="text-3xl text-gray-300">목표 그림</p>
                  <p className="text-5xl font-bold text-white">
                    {CLASS_NAMES[targetClass] || targetClass}
                  </p>
                </div>
              </Card>
              <Card className="border-2 border-primary/30 bg-gray-900/90">
                <div className="pt-6 pb-6 text-center space-y-3">
                  <p className="text-3xl text-gray-300">예측 결과</p>
                  <p className="text-5xl font-bold text-primary">
                    {CLASS_NAMES[predictedClass] || predictedClass}
                  </p>
                </div>
              </Card>
            </div>

            {/* 예측 유사도 및 시간 */}
            <div className="grid grid-cols-2 gap-6 w-full max-w-2xl mt-4">
              <Card className="border-2 border-gray-700 bg-gray-900/90">
                <div className="pt-6 pb-6 text-center space-y-3">
        
                  <div className="space-y-2">
                    <p className="text-3xl font-bold text-white">
                      {CLASS_NAMES[predictedClass] || predictedClass}와
                    </p>
                    <p className="text-5xl font-bold text-primary">
                      {(confidence * 100).toFixed(1)}% 유사
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="border-2 border-gray-700 bg-gray-900/90">
                <div className="pt-6 pb-6 text-center space-y-3">
                  <p className="text-3xl text-gray-300">소요 시간</p>
                  <p className="text-5xl font-bold text-white">
                    {Math.min(drawingTime, MAX_DRAWING_TIME).toFixed(1)}초
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* 하단: 버튼 */}
          <div className="space-y-4 mt-4">
            <div className="flex justify-center pb-2">
              <Button
                onClick={onReset}
                variant="default"
                size="lg"
                className="h-14 px-14 text-xl font-semibold shadow-lg"
              >
                <Home className="w-6 h-6 mr-2" />
                처음으로
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

