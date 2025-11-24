import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import EventHeader from "@/components/EventHeader";
import MatrixBackground from "@/components/MatrixBackground";
import { CATEGORY_NAMES } from "@shared/categories";
import { useIsMobile } from "@/hooks/use-mobile";

interface ClassGuideProps {
  targetClass: string;
  onComplete: () => void;
}

const CLASS_NAMES = CATEGORY_NAMES;

export default function ClassGuide({ targetClass, onComplete }: ClassGuideProps) {
  const isMobile = useIsMobile(); // 모바일 레이아웃 감지
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown === 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onComplete]);

  return (
    <div className="h-screen flex flex-col bg-black relative overflow-hidden">
      <MatrixBackground color="#26bfa6" opacity={0.5} />
      <div className="relative z-10">
        <EventHeader />
      </div>
      <div className={`flex-1 flex items-center justify-center ${isMobile ? 'p-4 pt-20' : 'p-8'} relative z-10`}>
        <div className={`w-full ${isMobile ? 'max-w-md' : 'max-w-6xl'} text-center`}>
          <div className={isMobile ? 'mb-6' : 'mb-12'}>
            <h1 className={`${isMobile ? 'text-3xl' : 'text-6xl'} font-bold text-white ${isMobile ? 'mb-4' : 'mb-8'}`}>
              그려야 할 그림
            </h1>
            <div className={`${isMobile ? 'text-4xl' : 'text-8xl'} font-bold text-primary ${isMobile ? 'mb-4' : 'mb-8'}`}>
              {CLASS_NAMES[targetClass] || targetClass}
            </div>
            <div className={`${isMobile ? 'text-xl' : 'text-4xl'} text-gray-300 ${isMobile ? 'mb-4' : 'mb-8'}`}>
              {countdown}초 후 시작됩니다
            </div>
            <div className={`${isMobile ? 'w-32 h-32 border-2' : 'w-64 h-64 border-4'} mx-auto border-primary rounded-full flex items-center justify-center`}>
              <div className={`${isMobile ? 'text-5xl' : 'text-9xl'} font-bold text-primary`}>
                {countdown}
              </div>
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

