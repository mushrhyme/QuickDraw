import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Footer from "@/components/Footer";
import EventHeader from "@/components/EventHeader";
import MatrixBackground from "@/components/MatrixBackground";
import { useIsMobile } from "@/hooks/use-mobile";

interface DrawingGuideProps {
  onStart: () => void;
}

export default function DrawingGuide({ onStart }: DrawingGuideProps) {
  const isMobile = useIsMobile(); // 모바일 레이아웃 감지
  return (
    <div className="h-screen flex flex-col bg-black relative overflow-hidden">
      <MatrixBackground color="#26bfa6" opacity={0.5} />
      <div className="relative z-10">
        <EventHeader />
      </div>
      <div className={`flex-1 flex items-center justify-center ${isMobile ? 'p-4 pt-20' : 'p-8'} relative z-10`}>
      <div className={`w-full ${isMobile ? 'max-w-md' : 'max-w-6xl'}`}>
        {/* 헤더 */}
        <div className={`text-center ${isMobile ? 'pb-4 mb-4' : 'pb-8 mb-8'}`}>
            <div className={`mx-auto ${isMobile ? 'w-16 h-16' : 'w-24 h-24'} rounded-full bg-primary/10 flex items-center justify-center ${isMobile ? 'mb-4' : 'mb-6'}`}>
              <CheckCircle2 className={`${isMobile ? "w-10 h-10" : "w-16 h-16"} text-primary`} />
            </div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-5xl'} font-semibold ${isMobile ? 'mb-2' : 'mb-4'} text-white`}>그림 그리기 안내</h1>
            <p className={`${isMobile ? 'text-base' : 'text-3xl'} text-gray-300`}>
              아래 안내에 따라 그림을 그려주세요
            </p>
        </div>

        {/* 안내 사항 - 카드 */}
        <div className={`${isMobile ? 'max-w-sm' : 'max-w-6xl'} mx-auto ${isMobile ? 'mb-6' : 'mb-12'} bg-gray-900/90 border border-gray-700 rounded-xl shadow ${isMobile ? 'p-4' : 'p-8'}`}>
          <div className={isMobile ? "space-y-3" : "space-y-6"}>
            <div className="flex items-start gap-3">
              <CheckCircle2 className={`${isMobile ? 'w-5 h-5' : 'w-8 h-8'} text-primary flex-shrink-0 mt-1`} />
              <p className={`${isMobile ? 'text-sm' : 'text-3xl'} text-gray-300 text-left`}>
                시작하기 버튼을 누르면 제시어가 랜덤으로 나옵니다.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className={`${isMobile ? 'w-5 h-5' : 'w-8 h-8'} text-primary flex-shrink-0 mt-1`} />
              <div className="flex-1">
                <p className={`${isMobile ? 'text-sm' : 'text-3xl'} text-gray-300 text-left`}>
                  제시어만 단독으로 그려야 인식이 잘 됩니다.
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-2xl'} text-gray-400 text-left ${isMobile ? 'mt-2 ml-0' : 'mt-4 ml-4'}`}>
                  예) "새"일 경우 구름이나 배경은 제외하고 새를 그려야 합니다.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className={`${isMobile ? 'w-5 h-5' : 'w-8 h-8'} text-primary flex-shrink-0 mt-1`} />
              <p className={`${isMobile ? 'text-sm' : 'text-3xl'} text-gray-300 text-left`}>
                20초가 지나면 자동으로 그림이 제출됩니다.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className={`${isMobile ? 'w-5 h-5' : 'w-8 h-8'} text-primary flex-shrink-0 mt-1`} />
              <p className={`${isMobile ? 'text-sm' : 'text-3xl'} text-gray-300 text-left`}>
                지우개 버튼을 클릭하면 그림 전체를 지울 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-center">
          <Button
            onClick={onStart}
            className={`${isMobile ? 'h-12 px-8 text-base w-full' : 'h-20 px-16 text-2xl'} font-medium ${isMobile ? '' : 'min-w-80'}`}
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

