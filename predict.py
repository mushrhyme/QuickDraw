"""
그린 그림을 예측하는 간단한 스크립트
"""
import json
import numpy as np
import sys
from pathlib import Path
from tensorflow import keras
from src import data_loader

CATEGORIES = ["cat", "dog", "airplane", "car", "bird"]

def main():
    """
    drawing.json 파일을 로드하고 예측 결과 출력
    """
    # 파일 경로 확인
    if len(sys.argv) > 1:
        drawing_path = Path(sys.argv[1])
    else:
        drawing_path = Path("drawing.json")
    
    if not drawing_path.exists():
        print(f"⚠️  파일을 찾을 수 없습니다: {drawing_path}")
        print("사용법: python predict.py [drawing.json 경로]")
        return
    
    # 모델 로드
    model_path = "models/quickdraw_rnn.keras"
    if not Path(model_path).exists():
        print(f"⚠️  모델 파일을 찾을 수 없습니다: {model_path}")
        print("먼저 train.py를 실행하여 모델을 학습시켜주세요.")
        return
    
    print(f"모델 로드 중: {model_path}")
    model = keras.models.load_model(model_path)
    
    # 그림 로드
    print(f"그림 로드 중: {drawing_path}")
    with open(drawing_path, 'r') as f:
        data = json.load(f)
    
    drawing = data.get('drawing', [])
    
    # 통계 출력
    total_points = sum(len(stroke[0]) for stroke in drawing)
    print(f"\n그림 통계:")
    print(f"  스트로크 수: {len(drawing)}")
    print(f"  포인트 수: {total_points}")
    
    # 전처리
    print("전처리 중...")
    sequence = data_loader.drawing_to_sequence(drawing)
    input_array = sequence.reshape(1, 200, 3).astype(np.float32)
    
    # 예측
    print("예측 중...")
    predictions = model.predict(input_array, verbose=0)
    probabilities = predictions[0]
    
    # 결과 출력
    predicted_idx = np.argmax(probabilities)
    predicted_class = CATEGORIES[predicted_idx]
    confidence = probabilities[predicted_idx]
    
    print(f"\n{'='*60}")
    print(f"예측 결과")
    print('='*60)
    print(f"예측된 클래스: {predicted_class}")
    print(f"확률: {confidence:.4f} ({confidence*100:.2f}%)")
    
    print(f"\n모든 클래스 확률:")
    for idx, class_name in enumerate(CATEGORIES):
        prob = probabilities[idx]
        marker = " ← 예측" if idx == predicted_idx else ""
        print(f"  {class_name}: {prob:.4f} ({prob*100:.2f}%){marker}")

if __name__ == "__main__":
    main()

