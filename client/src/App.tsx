import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { soundManager } from "@/lib/sound";
import Home from "@/pages/Home";
import RankingPage from "@/pages/RankingPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/ranking" component={RankingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // 크롬: 페이지 로드 시 사용자 상호작용으로 오디오 컨텍스트 활성화
  useEffect(() => {
    const activateOnInteraction = () => {
      soundManager.activateAudioContext();
      // 한 번만 실행되도록 이벤트 리스너 제거
      document.removeEventListener('click', activateOnInteraction);
      document.removeEventListener('keydown', activateOnInteraction);
      document.removeEventListener('touchstart', activateOnInteraction);
    };

    // 사용자 상호작용 이벤트 리스너 등록
    document.addEventListener('click', activateOnInteraction, { once: true });
    document.addEventListener('keydown', activateOnInteraction, { once: true });
    document.addEventListener('touchstart', activateOnInteraction, { once: true });

    return () => {
      document.removeEventListener('click', activateOnInteraction);
      document.removeEventListener('keydown', activateOnInteraction);
      document.removeEventListener('touchstart', activateOnInteraction);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

