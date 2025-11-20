import { useEffect, useState } from "react";

interface CountdownProps {
  initialCount: number;
  onComplete: () => void;
}

export default function Countdown({ initialCount, onComplete }: CountdownProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="relative">
        <div
          className="text-white font-bold transition-all duration-300"
          style={{
            fontSize: "10rem",
            lineHeight: 1,
            animation: "scaleIn 0.3s ease-out",
          }}
        >
          {count}
        </div>
        <div
          className="absolute inset-0 rounded-full border-4 border-white/20"
          style={{
            width: "12rem",
            height: "12rem",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
      <style>{`
        @keyframes scaleIn {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

