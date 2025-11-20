"""
API용 예측 스크립트 - JSON 입력을 받아 예측 결과를 JSON으로 반환
"""
import json
import sys
import numpy as np
from pathlib import Path
from tensorflow import keras
from src import data_loader

CATEGORIES = ["cat", "dog", "airplane", "car", "bird"]

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
        
        # 모델 로드
        model_path = Path("models/quickdraw_rnn.keras")
        if not model_path.exists():
            result = {
                "predictedClass": "",
                "confidence": 0.0,
                "allProbabilities": {category: 0.0 for category in CATEGORIES},
                "error": "Model file not found"
            }
            print(json.dumps(result))
            return
        
        model = keras.models.load_model(model_path)
        
        # 전처리
        sequence = data_loader.drawing_to_sequence(drawing)
        input_array = sequence.reshape(1, 200, 3).astype(np.float32)
        
        # 예측
        predictions = model.predict(input_array, verbose=0)
        probabilities = predictions[0]
        
        # 결과 생성
        predicted_idx = np.argmax(probabilities)
        predicted_class = CATEGORIES[predicted_idx]
        confidence = float(probabilities[predicted_idx])
        
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

