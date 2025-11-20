import { Router } from "express";
import { predictDrawing } from "./quickdrawService.js";

const router = Router();

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

