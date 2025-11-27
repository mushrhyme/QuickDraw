/**
 * QuickDraw 카테고리 설정
 * Python과 TypeScript 모두에서 사용하는 공통 설정
 * 
 * 특정 카테고리만 사용하려면 아래 ACTIVE_CATEGORIES를 직접 수정하세요.
 */

// 전체 카테고리 목록
// ⚠️ 중요: 이 순서는 모델 학습 시 사용된 순서와 정확히 일치해야 합니다!
// 모델 학습 순서: cat, dog, airplane, car, bird, donut, horse, elephant, fan, fire hydrant
export const CATEGORIES = [
  "cat", "dog", "airplane", "car", "bird", "donut", 
  "horse", "elephant", "fan", "fire hydrant"] as const;

export const CATEGORY_NAMES: Record<string, string> = {
  cat: "고양이",
  dog: "강아지",
  airplane: "비행기",
  car: "자동차",
  bird: "새",
  donut: "도넛",
  horse: "말",
  elephant: "코끼리",
  fan: "선풍기",
  "fire hydrant": "소화전",
};

export type Category = typeof CATEGORIES[number];

/**
 * 활성 카테고리 목록 (문제로 사용할 카테고리)
 * 
 * ⚠️ 특정 카테고리만 사용하려면 아래 배열을 수정하세요.
 * 
 * 사용 예시:
 * - 전체 카테고리 사용: null
 * - 특정 카테고리만 사용: ["cat", "dog", "airplane"]
 * 
 * 현재 설정: 도넛 제외 (모델에는 있지만 제시어에서는 제외)
 */
export const ACTIVE_CATEGORIES: readonly string[] | null = [
  "cat", "dog", "airplane", "car", "bird", 
  "horse", "elephant", "fan", "fire hydrant"
] as const;

/**
 * 실제 문제로 사용할 카테고리 목록
 * ACTIVE_CATEGORIES가 있으면 그것을 사용, 없으면 전체 CATEGORIES 사용
 */
export const GAME_CATEGORIES: readonly string[] = ACTIVE_CATEGORIES || CATEGORIES;
