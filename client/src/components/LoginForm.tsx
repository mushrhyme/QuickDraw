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
import { Pencil } from "lucide-react";
import Footer from "@/components/Footer";
import EventHeader from "@/components/EventHeader";
import MatrixBackground from "@/components/MatrixBackground";

interface LoginFormProps {
  onSubmit: (company: string, employeeId: string) => void;
}

export default function LoginForm({ onSubmit }: LoginFormProps) {
  const [company, setCompany] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  const texts = [
    "그림을 그려서 AI가 맞춰보세요!",
    "20초 안에 주어진 그림을 그려보세요",
    "정확하게 그리면 다음 단계로 넘어갑니다",
    "빠르고 정확하게 그려보세요!",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 2024087 조유민으로 고정
    if (company && employeeId === "2024087") {
      onSubmit(company, employeeId);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-black relative overflow-hidden">
      <MatrixBackground color="#26bfa6" opacity={0.5} />
      <div className="relative z-10">
        <EventHeader />
      </div>
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto relative z-10">
        <div className="w-full max-w-5xl">
          {/* 헤더 */}
          <div className="text-center mb-8 pt-4">
            <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Pencil className="w-16 h-16 text-primary" />
            </div>
            <div className="flex items-center justify-center gap-3 mt-6">
              <span className="text-6xl font-bold text-primary leading-none">[</span>
              <h1 className="text-6xl font-semibold text-white">QuickDraw 그림 그리기</h1>
              <span className="text-6xl font-bold text-primary leading-none">]</span>
            </div>
            <p className="text-2xl text-gray-300 mt-6 min-h-[2.5rem]">
              {displayedText}
              {isTyping && <span className="animate-pulse">|</span>}
            </p>
          </div>
          <div className="my-8" />
          {/* 폼 */}
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg border-2 bg-gray-900/90 border-gray-700">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-xl font-medium text-gray-200">
                      회사명
                    </Label>
                    <Select value={company} onValueChange={setCompany} required>
                      <SelectTrigger
                        id="company"
                        className="h-16 text-xl bg-gray-800 border-gray-700 text-white"
                      >
                        <SelectValue placeholder="회사명을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent className="text-xl bg-gray-800 border-gray-700">
                        <SelectItem value="농심" className="text-xl text-white hover:bg-gray-700">농심</SelectItem>
                        <SelectItem value="율촌화학" className="text-xl text-white hover:bg-gray-700">율촌화학</SelectItem>
                        <SelectItem value="메가마트" className="text-xl text-white hover:bg-gray-700">메가마트</SelectItem>
                        <SelectItem value="농심태경" className="text-xl text-white hover:bg-gray-700">농심태경</SelectItem>
                        <SelectItem value="농심엔지니어링" className="text-xl text-white hover:bg-gray-700">농심엔지니어링</SelectItem>
                        <SelectItem value="엔디에스" className="text-xl text-white hover:bg-gray-700">엔디에스</SelectItem>
                        <SelectItem value="호텔농심" className="text-xl text-white hover:bg-gray-700">호텔농심</SelectItem>
                        <SelectItem value="농심캐피탈" className="text-xl text-white hover:bg-gray-700">농심캐피탈</SelectItem>
                        <SelectItem value="농심미분" className="text-xl text-white hover:bg-gray-700">농심미분</SelectItem>
                        <SelectItem value="농심홀딩스" className="text-xl text-white hover:bg-gray-700">농심홀딩스</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeId" className="text-xl font-medium text-gray-200">
                      사번
                    </Label>
                    <Input
                      id="employeeId"
                      type="text"
                      placeholder="사번을 입력하세요"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="h-16 text-xl bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      required
                    />
                  </div>
                  <div className="pt-2 flex justify-center">
                    <Button
                      type="submit"
                      className="h-16 px-12 text-xl font-medium min-w-64"
                      disabled={!company || employeeId !== "2024087"}
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

