# 서버 학습 설정 가이드

다른 서버(A100 등)에서 모델 학습을 위한 파일 목록과 설정 방법입니다.

## 필요한 파일 목록

다음 파일들만 옮기면 됩니다:

```
quickdraw/
├── scripts/
│   └── download_quickdraw.py    # 데이터 다운로드 스크립트
├── src/
│   ├── data_loader.py           # 데이터 로딩 및 전처리
│   └── model.py                 # 모델 정의
├── train.py                     # 학습 스크립트 (개선됨)
├── requirements.txt             # Python 의존성
└── SERVER_SETUP.md              # 이 파일
```

**주의**: `data/raw/` 폴더와 `models/` 폴더는 서버에서 새로 생성됩니다.

## 설치 및 실행 방법

### 1. 파일 업로드
위 파일들을 서버에 업로드합니다.

### 2. Python 환경 설정
```bash
# Python 3.8 이상 필요
python3 --version

# 가상환경 생성 (선택사항)
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# 또는
venv\Scripts\activate  # Windows
```

### 3. 의존성 설치
```bash
pip install -r requirements.txt
```

### 4. GPU 확인 (A100 등)
```bash
# TensorFlow가 GPU를 인식하는지 확인
python3 -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"
```

### 5. 데이터 다운로드
```bash
# 학습할 클래스 목록을 수정하려면 scripts/download_quickdraw.py 편집
python3 scripts/download_quickdraw.py
```

### 6. 모델 학습
```bash
# train.py에서 CATEGORIES 리스트를 수정하여 클래스 수 조정
python3 train.py
```

## 클래스 수 늘리기

`train.py` 파일 상단의 `CATEGORIES` 리스트만 수정하면 됩니다:

```python
# 예: 10개 클래스로 확장
CATEGORIES = ["cat", "dog", "airplane", "car", "bird", 
              "house", "tree", "sun", "moon", "star"]
```

클래스 수가 15개 이상이면 자동으로 batch size가 조정됩니다.

## A100 GPU 사용 시

- **성능 저하 없음**: A100은 매우 강력한 GPU이므로 오히려 학습 속도가 크게 향상됩니다.
- **자동 인식**: TensorFlow가 자동으로 GPU를 인식하여 사용합니다.
- **메모리 최적화**: 코드에서 자동으로 GPU 메모리 증가 설정을 적용합니다.

## 학습 결과

학습이 완료되면 다음 파일들이 생성됩니다:

- `models/quickdraw_rnn_{클래스수}classes.keras` - 학습된 모델
- `models/history_{클래스수}classes_{타임스탬프}.json` - 학습 히스토리

## 문제 해결

### GPU가 인식되지 않는 경우
```bash
# CUDA 버전 확인
nvidia-smi

# TensorFlow GPU 버전 설치 확인
pip install tensorflow[and-cuda]
```

### 메모리 부족 오류
`train.py`에서 `BATCH_SIZE`를 줄이거나 `MAX_ITEMS_PER_CLASS`를 줄여보세요.

