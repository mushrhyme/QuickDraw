import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Home } from "lucide-react";
import Footer from "@/components/Footer";
import EventHeader from "@/components/EventHeader";
import MatrixBackground from "@/components/MatrixBackground";
import { useSuccessConfetti } from "@/hooks/useSuccessConfetti";
import { useOlderRipple } from "@/hooks/useOlderRipple";
import { soundManager, SOUNDS } from "@/lib/sound";
import { useIsMobile } from "@/hooks/use-mobile";
import type { User } from "@shared/types";
import { CATEGORY_NAMES } from "@shared/categories";
import confetti from "canvas-confetti";

interface ResultDisplayProps {
  targetClass: string;
  predictedClass: string;
  confidence: number;
  drawingTime: number;
  success: boolean;
  drawingImage?: string | null;
  user: User | null; // 사용자 정보
  onReset: () => void;
}

const CLASS_NAMES = CATEGORY_NAMES;

const MAX_DRAWING_TIME = 20; // 최대 그림 그리기 시간 (초)

// 한국어 조사 선택 함수 (받침 유무에 따라 "와/과" 선택)
const getKoreanParticle = (word: string): string => {
  if (!word) return "와";
  
  // 한글 유니코드 범위: AC00-D7A3
  const lastChar = word[word.length - 1];
  const lastCharCode = lastChar.charCodeAt(0);
  
  // 한글이 아니면 기본값 "와" 반환
  if (lastCharCode < 0xAC00 || lastCharCode > 0xD7A3) {
    return "와";
  }
  
  // 받침 유무 확인: (유니코드 - 0xAC00) % 28
  // 0이면 받침 없음, 0이 아니면 받침 있음
  const hasFinalConsonant = (lastCharCode - 0xAC00) % 28 !== 0;
  
  return hasFinalConsonant ? "과" : "와";
};

export default function ResultDisplay({
  targetClass,
  predictedClass,
  confidence,
  drawingTime,
  success,
  drawingImage,
  user,
  onReset,
}: ResultDisplayProps) {
  const isMobile = useIsMobile(); // 모바일 레이아웃 감지
  // 성공 시 폭죽 효과
  useSuccessConfetti(success);
  // 실패 시 리플 효과 (쿠궁)
  useOlderRipple(!success);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>("");

  // 결과에 따른 음향 효과 재생 (크롬 최적화, 전체 재생 보장)
  useEffect(() => {
    // 크롬: 오디오 컨텍스트 활성화 후 재생 보장
    soundManager.activateAudioContext().then(() => {
      // 약간의 지연을 두어 확실한 재생 보장
      setTimeout(() => {
        if (success) {
          // 맞췄을 때 firework 효과음 재생 (forceNew: true로 전체 재생 보장)
          soundManager.play(SOUNDS.FIREWORK, 0.7, true);
        } else {
          // 틀렸을 때 fail 효과음 재생 (forceNew: true로 전체 재생 보장)
          soundManager.play(SOUNDS.FAIL, 0.7, true);
        }
      }, 100);
    });
  }, [success]);

  // 컴포넌트 언마운트 시 모든 confetti 파티클 제거
  useEffect(() => {
    return () => {
      // 화면 전환 시 모든 confetti 파티클 즉시 제거
      confetti.reset();
    };
  }, []);

  // 결과를 구글 시트에 저장
  useEffect(() => {
    const saveResult = async () => {
      if (!user) {
        console.warn("사용자 정보가 없어 결과를 저장할 수 없습니다.");
        return;
      }

      setIsSaving(true);
      setSaveError("");

      try {
        // 현재 시간을 KST 형식으로 변환
        const now = new Date();
        const kstOffset = 9 * 60; // KST는 UTC+9 (분 단위)
        const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60000);
        
        const year = kstTime.getFullYear();
        const month = String(kstTime.getMonth() + 1).padStart(2, "0");
        const day = String(kstTime.getDate()).padStart(2, "0");
        const hours = String(kstTime.getHours()).padStart(2, "0");
        const minutes = String(kstTime.getMinutes()).padStart(2, "0");
        const seconds = String(kstTime.getSeconds()).padStart(2, "0");
        const completedAt = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        const response = await fetch("/api/save-result", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            company: user.company,
            employeeId: user.employeeId,
            name: user.name,
            department: user.department,
            targetClass,
            predictedClass,
            confidence,
            drawingTime,
            completedAt,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "결과 저장 실패");
        }

        // 콘솔 로그: 결과 저장 성공 정보
        console.log("=".repeat(60));
        console.log("✅ 결과 저장 성공");
        console.log("=".repeat(60));
        console.log("사용자 정보:", {
          회사명: user.company,
          사번: user.employeeId,
          이름: user.name,
          부서: user.department || "N/A",
        });
        console.log("그림 정보:", {
          목표_카테고리: `${targetClass} (${CLASS_NAMES[targetClass] || targetClass})`,
          예측_카테고리: `${predictedClass || "예측 불가"} ${predictedClass ? `(${CLASS_NAMES[predictedClass] || predictedClass})` : ""}`,
          유사도: `${(confidence * 100).toFixed(1)}%`,
          그리기_시간: `${drawingTime}초`,
          성공_여부: success ? "✅ 성공" : "❌ 실패",
        });
        console.log("완료 시간:", completedAt);
        console.log("=".repeat(60));
      } catch (error) {
        console.error("결과 저장 오류:", error);
        setSaveError(error instanceof Error ? error.message : "결과 저장 중 오류가 발생했습니다.");
      } finally {
        setIsSaving(false);
      }
    };

    saveResult();
  }, [user, targetClass, predictedClass, confidence, drawingTime]);

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
      <div className={`flex-1 flex items-center justify-center ${isMobile ? 'p-3 pt-20' : 'p-4'} relative z-10`}>
        <div className={`w-full ${isMobile ? 'max-w-md' : 'max-w-5xl'}`}>
        {/* 상단: 아이콘, 메시지 */}
        <div className={`text-center ${isMobile ? 'space-y-2 pt-1' : 'space-y-3 pt-12'}`}>
          <div className={`inline-flex items-center justify-center ${isMobile ? 'w-12 h-12' : 'w-20 h-20'} rounded-full bg-primary/10 mx-auto`}>
            <Sparkles className={`${isMobile ? "w-8 h-8" : "w-14 h-14"} text-primary`} />
          </div>
          <div className={isMobile ? "space-y-1" : "space-y-3"}>
            {/* 결과 메시지 */}
            <div className={isMobile ? "mt-2" : "mt-4"}>
              <h1
                className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold ${
                  success
                    ? "text-primary"
                    : "text-gray-400"
                }`}
              >
                {success
                  ? [
                      `작품이네요! ${CLASS_NAMES[targetClass] || targetClass} 너무 잘 그리셨어요`,
                      "AI가 감탄했습니다!",
                      "정확하게 맞추셨네요! 대단하세요!",
                      "대단하신데요? 이 정도면 예술가십니다!",
                      "와~ AI가 박수치고 있습니다!",
                    ][Math.floor(Math.random() * 5)]
                  : [
                      "아깝지만 괜찮아요! 다음엔 딱 맞추실 거예요.",
                      "이건… 저희가 아직 이해하지 못하는 예술 같아요.",
                      "AI가 고개를 살짝 갸웃했습니다.",
                      "음… 의도는 알 것 같은데, AI는 놓쳤나 봐요!",
                      `AI가 '이게… ${CLASS_NAMES[targetClass] || targetClass}인가요…?'라고 물어보네요.`,
                    ][Math.floor(Math.random() * 5)]
                }
              </h1>
            </div>
          </div>
        </div>

        {/* 중앙: 결과 정보 */}
        <div className={`flex flex-col items-center ${isMobile ? 'gap-3 mt-3' : 'gap-6 mt-6'} mb-4`}>
          {/* 사용자가 그린 그림 */}
          {drawingImage && (
            <div className="relative flex-shrink-0">
              <div className={`${isMobile ? 'w-48 h-48' : 'w-64 h-64'} rounded-2xl overflow-hidden border-4 border-primary/20 shadow-xl bg-gradient-to-br from-primary/5 to-primary/10 p-2`}>
                <div className="w-full h-full rounded-xl overflow-hidden bg-white flex items-center justify-center">
                  <img
                    src={drawingImage}
                    alt="그린 그림"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className={`grid grid-cols-2 ${isMobile ? 'gap-2' : 'gap-4'} w-full ${isMobile ? 'max-w-xs' : 'max-w-xl'}`}>
            <Card className="border-2 border-gray-700 bg-gray-900/90">
              <div className={`${isMobile ? 'pt-3 pb-3' : 'pt-4 pb-4'} text-center ${isMobile ? 'space-y-1' : 'space-y-2'}`}>
                <p className={`${isMobile ? 'text-sm' : 'text-2xl'} text-gray-300`}>목표 그림</p>
                <p className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-white`}>
                  {CLASS_NAMES[targetClass] || targetClass}
                </p>
              </div>
            </Card>
            <Card className="border-2 border-primary/30 bg-gray-900/90">
              <div className={`${isMobile ? 'pt-3 pb-3' : 'pt-4 pb-4'} text-center ${isMobile ? 'space-y-1' : 'space-y-2'}`}>
                <p className={`${isMobile ? 'text-sm' : 'text-2xl'} text-gray-300`}>예측 결과</p>
                <p className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-primary`}>
                  {predictedClass ? (CLASS_NAMES[predictedClass] || predictedClass) : "???"}
                </p>
              </div>
            </Card>
          </div>

          {/* 예측 유사도 및 시간 */}
          <div className={`grid grid-cols-2 ${isMobile ? 'gap-2' : 'gap-4'} w-full ${isMobile ? 'max-w-xs' : 'max-w-xl'} mt-4`}>
            <Card className="border-2 border-gray-700 bg-gray-900/90">
              <div className={`${isMobile ? 'pt-3 pb-3' : 'pt-4 pb-4'} text-center ${isMobile ? 'space-y-1' : 'space-y-2'}`}>
                <div className={isMobile ? "space-y-1" : "space-y-1"}>
                  {predictedClass ? (
                    <>
                      <p className={`${isMobile ? 'text-sm' : 'text-2xl'} font-bold text-white`}>
                        {CLASS_NAMES[predictedClass] || predictedClass}
                        {getKoreanParticle(CLASS_NAMES[predictedClass] || predictedClass)}
                      </p>
                      <p className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-primary`}>
                        {(confidence * 100).toFixed(1)}% 유사
                      </p>
                    </>
                  ) : (
                    <p className={`${isMobile ? 'text-lg' : 'text-3xl'} font-bold text-gray-400`}>
                      예측 불가
                    </p>
                  )}
                </div>
              </div>
            </Card>
            <Card className="border-2 border-gray-700 bg-gray-900/90">
              <div className={`${isMobile ? 'pt-3 pb-3' : 'pt-4 pb-4'} text-center ${isMobile ? 'space-y-1' : 'space-y-2'}`}>
                <p className={`${isMobile ? 'text-sm' : 'text-2xl'} text-gray-300`}>소요 시간</p>
                <p className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-white`}>
                  {Math.min(drawingTime, MAX_DRAWING_TIME).toFixed(1)}초
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* 하단: 버튼 */}
        <div className={`${isMobile ? 'space-y-3 mt-2' : 'space-y-4 mt-4'}`}>
          <div className={`flex justify-center ${isMobile ? 'flex-col gap-3' : 'gap-4'} pb-2`}>
            <Button
              onClick={onReset}
              variant="default"
              className={`${isMobile ? 'h-12 px-8 text-base w-full' : 'h-16 px-12 text-xl'} font-medium ${isMobile ? '' : ''}`}
            >
              <Home className={`${isMobile ? 'w-5 h-5' : 'w-5 h-5'} mr-2`} />
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