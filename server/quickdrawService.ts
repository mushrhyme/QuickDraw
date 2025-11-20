import { spawn } from "child_process";
import { resolve as pathResolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PredictionResult {
  predictedClass: string;
  confidence: number;
  allProbabilities: Record<string, number>;
}

export async function predictDrawing(
  drawing: number[][][]
): Promise<PredictionResult> {
  return new Promise((resolve, reject) => {
    // 프로젝트 루트 경로 계산
    let projectRoot: string;
    
    try {
      if (__dirname && __dirname !== "undefined") {
        projectRoot = pathResolve(__dirname, "..");
      } else {
        projectRoot = process.cwd();
      }
    } catch (error) {
      projectRoot = process.cwd();
    }
    
    const scriptPath = pathResolve(projectRoot, "predict_api.py");
    const onnxModelPath = pathResolve(projectRoot, "models", "quickdraw_rnn.onnx");
    
    // Python 명령어 (conda 환경 또는 기본 python)
    const pythonCommand = process.env.PYTHON_PATH || "python";
    
    // ONNX 모델 경로를 인자로 전달 (FaceAgeRank 방식)
    const pythonArgs = [scriptPath, onnxModelPath];
    
    const pythonProcess = spawn(pythonCommand, pythonArgs, {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error("Python script error:", stderr);
        reject(new Error(`Python script exited with code ${code}`));
        return;
      }

      try {
        // stdout에서 JSON 추출 (마지막 유효한 JSON 라인)
        const lines = stdout.trim().split('\n');
        let jsonLine = "";
        
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line.startsWith('{') && line.endsWith('}')) {
            jsonLine = line;
            break;
          }
        }
        
        if (!jsonLine) {
          jsonLine = stdout.trim();
        }

        const result = JSON.parse(jsonLine) as PredictionResult;
        resolve(result);
      } catch (error) {
        console.error("Failed to parse Python output:", stdout);
        reject(new Error("Failed to parse prediction result"));
      }
    });

    pythonProcess.on("error", (error: any) => {
      if (error.code === "ENOENT") {
        reject(new Error(`Python 실행 파일을 찾을 수 없습니다. (${pythonCommand}) PYTHON_PATH 환경 변수를 설정하거나 Python이 설치되어 있는지 확인하세요.`));
      } else {
        reject(new Error(`Python 스크립트 실행 중 오류: ${error.message}`));
      }
    });

    // JSON 데이터를 stdin으로 전송
    const input = JSON.stringify({ drawing });
    pythonProcess.stdin.write(input);
    pythonProcess.stdin.end();
  });
}

