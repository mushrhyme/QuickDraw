"""
API용 예측 스크립트 - JSON 입력을 받아 예측 결과를 JSON으로 반환
ONNX 모델 사용 (FaceAgeRank 방식)
"""
import json
import sys
import os
import time
import numpy as np
from pathlib import Path
import onnxruntime as ort
from src import data_loader

CATEGORIES = ["cat", "dog", "airplane", "car", "bird"]

# 모델 로드 시간 측정
model_load_start = time.time()

# ONNX 모델 경로 결정: 명령줄 인자 > 환경 변수 > 기본값
onnx_model_path = None
if len(sys.argv) >= 2:
    onnx_model_path = sys.argv[1]  # 첫 번째 인자로 ONNX 모델 경로 지정

if not onnx_model_path:
    onnx_model_path = os.getenv("ONNX_MODEL_PATH", "models/quickdraw_rnn.onnx")

# 절대 경로로 변환 (상대 경로인 경우)
if not os.path.isabs(onnx_model_path):
    # 현재 작업 디렉토리 기준으로 절대 경로 생성
    onnx_model_path = os.path.abspath(onnx_model_path)

# ONNX 모델 파일 존재 확인 및 로드
onnx_session = None
onnx_load_error = None
onnx_load_time = 0

if not os.path.exists(onnx_model_path):
    onnx_load_error = f"ONNX 모델 파일을 찾을 수 없습니다: {onnx_model_path}"
else:
    # ONNX 모델 로드
    try:
        onnx_load_start = time.time()
        onnx_session = ort.InferenceSession(onnx_model_path, providers=["CPUExecutionProvider"])
        onnx_load_time = time.time() - onnx_load_start
        print(f"✅ ONNX 모델 로드 성공: {onnx_model_path}", file=sys.stderr)
    except Exception as e:
        onnx_load_error = f"ONNX 모델 로드 실패: {str(e)}"

model_load_time = time.time() - model_load_start
# 모델 로드 시간을 stderr에 출력 (디버깅용)
print(f"[타이밍] ONNX 로드: {onnx_load_time:.2f}초 | 모델 로드 전체: {model_load_time:.2f}초", file=sys.stderr)

def main():
    """
    stdin에서 JSON을 읽고 예측 결과를 stdout에 JSON으로 출력
    """
    try:
        # stdin에서 JSON 읽기
        input_data = json.load(sys.stdin)
        drawing = input_data.get('drawing', [])
        
        if not drawing:
            result = {
                "predictedClass": "",
                "confidence": 0.0,
                "allProbabilities": {category: 0.0 for category in CATEGORIES}
            }
            print(json.dumps(result))
            return
        
        # ONNX 모델 로드 에러 확인
        if onnx_load_error or onnx_session is None:
            result = {
                "predictedClass": "",
                "confidence": 0.0,
                "allProbabilities": {category: 0.0 for category in CATEGORIES},
                "error": onnx_load_error or "ONNX 모델이 로드되지 않았습니다."
            }
            print(json.dumps(result))
            return
        
        # 전처리
        sequence = data_loader.drawing_to_sequence(drawing)
        input_array = sequence.reshape(1, 200, 3).astype(np.float32)
        
        # ONNX 모델 입력 이름 확인
        input_name = onnx_session.get_inputs()[0].name
        output_name = onnx_session.get_outputs()[0].name
        
        # 예측 (ONNX)
        predictions = onnx_session.run([output_name], {input_name: input_array})[0]
        probabilities = predictions[0]  # (5,) 형태
        
        # 확률 정규화 (softmax가 이미 적용되어 있지만, 안전을 위해 정규화)
        # ONNX 모델 출력이 로그 확률일 수도 있으므로 확인
        probabilities_sum = np.sum(probabilities)
        if probabilities_sum > 1.1 or probabilities_sum < 0.9:  # 합이 1에 가깝지 않으면 정규화
            probabilities = probabilities / probabilities_sum
        
        # 결과 생성
        predicted_idx = np.argmax(probabilities)
        predicted_class = CATEGORIES[predicted_idx]
        confidence = float(probabilities[predicted_idx])
        
        # 디버깅: 예측 결과 출력
        print(f"[디버깅] 예측 클래스: {predicted_class}, 확률: {confidence:.4f}, 전체 확률 합: {np.sum(probabilities):.4f}", file=sys.stderr)
        print(f"[디버깅] 전체 확률 분포: {dict(zip(CATEGORIES, [float(p) for p in probabilities]))}", file=sys.stderr)
        
        all_probabilities = {
            category: float(prob) for category, prob in zip(CATEGORIES, probabilities)
        }
        
        result = {
            "predictedClass": predicted_class,
            "confidence": confidence,
            "allProbabilities": all_probabilities
        }
        
        # JSON으로 출력
        print(json.dumps(result))
        
    except Exception as e:
        result = {
            "predictedClass": "",
            "confidence": 0.0,
            "allProbabilities": {category: 0.0 for category in CATEGORIES},
            "error": str(e)
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()

