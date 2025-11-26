import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";
import Footer from "@/components/Footer";
import EventHeader from "@/components/EventHeader";
import MatrixBackground from "@/components/MatrixBackground";
import { useIsMobile } from "@/hooks/use-mobile";

interface WelcomeScreenProps {
  name: string;
  onContinue: () => void;
}

export default function WelcomeScreen({
  name,
  onContinue,
}: WelcomeScreenProps) {
  const isMobile = useIsMobile(); // 모바일 레이아웃 감지

  return (
    <div className="h-screen flex flex-col bg-black relative overflow-hidden">
      <MatrixBackground color="#26bfa6" opacity={0.5} />
      <div className="relative z-10">
        <EventHeader />
      </div>
      <div className={`flex-1 flex items-center justify-center ${isMobile ? 'p-4 pt-20' : 'p-8'} relative z-10`}>
      <div className={`w-full ${isMobile ? 'max-w-md' : 'max-w-6xl'} text-center ${isMobile ? 'space-y-6' : 'space-y-12'}`}>
        <div className={`inline-flex items-center justify-center ${isMobile ? 'w-16 h-16' : 'w-24 h-24'} rounded-full bg-primary/10 mx-auto`}>
          <UserCheck className={`${isMobile ? "w-10 h-10" : "w-16 h-16"} text-primary`} />
        </div>

        <div className={isMobile ? "space-y-2" : "space-y-4"}>
          <h1 className={`${isMobile ? 'text-3xl' : 'text-6xl'} font-bold text-white`} data-testid="text-welcome-name">
            {name} 님
          </h1>

          <p className={`${isMobile ? 'text-2xl' : 'text-5xl'} font-semibold text-primary ${isMobile ? 'mt-2' : 'mt-[15px]'}`}>
            환영합니다!
          </p>
        </div>

        <p className={`${isMobile ? 'text-lg' : 'text-3xl'} text-gray-300`}>
          그림 그리기를 시작하겠습니다
        </p>

        <div className={isMobile ? "pt-4" : "pt-8"}>
          <Button
            onClick={onContinue}
            className={`${isMobile ? 'h-12 px-8 text-base w-full' : 'h-20 px-16 text-2xl'} font-medium ${isMobile ? '' : 'min-w-80'}`}
            data-testid="button-continue"
          >
            다음
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

