import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Step, LoginInfo } from "@shared/types";
import LoginForm from "@/components/LoginForm";
import DrawingGuide from "@/components/DrawingGuide";
import ClassGuide from "@/components/ClassGuide";
import DrawingCanvas from "@/components/DrawingCanvas";
import ResultDisplay from "@/components/ResultDisplay";

const CLASSES = ["cat", "dog", "airplane", "car", "bird"];

export default function Home() {
  const [step, setStep] = useState<Step>("login");
  const [loginInfo, setLoginInfo] = useState<LoginInfo | null>(null);
  const [targetClass, setTargetClass] = useState<string>("");
  const [result, setResult] = useState<{
    predictedClass: string;
    confidence: number;
    drawingTime: number;
    success: boolean;
  } | null>(null);
  const { toast } = useToast();

  // 랜덤 클래스 선택
  const getRandomClass = () => {
    return CLASSES[Math.floor(Math.random() * CLASSES.length)];
  };

  const handleLogin = (company: string, employeeId: string) => {
    setLoginInfo({ company, employeeId });
    setStep("guide");
  };

  const handleGuideStart = () => {
    const randomClass = getRandomClass();
    setTargetClass(randomClass);
    setStep("classGuide");
  };

  const handleClassGuideComplete = () => {
    setStep("drawing");
  };

  const handleDrawingComplete = (drawingResult: {
    predictedClass: string;
    confidence: number;
    drawingTime: number;
    success: boolean;
  }) => {
    setResult(drawingResult);
    setStep("result");
  };

  const handleReset = () => {
    setLoginInfo(null);
    setTargetClass("");
    setResult(null);
    setStep("login");
  };

  return (
    <>
      {step === "login" && <LoginForm onSubmit={handleLogin} />}

      {step === "guide" && <DrawingGuide onStart={handleGuideStart} />}

      {step === "classGuide" && targetClass && (
        <ClassGuide targetClass={targetClass} onComplete={handleClassGuideComplete} />
      )}

      {step === "drawing" && targetClass && (
        <DrawingCanvas targetClass={targetClass} onComplete={handleDrawingComplete} />
      )}

      {step === "result" && result && targetClass && (
        <ResultDisplay
          targetClass={targetClass}
          predictedClass={result.predictedClass}
          confidence={result.confidence}
          drawingTime={result.drawingTime}
          success={result.success}
          onReset={handleReset}
        />
      )}
    </>
  );
}

