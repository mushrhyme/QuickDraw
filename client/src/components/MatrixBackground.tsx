import { useEffect, useRef } from "react";

interface MatrixBackgroundProps {
  color?: string;
  opacity?: number;
  fontSize?: number;
  speed?: number;
  density?: number;
}

export default function MatrixBackground({ 
  color = "#26bfa6",
  opacity = 0.25,
  fontSize = 20,
  speed = 80,
  density = 0.6
}: MatrixBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chars = "01agefacedetectanalyzeprocessresultscorepredictdataimagepixelRGBHSVLABneuralnetworkmodelaccuracyconfidenceprobabilitytensorflowpytorchonnxopencvcv2numpyarraymatrixvector0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ{}[]()<>/\\|&%$#@!~`^*-+=.,;:?";
    const charArray = chars.split("");

    let columns = 0;
    let columnWidth = 0;
    let drops: number[] = [];

    const calculateColumns = () => {
      const baseColumns = Math.floor(canvas.width / fontSize);
      columns = Math.floor(baseColumns * density);
      columnWidth = canvas.width / columns;
      
      drops = [];
      for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * -100;
      }
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      calculateColumns();
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 38, g: 191, b: 166 };
    };

    const rgb = hexToRgb(color);

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const draw = () => {
      ctx.fillStyle = `rgba(0, 0, 0, 0.05)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        const x = i * columnWidth;
        const y = drops[i] * fontSize;

        ctx.fillText(text, x, y);

        drops[i]++;

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.99) {
          drops[i] = 0;
        }
      }
    };

    const interval = setInterval(draw, speed);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [color, opacity, fontSize, speed, density]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

