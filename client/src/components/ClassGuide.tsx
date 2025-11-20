import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import EventHeader from "@/components/EventHeader";
import MatrixBackground from "@/components/MatrixBackground";

interface ClassGuideProps {
  targetClass: string;
  onComplete: () => void;
}

const CLASS_NAMES: Record<string, string> = {
  cat: "고양이",
  dog: "강아지",
  airplane: "비행기",
  car: "자동차",
  bird: "새",
};

export default function ClassGuide({ targetClass, onComplete }: ClassGuideProps) {
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
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-6xl text-center">
          <div className="mb-12">
            <h1 className="text-6xl font-bold text-white mb-8">
              그려야 할 그림
            </h1>
            <div className="text-8xl font-bold text-primary mb-8">
              {CLASS_NAMES[targetClass] || targetClass}
            </div>
            <div className="text-4xl text-gray-300 mb-8">
              {countdown}초 후 시작됩니다
            </div>
            <div className="w-64 h-64 mx-auto border-4 border-primary rounded-full flex items-center justify-center">
              <div className="text-9xl font-bold text-primary">
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

