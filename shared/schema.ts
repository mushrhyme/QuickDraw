import { z } from "zod";

export const predictRequestSchema = z.object({
  drawing: z.array(
    z.tuple([z.array(z.number()), z.array(z.number())])
  ),
});

export type PredictRequest = z.infer<typeof predictRequestSchema>;

export const predictResponseSchema = z.object({
  predictedClass: z.string(),
  confidence: z.number(),
  allProbabilities: z.record(z.string(), z.number()),
});

export type PredictResponse = z.infer<typeof predictResponseSchema>;

// 사용자 스키마 정의
export const userSchema = z.object({
  id: z.string(),
  company: z.string(),
  employeeId: z.string(),
  name: z.string(),
  department: z.string(),
});

export type User = z.infer<typeof userSchema>;

// QuickDraw 결과 저장 스키마
export const quickDrawResultSchema = z.object({
  company: z.string().min(1),
  employeeId: z.string().min(1),
  name: z.string().min(1),
  department: z.string().min(1),
  targetClass: z.string().min(1), // 목표 그림
  predictedClass: z.string().min(1), // 예측 그림
  confidence: z.number().min(0).max(1), // 유사도 (0~1)
  drawingTime: z.number().positive(), // 소요 시간 (초)
  completedAt: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/), // YYYY-MM-DD HH:MM:SS 형식
});

export type QuickDrawResult = z.infer<typeof quickDrawResultSchema>;

// 랭킹 데이터 스키마 정의
export const rankingDataSchema = z.object({
  company: z.string(),
  employeeId: z.string(),
  name: z.string(),
  department: z.string(),
  targetClass: z.string(), // 목표 그림
  drawingTime: z.number().positive(), // 소요 시간 (초)
  completedAt: z.string(), // 완료 시각
});

export type RankingData = z.infer<typeof rankingDataSchema>;

