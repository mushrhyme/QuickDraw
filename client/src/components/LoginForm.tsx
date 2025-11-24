import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Palette } from "lucide-react";
import Footer from "@/components/Footer";
import EventHeader from "@/components/EventHeader";
import MatrixBackground from "@/components/MatrixBackground";
import { useIsMobile } from "@/hooks/use-mobile";

interface LoginFormProps {
  onSubmit: (company: string, employeeId: string) => void;
  onUserFound?: (user: any) => void;
}

export default function LoginForm({ onSubmit, onUserFound }: LoginFormProps) {
  const isMobile = useIsMobile(); // 모바일 레이아웃 감지
  const [company, setCompany] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [error, setError] = useState<string>("");

  const texts = [
    "제한 시간 안에 최대한 빨리 그려보세요!",
    "여러분의 낙서 실력… AI 앞에서 통할까요?",
    "속도와 정확도가 승부를 가릅니다!",
    "한 번에 알아볼 수 있게 그릴 수 있을까요?",
    "사람은 몰라도 AI는 알아볼 수도 있어요!"
  ];

  // 타이핑 효과
  useEffect(() => {
    let currentIndex = 0;
    const currentText = texts[currentTextIndex];
    
    setIsTyping(true);
    setDisplayedText("");
    currentIndex = 0;
    
    const typingInterval = setInterval(() => {
      if (currentIndex < currentText.length) {
        setDisplayedText(currentText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
        
        setTimeout(() => {
          setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        }, 3000);
      }
    }, 90);

    return () => clearInterval(typingInterval);
  }, [currentTextIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!company || !employeeId) {
      setError("회사명과 사번을 입력해주세요.");
      return;
    }

    try {
      // 사용자 정보 조회
      const response = await fetch("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ company, employeeId }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "사용자를 찾을 수 없습니다.");
        return;
      }

      const user = await response.json();
      
      // 콘솔 로그: 로그인 성공 정보
      console.log("=".repeat(60));
      console.log("✅ 로그인 성공");
      console.log("=".repeat(60));
      console.log("회사명:", company);
      console.log("사번:", employeeId);
      console.log("사용자 정보:", {
        name: user.name || "N/A",
        company: user.company || company,
        employeeId: user.employeeId || employeeId,
        department: user.department || "N/A",
      });
      console.log("=".repeat(60));
      
      // 사용자 정보를 부모 컴포넌트에 전달
      if (onUserFound) {
        onUserFound(user);
      }
      
      // 로그인 성공
      onSubmit(company, employeeId);
    } catch (error) {
      console.error("사용자 조회 오류:", error);
      setError("사용자 조회 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-black relative overflow-hidden">
      <MatrixBackground color="#26bfa6" opacity={0.5} />
      <div className="relative z-10">
        <EventHeader />
      </div>
      <div 
        className={`flex-1 flex items-center justify-center ${isMobile ? 'p-3 pt-20' : 'p-6'} overflow-y-auto relative z-10`}
      >
        <div className={`w-full ${isMobile ? 'max-w-md' : 'max-w-5xl'}`}>
          {/* 헤더 */}
          <div className={`text-center ${isMobile ? 'mb-4 pt-2' : 'mb-8 pt-4'}`}>
            <div className={`mx-auto ${isMobile ? 'w-16 h-16' : 'w-24 h-24'} rounded-full bg-primary/10 flex items-center justify-center`}>
              <Palette className={`${isMobile ? "w-10 h-10" : "w-16 h-16"} text-primary`} />
            </div>
            <div className={`flex items-center justify-center ${isMobile ? 'gap-1 mt-3' : 'gap-3 mt-6'}`}>
              <span className={`${isMobile ? 'text-2xl' : 'text-6xl'} font-bold text-primary leading-none`}>[</span>
              <h1 className={`${isMobile ? 'text-2xl' : 'text-6xl'} font-semibold text-white`}>AI가 보는 내 그림 실력</h1>
              <span className={`${isMobile ? 'text-2xl' : 'text-6xl'} font-bold text-primary leading-none`}>]</span>
            </div>
            <p className={`${isMobile ? 'text-base' : 'text-2xl'} text-gray-300 ${isMobile ? 'mt-3' : 'mt-6'} min-h-[2.5rem]`}>
              {displayedText}
              {isTyping && <span className="animate-pulse">|</span>}
            </p>
          </div>
          <div className={isMobile ? "my-4" : "my-8"} />
          {/* 폼 */}
          <div className={`${isMobile ? 'max-w-sm' : 'max-w-2xl'} mx-auto`}>
            <Card className="shadow-lg border-2 bg-gray-900/90 border-gray-700">
              <CardContent className={isMobile ? "p-4" : "p-8"}>
                <form onSubmit={handleSubmit} className={isMobile ? "space-y-4" : "space-y-6"}>
                  <div className="space-y-2">
                    <Label htmlFor="company" className={`${isMobile ? 'text-base' : 'text-xl'} font-medium text-gray-200`}>
                      회사명
                    </Label>
                    <Select value={company} onValueChange={setCompany} required>
                      <SelectTrigger
                        id="company"
                        className={`${isMobile ? 'h-12 text-base' : 'h-16 text-xl'} bg-gray-800 border-gray-700 text-white`}
                      >
                        <SelectValue placeholder="회사명을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent className={`${isMobile ? 'text-base' : 'text-xl'} bg-gray-800 border-gray-700`}>
                        <SelectItem value="농심" className={`${isMobile ? 'text-base' : 'text-xl'} text-white hover:bg-gray-700`}>농심</SelectItem>
                        <SelectItem value="율촌화학" className={`${isMobile ? 'text-base' : 'text-xl'} text-white hover:bg-gray-700`}>율촌화학</SelectItem>
                        <SelectItem value="메가마트" className={`${isMobile ? 'text-base' : 'text-xl'} text-white hover:bg-gray-700`}>메가마트</SelectItem>
                        <SelectItem value="농심태경" className={`${isMobile ? 'text-base' : 'text-xl'} text-white hover:bg-gray-700`}>농심태경</SelectItem>
                        <SelectItem value="농심엔지니어링" className={`${isMobile ? 'text-base' : 'text-xl'} text-white hover:bg-gray-700`}>농심엔지니어링</SelectItem>
                        <SelectItem value="엔디에스" className={`${isMobile ? 'text-base' : 'text-xl'} text-white hover:bg-gray-700`}>엔디에스</SelectItem>
                        <SelectItem value="호텔농심" className={`${isMobile ? 'text-base' : 'text-xl'} text-white hover:bg-gray-700`}>호텔농심</SelectItem>
                        <SelectItem value="농심캐피탈" className={`${isMobile ? 'text-base' : 'text-xl'} text-white hover:bg-gray-700`}>농심캐피탈</SelectItem>
                        <SelectItem value="농심미분" className={`${isMobile ? 'text-base' : 'text-xl'} text-white hover:bg-gray-700`}>농심미분</SelectItem>
                        <SelectItem value="농심홀딩스" className={`${isMobile ? 'text-base' : 'text-xl'} text-white hover:bg-gray-700`}>농심홀딩스</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeId" className={`${isMobile ? 'text-base' : 'text-xl'} font-medium text-gray-200`}>
                      사번
                    </Label>
                    <Input
                      id="employeeId"
                      type="text"
                      placeholder="사번을 입력하세요"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className={`${isMobile ? 'h-12 text-base' : 'h-16 text-xl'} bg-gray-800 border-gray-700 text-white placeholder:text-gray-500`}
                      required
                    />
                  </div>
                  {error && (
                    <div className={`text-red-400 text-center ${isMobile ? 'text-sm' : 'text-lg'}`}>
                      {error}
                    </div>
                  )}
                  <div className="pt-2 flex justify-center">
                    <Button
                      type="submit"
                      className={`${isMobile ? 'h-12 px-8 text-base w-full' : 'h-16 px-12 text-xl'} font-medium ${isMobile ? '' : 'min-w-64'}`}
                      disabled={!company || !employeeId}
                    >
                      확인
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

