# QuickDraw

QuickDraw 데이터셋을 사용하여 그린 그림을 분류하는 RNN 모델 및 React 웹 애플리케이션입니다.

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

### 4. 웹 애플리케이션 실행

React 기반 웹 애플리케이션을 실행합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하여 그림 그리기 및 실시간 예측을 사용할 수 있습니다.

**참고**: Python 의존성도 설치되어 있어야 합니다:
```bash
pip install -r requirements.txt
```

## 프로젝트 구조

```
quickdraw/
├── client/                # React 프론트엔드
│   ├── src/
│   │   ├── components/   # React 컴포넌트
│   │   ├── pages/        # 페이지 컴포넌트
│   │   └── lib/          # 유틸리티
│   └── public/           # 정적 파일
├── server/                # Express 백엔드
│   ├── index.ts          # 서버 진입점
│   ├── routes.ts         # API 라우트
│   └── vite.ts           # Vite 설정
├── data/raw/              # 학습 데이터 (ndjson 파일들)
├── models/                # 학습된 모델
│   └── quickdraw_rnn.keras
├── public/                # 기존 HTML 인터페이스
│   └── draw_test.html
├── scripts/              # 유틸리티 스크립트
│   ├── download_quickdraw.py
│   └── convert_to_onnx.py
├── src/                  # 핵심 코드
│   ├── data_loader.py    # 데이터 로딩 및 전처리
│   └── model.py          # 모델 정의
├── shared/               # 공유 타입 및 스키마
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

### Python
```bash
pip install tensorflow numpy scikit-learn requests tqdm tf2onnx onnxruntime
```

### Node.js
```bash
npm install
```

## 참고사항

- 학습 데이터는 Google QuickDraw 데이터셋을 사용합니다
- 모델은 간단한 그림에 최적화되어 있습니다
- 복잡한 그림은 더 간단하게 그리면 인식률이 향상됩니다
- 실시간 예측: 그림을 그리는 동안 80% 이상 정확도로 목표 클래스를 맞추면 자동으로 다음 단계로 진행됩니다
