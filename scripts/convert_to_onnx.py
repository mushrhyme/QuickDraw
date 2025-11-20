"""
TensorFlow Keras 모델을 ONNX 형식으로 변환하는 스크립트
"""
import os
import tf2onnx
import onnx
from tensorflow import keras

def convert_to_onnx():
    """
    TensorFlow Keras 모델을 ONNX 형식으로 변환
    
    모델 로드: models/quickdraw_rnn.keras
    저장 경로: models/quickdraw_rnn.onnx
    Opset 버전: 17
    """
    # 모델 경로 설정
    keras_model_path = "models/quickdraw_rnn.keras"
    onnx_model_path = "models/quickdraw_rnn.onnx"
    
    # 모델 디렉토리 확인
    if not os.path.exists(keras_model_path):
        raise FileNotFoundError(f"모델 파일을 찾을 수 없습니다: {keras_model_path}")
    
    # Keras 모델 로드
    print(f"모델 로드 중: {keras_model_path}")
    model = keras.models.load_model(keras_model_path)
    
    # 모델 입력 형태 확인 (예: (None, 200, 3))
    input_shape = model.input_shape  # (None, 200, 3)
    print(f"모델 입력 형태: {input_shape}")
    
    # ONNX 출력 디렉토리 생성
    os.makedirs("models", exist_ok=True)
    
    # ONNX로 변환
    # tf2onnx.convert.from_keras() 사용
    print("ONNX 변환 중...")
    onnx_model, _ = tf2onnx.convert.from_keras(
        model,
        output_path=onnx_model_path,
        opset=17,
        input_signature=None  # 자동으로 입력 서명 추론
    )
    
    print(f"Conversion complete: {onnx_model_path}")

if __name__ == "__main__":
    convert_to_onnx()

