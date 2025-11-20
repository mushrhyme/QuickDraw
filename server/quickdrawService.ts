import { spawn } from "child_process";
import { resolve as pathResolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CATEGORIES = ["cat", "dog", "airplane", "car", "bird"];

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
    // __dirname이 제대로 계산되지 않을 수 있으므로 여러 방법 시도
    let projectRoot: string;
    
    try {
      // 먼저 __dirname 기반으로 시도
      if (__dirname && __dirname !== "undefined") {
        projectRoot = pathResolve(__dirname, "..");
      } else {
        // __dirname이 없으면 process.cwd() 사용
        projectRoot = process.cwd();
      }
    } catch (error) {
      // 에러 발생 시 process.cwd() 사용
      projectRoot = process.cwd();
    }
    
    const scriptPath = pathResolve(projectRoot, "predict_api.py");
    
    console.log("Script path:", scriptPath);
    console.log("Project root:", projectRoot);
    console.log("__dirname:", __dirname);
    console.log("process.cwd():", process.cwd());
    
    const pythonProcess = spawn("python", [scriptPath], {
      cwd: projectRoot,
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
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        console.error("Failed to parse Python output:", stdout);
        reject(new Error("Failed to parse prediction result"));
      }
    });

    // JSON 데이터를 stdin으로 전송
    const input = JSON.stringify({ drawing });
    pythonProcess.stdin.write(input);
    pythonProcess.stdin.end();
  });
}

