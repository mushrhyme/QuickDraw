import os
import json
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from datetime import datetime

# TensorFlow 2.x 호환성을 위한 import
try:
    from tensorflow.keras.callbacks import ReduceLROnPlateau, EarlyStopping, ModelCheckpoint
except ImportError:
    from keras.callbacks import ReduceLROnPlateau, EarlyStopping, ModelCheckpoint

from src import data_loader
from src.model_strict import build_model  # 엄격한 모델 사용

# ============================================================================
# 설정 (클래스 수를 늘리려면 여기서 categories 리스트만 수정하면 됩니다)
# ============================================================================
CATEGORIES = [
        "cat", "dog", "airplane", "car", "bird", 
        "donut", "horse", "elephant", "fan", "fire hydrant"
        ]
MAX_ITEMS_PER_CLASS = 10000  # 클래스당 최대 샘플 수 (None이면 전체 사용)
BATCH_SIZE = 512  # 클래스 수가 많으면 128로 증가 권장
EPOCHS = 40  # 엄격한 모델: 더 많은 epoch 필요 (정규화가 강해서)
VALIDATION_SPLIT = 0.2  # 검증 데이터 비율

# 엄격한 모델 설정 (더 강한 정규화)
DROPOUT_RATE = 0.65  # Dropout 비율 (엄격한 모델: 기본값 0.65)
L2_REG = 1e-3  # L2 정규화 계수 (엄격한 모델: 기본값 1e-3, 더 강한 정규화)
LEARNING_RATE = 5e-4  # 초기 학습률 (엄격한 모델: 기본값 5e-4, 더 작은 학습률)
USE_BATCH_NORM = True  # Batch Normalization 사용 여부

# 클래스 수에 따른 자동 설정 조정
NUM_CLASSES = len(CATEGORIES)

# 클래스 수가 많을수록 과적합 위험이 증가하므로 정규화 더 강화
if NUM_CLASSES >= 10:  # 10개 이상이면 정규화 더 강화
    DROPOUT_RATE = 0.7  # Dropout 더 증가
    L2_REG = 1.5e-3  # L2 정규화 더 강화
    print(f"⚠️  클래스 수가 {NUM_CLASSES}개로 많아 정규화를 더 강화했습니다.")
    print(f"   - Dropout: {DROPOUT_RATE}, L2: {L2_REG}")
elif NUM_CLASSES >= 15:  # 15개 이상이면 더 강화
    DROPOUT_RATE = 0.75
    L2_REG = 2e-3
    print(f"⚠️  클래스 수가 {NUM_CLASSES}개로 매우 많아 정규화를 더 강화했습니다.")
    print(f"   - Dropout: {DROPOUT_RATE}, L2: {L2_REG}")

if NUM_CLASSES > 15:  # 클래스가 많으면 batch size 증가
    BATCH_SIZE = max(BATCH_SIZE, 128)
    print(f"⚠️  클래스 수가 많아 batch size를 {BATCH_SIZE}로 조정했습니다.")

def main():
    """
    QuickDraw 분류 모델 학습 - 엄격한 버전
    
    기존 모델 대비 개선사항:
    1. 더 강한 정규화: Dropout 0.65, L2 1e-3
    2. Batch Normalization 사용
    3. 더 작은 학습률: 5e-4
    4. 더 많은 epoch: 40 (정규화가 강해서 더 많은 학습 필요)
    5. 더 긴 patience: EarlyStopping patience 증가
    
    클래스 수를 늘리려면 위의 CATEGORIES 리스트만 수정하면 됩니다.
    A100 GPU 사용 시 자동으로 GPU를 인식하여 학습합니다.
    """
    print("="*70)
    print("QuickDraw 엄격한 모델 학습 시작 (Strict Model)")
    print("="*70)
    print(f"클래스 수: {NUM_CLASSES}")
    print(f"클래스 목록: {', '.join(CATEGORIES)}")
    print(f"클래스당 최대 샘플: {MAX_ITEMS_PER_CLASS or '전체'}")
    print(f"Batch size: {BATCH_SIZE}")
    print(f"최대 Epochs: {EPOCHS}")
    print(f"모델 타입: 엄격한 모델 (강한 정규화)")
    print("="*70)
    
    # GPU 확인
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        print(f"✓ GPU 감지: {len(gpus)}개")
        for i, gpu in enumerate(gpus):
            print(f"  GPU {i}: {gpu.name}")
        # GPU 메모리 증가 설정 (A100 등 대용량 GPU에 유리)
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
        except RuntimeError as e:
            print(f"  GPU 설정 경고: {e}")
    else:
        print("⚠️  GPU를 찾을 수 없습니다. CPU로 학습합니다.")
    
    # 데이터 로딩
    print("\n[1/5] 데이터 로딩 중...")
    X, y = data_loader.load_dataset(
        categories=CATEGORIES, 
        base_path="data/raw", 
        max_items=MAX_ITEMS_PER_CLASS
    )
    print(f"✓ 총 {len(X):,}개 샘플 로드 완료")
    print(f"  클래스별 샘플 수: {np.bincount(y)}")
    
    # 데이터 분할
    print("\n[2/5] 데이터 분할 중...")
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, 
        test_size=VALIDATION_SPLIT, 
        stratify=y,  # 클래스 비율 유지
        random_state=42
    )
    print(f"✓ 학습 데이터: {len(X_train):,}개")
    print(f"✓ 검증 데이터: {len(X_val):,}개")
    
    # 데이터셋 생성 (tf.data로 최적화)
    print("\n[3/5] 데이터셋 생성 중...")
    train_ds = tf.data.Dataset.from_tensor_slices((X_train, y_train))
    train_ds = train_ds.shuffle(buffer_size=min(10000, len(X_train))).batch(BATCH_SIZE)
    train_ds = train_ds.prefetch(tf.data.AUTOTUNE)  # GPU 활용 최적화
    
    val_ds = tf.data.Dataset.from_tensor_slices((X_val, y_val))
    val_ds = val_ds.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)
    print(f"✓ Batch size: {BATCH_SIZE}")
    
    # 모델 생성
    print("\n[4/5] 모델 생성 중...")
    print(f"엄격한 모델 설정:")
    print(f"  - Dropout rate: {DROPOUT_RATE}")
    print(f"  - L2 regularization: {L2_REG}")
    print(f"  - Learning rate: {LEARNING_RATE}")
    print(f"  - Batch Normalization: {USE_BATCH_NORM}")
    model = build_model(
        num_classes=NUM_CLASSES,
        dropout_rate=DROPOUT_RATE,
        l2_reg=L2_REG,
        learning_rate=LEARNING_RATE,
        use_batch_norm=USE_BATCH_NORM
    )
    print("\n모델 구조:")
    model.summary()
    
    # 콜백 설정
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_dir = "models"
    os.makedirs(model_dir, exist_ok=True)
    
    # 엄격한 모델은 파일명에 _strict 추가
    model_path = os.path.join(model_dir, f"quickdraw_rnn_{NUM_CLASSES}classes_strict.keras")
    history_path = os.path.join(model_dir, f"history_{NUM_CLASSES}classes_strict_{timestamp}.json")
    
    # 엄격한 모델은 더 긴 patience 사용 (정규화가 강해서 더 많은 학습 필요)
    early_stopping_patience = 12  # 기본값보다 증가 (7 → 12)
    reduce_lr_patience = 5  # 기본값보다 증가 (3 → 5)
    
    callbacks = [
        ModelCheckpoint(
            filepath=model_path,
            monitor='val_loss',
            save_best_only=True,  # 최고 성능 모델만 저장
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=reduce_lr_patience,  # 엄격한 모델: 더 긴 patience
            min_lr=1e-6,
            verbose=1
        ),
        EarlyStopping(
            monitor='val_loss',
            patience=early_stopping_patience,  # 엄격한 모델: 더 긴 patience
            restore_best_weights=True,
            verbose=1
        )
    ]
    
    # 학습
    print("\n[5/5] 모델 학습 시작...")
    print("-"*70)
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS,
        callbacks=callbacks,
        verbose=1
    )
    print("-"*70)
    
    # 학습 히스토리 저장
    history_dict = {
        'categories': CATEGORIES,
        'num_classes': NUM_CLASSES,
        'model_type': 'strict',  # 모델 타입 표시
        'dropout_rate': DROPOUT_RATE,
        'l2_reg': L2_REG,
        'learning_rate': LEARNING_RATE,
        'use_batch_norm': USE_BATCH_NORM,
        'train_samples': len(X_train),
        'val_samples': len(X_val),
        'batch_size': BATCH_SIZE,
        'history': {
            'loss': [float(x) for x in history.history['loss']],
            'accuracy': [float(x) for x in history.history['accuracy']],
            'val_loss': [float(x) for x in history.history['val_loss']],
            'val_accuracy': [float(x) for x in history.history['val_accuracy']]
        }
    }
    
    with open(history_path, 'w') as f:
        json.dump(history_dict, f, indent=2)
    
    # 최종 결과 출력
    final_val_acc = max(history.history['val_accuracy'])
    final_train_acc = max(history.history['accuracy'])
    
    print("\n" + "="*70)
    print("학습 완료!")
    print("="*70)
    print(f"✓ 모델 저장: {model_path}")
    print(f"✓ 히스토리 저장: {history_path}")
    print(f"\n최종 성능:")
    print(f"  학습 정확도: {final_train_acc:.4f} ({final_train_acc*100:.2f}%)")
    print(f"  검증 정확도: {final_val_acc:.4f} ({final_val_acc*100:.2f}%)")
    print(f"\n💡 엄격한 모델은 더 강한 정규화를 사용하므로,")
    print(f"   대충 그린 그림에 대해 더 낮은 confidence를 출력할 수 있습니다.")
    print("="*70)

if __name__ == "__main__":
    main()

