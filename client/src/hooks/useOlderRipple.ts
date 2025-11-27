import { useEffect } from "react";

/**
 * 틀렸을 때 리플 효과를 표시하는 hook
 * @param isWrong 틀렸는지 여부
 */
export function useOlderRipple(isWrong: boolean) {
  useEffect(() => {
    if (!isWrong) return;

    // 캔버스 생성
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d")!;
    
    let radius = 0;
    const maxRadius = 160;  
    const fadeStart = 70;   // 서서히 투명해지는 지점
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight * 0.35; // 폭죽과 비슷한 위치

    // 폭죽과 유사한 민트색 계열 색상 (RGB 값)
    // '#26bfa6' -> rgb(38, 191, 166)
    // '#40e0d0' -> rgb(64, 224, 208)
    // '#7fffd4' -> rgb(127, 255, 212)
    // '#afffe6' -> rgb(175, 255, 230)
    const mintColors = [
      { r: 38, g: 191, b: 166 },   // #26bfa6
      { r: 64, g: 224, b: 208 },   // #40e0d0
      { r: 127, g: 255, b: 212 },  // #7fffd4
      { r: 175, g: 255, b: 230 },  // #afffe6
    ];

    // 랜덤 색상 선택
    const selectedColor = mintColors[Math.floor(Math.random() * mintColors.length)];

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 투명도 계산
      const opacity =
        radius < fadeStart
          ? 0.35
          : Math.max(0, 0.35 * (1 - (radius - fadeStart) / (maxRadius - fadeStart)));

      // 파동 그리기 - 민트색 계열 사용
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b}, ${opacity})`;
      ctx.lineWidth = 4;
      ctx.stroke();

      radius += 3; // 퍼지는 속도

      if (radius < maxRadius) {
        requestAnimationFrame(draw);
      } else {
        document.body.removeChild(canvas);
      }
    }

    draw();

    // cleanup
    return () => {
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, [isWrong]);
}


