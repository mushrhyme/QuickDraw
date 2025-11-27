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

    const duration = 3000; // 3초간 지속 (4.5초 → 3초로 단축)
    const animationEnd = Date.now() + duration;
    const defaults = { 
      startVelocity: 50, // 속도 증가 (30 → 50)
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

    // 즉시 중앙에서 강조된 큰 폭발 효과 (가장 먼저 터지도록)
    // 메인 중앙 폭발 - 더 크고 강하게, 즉시 시작
    confetti({
      ...defaults,
      particleCount: 300, // 파티클 수 증가 (250 → 300)
      origin: { x: 0.5, y: 0.3 },
      colors: colors,
      angle: 90,
      spread: 70,
      startVelocity: 60, // 속도 증가 (40 → 60)
    });
    
    // 연속 폭발 효과로 더 강조 (더 빠르게)
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 200, // 파티클 수 증가 (150 → 200)
        origin: { x: 0.5, y: 0.3 },
        colors: colors,
        angle: 90,
        spread: 50,
        startVelocity: 55, // 속도 증가 (35 → 55)
      });
    }, 50); // 지연 단축 (100ms → 50ms)
    
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 150, // 파티클 수 증가 (100 → 150)
        origin: { x: 0.5, y: 0.3 },
        colors: colors,
        angle: 90,
        spread: 40,
        startVelocity: 50, // 속도 증가 (30 → 50)
      });
    }, 100); // 지연 단축 (200ms → 100ms)

    // 추가 폭발 효과 (더 빠르게)
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount: 100, // 파티클 수 증가 (80 → 100)
        origin: { x: 0.3, y: 0.4 },
        colors: colors,
        angle: 60,
        spread: 45,
        startVelocity: 45,
      });
      confetti({
        ...defaults,
        particleCount: 100, // 파티클 수 증가 (80 → 100)
        origin: { x: 0.7, y: 0.4 },
        colors: colors,
        angle: 120,
        spread: 45,
        startVelocity: 45,
      });
    }, 200); // 시간 단축 (600ms → 200ms)

    // 좌우 발사 interval - 더 빠른 빈도 (150ms 간격)
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
    }, 150); // 발사 간격 단축 (300ms → 150ms)

    // 컴포넌트 언마운트 시 모든 confetti 파티클 제거
    return () => {
      clearInterval(interval);
      // 모든 confetti 파티클 즉시 제거
      confetti.reset();
    };
  }, [isSuccess]);
}

