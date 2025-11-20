import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Footer from "@/components/Footer";
import EventHeader from "@/components/EventHeader";
import MatrixBackground from "@/components/MatrixBackground";

interface DrawingGuideProps {
  onStart: () => void;
}

export default function DrawingGuide({ onStart }: DrawingGuideProps) {
  return (
    <div className="h-screen flex flex-col bg-black relative overflow-hidden">
      <MatrixBackground color="#26bfa6" opacity={0.5} />
      <div className="relative z-10">
        <EventHeader />
      </div>
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-6xl">
          {/* 헤더 */}
          <div className="text-center pb-8 mb-8">
            <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-5xl font-semibold mb-4 text-white">그림 그리기 안내</h1>
            <p className="text-3xl text-gray-300">
              아래 안내에 따라 그림을 그려주세요
            </p>
          </div>

          {/* 안내 사항 - 카드 */}
          <div className="max-w-6xl mx-auto mb-12 bg-gray-900/90 border border-gray-700 rounded-xl shadow p-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                <p className="text-3xl text-gray-300 text-left">
                  주어진 그림을 정확하게 그려주세요
                </p>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                <p className="text-3xl text-gray-300 text-left">
                  20초 안에 그림을 완성해주세요
                </p>
              </div>

              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                <p className="text-3xl text-gray-300 text-left">
                  정확도 80% 이상이면 다음 단계로 진행됩니다
                </p>
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-center">
            <Button
              onClick={onStart}
              className="h-20 px-16 text-2xl font-medium min-w-80"
            >
              시작하기
            </Button>
          </div>
        </div>
      </div>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

