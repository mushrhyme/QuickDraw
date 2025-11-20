# QuickDraw RNN 분류기

QuickDraw 데이터셋을 사용하여 그린 그림을 분류하는 RNN 모델입니다.

## 사용 순서

### 1. 데이터 다운로드

학습에 필요한 QuickDraw 데이터를 다운로드합니다.

```bash
python scripts/download_quickdraw.py
```

- 다운로드 위치: `data/raw/`
- 다운로드 카테고리: cat, dog, airplane, car, bird
- 각 카테고리당 최대 20,000개 샘플 (빠른 학습을 위해)

### 2. 모델 학습

다운로드한 데이터로 모델을 학습시킵니다.

```bash
python train.py
```

- 학습 설정:
  - 각 클래스당 20,000개 샘플 사용
  - Train/Validation 분할: 80/20
  - 최대 30 epochs (Early Stopping 적용)
  - Batch size: 64
- 모델 저장 위치: `models/quickdraw_rnn.keras`

### 3. (선택) ONNX 변환

모델을 ONNX 형식으로 변환합니다 (다른 플랫폼에서 사용 시).

```bash
python scripts/convert_to_onnx.py
```

- 변환된 모델: `models/quickdraw_rnn.onnx`

### 4. 그림 그리기 및 예측

웹 브라우저에서 `public/draw_test.html`을 열어 그림을 그립니다.

**사용 방법:**
1. 브라우저에서 `public/draw_test.html` 열기
2. 캔버스에 그림 그리기
   - 💡 팁: 빠르게 그리고, 자주 손을 떼어 여러 스트로크로 그리세요
   - 학습 데이터는 보통 3-5개 스트로크, 30-70개 포인트로 구성됩니다
   - 포인트는 자동으로 샘플링되어 기록됩니다
3. "Export JSON" 버튼 클릭하여 `drawing.json` 다운로드
4. Python으로 예측 실행:

```bash
# 간단한 예측 스크립트 (필요시 생성)
python predict.py drawing.json
```

## 프로젝트 구조

```
quickdraw/
├── data/raw/              # 학습 데이터 (ndjson 파일들)
├── models/                # 학습된 모델
│   └── quickdraw_rnn.keras
├── public/                # 웹 인터페이스
│   └── draw_test.html
├── scripts/              # 유틸리티 스크립트
│   ├── download_quickdraw.py
│   └── convert_to_onnx.py
├── src/                  # 핵심 코드
│   ├── data_loader.py    # 데이터 로딩 및 전처리
│   └── model.py          # 모델 정의
└── train.py             # 학습 스크립트
```

## 모델 구조

- **Input**: (200, 3) - 시퀀스 길이 200, 특징 3개 (Δx, Δy, end_flag)
- **Architecture**:
  - Masking layer
  - Bidirectional LSTM(128)
  - Dropout(0.5)
  - Dense(5, softmax)
- **Classes**: cat, dog, airplane, car, bird

## 요구사항

```bash
pip install tensorflow numpy scikit-learn requests tqdm tf2onnx onnxruntime
```

## 참고사항

- 학습 데이터는 Google QuickDraw 데이터셋을 사용합니다
- 모델은 간단한 그림에 최적화되어 있습니다
- 복잡한 그림은 더 간단하게 그리면 인식률이 향상됩니다

