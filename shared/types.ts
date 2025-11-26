export type Step = "login" | "welcome" | "guide" | "classGuide" | "drawing" | "result";

export interface LoginInfo {
  company: string;
  employeeId: string;
}

export interface User {
  id: string;
  company: string;
  employeeId: string;
  name: string;
  department: string;
}

export interface DrawingResult {
  predictedClass: string;
  confidence: number;
  drawingTime: number; // 초 단위
  success: boolean; // 80% 이상 정확도로 맞췄는지 여부
}

