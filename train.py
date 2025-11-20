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
from src.model import build_model

# ============================================================================
# 설정 (클래스 수를 늘리려면 여기서 categories 리스트만 수정하면 됩니다)
# ============================================================================
CATEGORIES = ["cat", "dog", "airplane", "car", "bird"]  # 클래스 추가: 예) ["cat", "dog", "airplane", "car", "bird", "house", "tree", ...]
MAX_ITEMS_PER_CLASS = 20000  # 클래스당 최대 샘플 수 (None이면 전체 사용)
BATCH_SIZE = 64  # 클래스 수가 많으면 128로 증가 권장
EPOCHS = 50  # 클래스 수가 많으면 더 많은 epoch 필요할 수 있음
VALIDATION_SPLIT = 0.2  # 검증 데이터 비율

# 클래스 수에 따른 자동 설정 조정
NUM_CLASSES = len(CATEGORIES)
if NUM_CLASSES > 15:  # 클래스가 많으면 batch size 증가
    BATCH_SIZE = max(BATCH_SIZE, 128)
    print(f"⚠️  클래스 수가 많아 batch size를 {BATCH_SIZE}로 조정했습니다.")

def main():
    """
    QuickDraw 분류 모델 학습
    
    클래스 수를 늘리려면 위의 CATEGORIES 리스트만 수정하면 됩니다.
    A100 GPU 사용 시 자동으로 GPU를 인식하여 학습합니다.
    """
    print("="*70)
    print("QuickDraw RNN 모델 학습 시작")
    print("="*70)
    print(f"클래스 수: {NUM_CLASSES}")
    print(f"클래스 목록: {', '.join(CATEGORIES)}")
    print(f"클래스당 최대 샘플: {MAX_ITEMS_PER_CLASS or '전체'}")
    print(f"Batch size: {BATCH_SIZE}")
    print(f"최대 Epochs: {EPOCHS}")
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
    model = build_model(num_classes=NUM_CLASSES)
    print("\n모델 구조:")
    model.summary()
    
    # 콜백 설정
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_dir = "models"
    os.makedirs(model_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, f"quickdraw_rnn_{NUM_CLASSES}classes.keras")
    history_path = os.path.join(model_dir, f"history_{NUM_CLASSES}classes_{timestamp}.json")
    
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
            patience=3,
            min_lr=1e-6,
            verbose=1
        ),
        EarlyStopping(
            monitor='val_loss',
            patience=7,  # 클래스 수가 많으면 patience 증가
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
    print("="*70)

if __name__ == "__main__":
    main()

