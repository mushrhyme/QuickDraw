import { Router } from "express";
import { predictDrawing } from "./quickdrawService.js";
import { storage } from "./storage.js";
import { GoogleSheetsService } from "./googleSheets.js";
import { quickDrawResultSchema } from "../shared/schema.js";
import { getErrorMessage } from "../shared/utils.js";
import { CATEGORY_NAMES } from "../shared/categories.js";

const router = Router();

// 구글 시트 서비스 초기화 (환경 변수가 없으면 null)
let googleSheetsService: GoogleSheetsService | null = null;
try {
  googleSheetsService = new GoogleSheetsService();
} catch (error) {
  console.warn("⚠️ 구글 시트 서비스 초기화 실패 (결과 저장 기능 비활성화):", getErrorMessage(error));
}

/**
 * 사용자 정보 조회 API
 * 회사명과 사번으로 사용자 정보를 조회합니다.
 */
router.post("/user", async (req, res) => {
  try {
    const { company, employeeId } = req.body;

    if (!company || !employeeId) {
      return res.status(400).json({ error: "회사명과 사번이 필요합니다." });
    }

    const user = await storage.getUserByCompanyAndEmployeeId(company, employeeId);

    if (!user) {
      console.log("=".repeat(60));
      console.log("❌ 로그인 실패: 사용자를 찾을 수 없습니다");
      console.log("=".repeat(60));
      console.log("회사명:", company);
      console.log("사번:", employeeId);
      console.log("=".repeat(60));
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    // 콘솔 로그: 로그인 성공 정보
    console.log("=".repeat(60));
    console.log("✅ 로그인 성공");
    console.log("=".repeat(60));
    console.log("회사명:", company);
    console.log("사번:", employeeId);
    console.log("사용자 정보:", {
      id: user.id,
      name: user.name || "N/A",
      company: user.company || company,
      employeeId: user.employeeId || employeeId,
      department: user.department || "N/A",
    });
    console.log("=".repeat(60));

    res.json(user);
  } catch (error) {
    console.error("사용자 조회 오류:", error);
    res.status(500).json({ error: "사용자 조회 실패" });
  }
});

/**
 * QuickDraw 결과 저장 API
 * 분석 결과를 구글 시트에 저장합니다.
 */
router.post("/save-result", async (req, res) => {
  try {
    if (!googleSheetsService) {
      return res.status(503).json({ error: "구글 시트 서비스가 설정되지 않았습니다." });
    }

    // 요청 데이터 검증
    const validationResult = quickDrawResultSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error("스키마 검증 실패:", validationResult.error.errors);
      return res.status(400).json({ 
        error: "잘못된 요청 데이터입니다.",
        details: validationResult.error.errors 
      });
    }

    const data = validationResult.data;
    
    // 콘솔 로그: 결과 저장 시작
    console.log("=".repeat(60));
    console.log("💾 결과 저장 시작");
    console.log("=".repeat(60));
    console.log("사용자 정보:", {
      회사명: data.company,
      사번: data.employeeId,
      이름: data.name,
      부서: data.department || "N/A",
    });
    console.log("그림 정보:", {
      목표_카테고리: `${data.targetClass} (${CATEGORY_NAMES[data.targetClass] || data.targetClass})`,
      예측_카테고리: data.predictedClass ? `${data.predictedClass} (${CATEGORY_NAMES[data.predictedClass] || data.predictedClass})` : "예측 불가",
      유사도: `${(data.confidence * 100).toFixed(1)}%`,
      그리기_시간: `${data.drawingTime.toFixed(1)}초`,
      성공_여부: data.predictedClass === data.targetClass && data.confidence >= 0.5 ? "✅ 성공" : "❌ 실패",
    });
    console.log("완료 시간:", data.completedAt);
    
    // 구글 시트에 저장
    await googleSheetsService.saveQuickDrawResult(data);

    console.log("✅ 결과 저장 완료");
    console.log("=".repeat(60));

    res.json({ success: true, message: "결과가 저장되었습니다." });
  } catch (error: any) {
    console.error("결과 저장 오류:", error);
    console.error("에러 타입:", error?.constructor?.name);
    console.error("에러 메시지:", error?.message);
    console.error("에러 스택:", error?.stack);
    if (error?.response) {
      console.error("API 응답 상태:", error.response.status);
      console.error("API 응답 데이터:", error.response.data);
    }
    res.status(500).json({ 
      error: "결과 저장 실패",
      message: error?.message || String(error),
      details: error?.response?.data || undefined
    });
  }
});

router.post("/predict", async (req, res) => {
  try {
    const { drawing, user } = req.body;

    if (!drawing || !Array.isArray(drawing)) {
      return res.status(400).json({ error: "Invalid drawing data" });
    }

    // 사용자 정보가 있으면 로그 출력
    if (user) {
      console.log(`🎨 예측 요청 [${user.name || user.employeeId} (${user.company})]`);
    }

    const result = await predictDrawing(drawing);
    
    // 예측 결과와 함께 사용자 정보 로그 출력
    if (user) {
      console.log(`   → 예측: ${result.predictedClass} (${(result.confidence * 100).toFixed(1)}%)`);
    }
    
    res.json(result);
  } catch (error) {
    console.error("예측 오류:", error);
    res.status(500).json({ error: "예측 실패" });
  }
});

export default router;

