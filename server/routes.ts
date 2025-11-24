import { Router } from "express";
import { predictDrawing } from "./quickdrawService.js";
import { storage } from "./storage.js";
import { GoogleSheetsService } from "./googleSheets.js";
import { quickDrawResultSchema } from "../shared/schema.js";
import { formatKSTDateTime, getErrorMessage } from "../shared/utils.js";

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
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

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
    // 구글 시트에 저장
    await googleSheetsService.saveQuickDrawResult(data);

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
    const { drawing } = req.body;

    if (!drawing || !Array.isArray(drawing)) {
      return res.status(400).json({ error: "Invalid drawing data" });
    }

    const result = await predictDrawing(drawing);
    res.json(result);
  } catch (error) {
    console.error("예측 오류:", error);
    res.status(500).json({ error: "예측 실패" });
  }
});

export default router;

