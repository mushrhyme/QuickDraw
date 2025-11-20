import { useEffect } from "react";
import confetti from "canvas-confetti";

/**
 * 성공 결과일 때 팡파레 효과를 표시하는 hook
 * @param isSuccess 성공 여부
 */
export function useSuccessConfetti(isSuccess: boolean) {
  useEffect(() => {
    // 성공이 아닐 때는 팡파레 효과를 표시하지 않음
    if (!isSuccess) return;

    const duration = 4500; // 4.5초간 지속
    const animationEnd = Date.now() + duration;
    const defaults = { 
      startVelocity: 30, 
      spread: 360, 
      ticks: 100,
      zIndex: 0,
      gravity: 0.8,
    };

    // 민트색 계열
    const colors = ['#26bfa6', '#40e0d0', '#7fffd4', '#afffe6'];

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    // 좌우 발사 interval - 빈도 줄임 (300ms 간격)
    const interval: NodeJS.Timeout = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration); // 파티클 수 조절
      
      // 왼쪽에서 발사
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: colors,
      });
      
      // 오른쪽에서 발사
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: colors,
      });
    }, 300); // 발사 간격 증가 (250ms → 300ms)

    // 중앙에서 강조된 큰 폭발 효과 (첫 500ms 부분 강조)
    setTimeout(() => {
      // 메인 중앙 폭발 - 더 크고 강하게
      confetti({
        ...defaults,
        particleCount: 250,
        origin: { x: 0.5, y: 0.3 },
        colors: colors,
        angle: 90,
        spread: 70,
        startVelocity: 40,
      });
      
      // 연속 폭발 효과로 더 강조
      setTimeout(() => {
        confetti({
          ...defaults,
          particleCount: 150,
          origin: { x: 0.5, y: 0.3 },
          colors: colors,
          angle: 90,
          spread: 50,
          startVelocity: 35,
        });
      }, 100);
      
      setTimeout(() => {
        confetti({
          ...defaults,
          particleCount: 100,
          origin: { x: 0.5, y: 0.3 },
          colors: colors,
          angle: 90,
          spread: 40,
          startVelocity: 30,
        });
      }, 200);
    }, 0); // 즉시 시작

    // 추가 폭발 효과 (시간 단축)
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 80,
        origin: { x: 0.3, y: 0.4 },
        colors: colors,
        angle: 60,
        spread: 45,
      });
      confetti({
        ...defaults,
        particleCount: 80,
        origin: { x: 0.7, y: 0.4 },
        colors: colors,
        angle: 120,
        spread: 45,
      });
    }, 600); // 시간 단축

    return () => clearInterval(interval);
  }, [isSuccess]);
}

