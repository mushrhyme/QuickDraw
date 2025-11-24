import os
import json
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split
from datetime import datetime
from pathlib import Path

# TensorFlow 2.x 호환성을 위한 import
try:
    from tensorflow.keras.callbacks import ReduceLROnPlateau, EarlyStopping, ModelCheckpoint
except ImportError:
    from keras.callbacks import ReduceLROnPlateau, EarlyStopping, ModelCheckpoint

from src import data_loader
from src.model import build_model

# ============================================================================
# 설정 (카테고리는 shared/categories.json에서 자동으로 로드됩니다)
# ============================================================================
# 공통 카테고리 설정 파일에서 로드
categories_json_path = Path(__file__).parent / "shared" / "categories.json"
if categories_json_path.exists():
    with open(categories_json_path, 'r', encoding='utf-8') as f:
        categories_data = json.load(f)
        # 학습 시에는 항상 전체 categories 사용 (모델은 전체 카테고리로 학습)
        CATEGORIES = categories_data["categories"]
else:
    # 기본값 (파일이 없을 경우)
    CATEGORIES = ["fan", "fire hydrant", "horse", "elephant", "donut"]
MAX_ITEMS_PER_CLASS = 3000  # 클래스당 최대 샘플 수 (5개 클래스 시와 유사한 학습 시간을 위해 3000으로 설정)
BATCH_SIZE = 256  # 초기 배치 사이즈 (Metal GPU 사용 시 자동으로 512로 증가)
EPOCHS = 50  # 클래스 수가 많으면 더 많은 epoch 필요할 수 있음
VALIDATION_SPLIT = 0.2  # 검증 데이터 비율
USE_MIXED_PRECISION = False  # Metal GPU에서는 Mixed Precision이 타입 불일치 문제를 일으킬 수 있어 비활성화

# 과적합 방지 설정 (기본값)
DROPOUT_RATE = 0.6  # Dropout 비율 (클래스 수에 따라 자동 조정됨)
LSTM_UNITS = 96  # LSTM 유닛 수 (클래스 수에 따라 자동 조정됨)
L2_REG = 1e-4  # L2 정규화 계수 (클래스 수에 따라 자동 조정됨)

# 클래스 수에 따른 자동 설정 조정
NUM_CLASSES = len(CATEGORIES)

# 클래스 수가 많을수록 과적합 위험이 증가하므로 정규화 강화
if NUM_CLASSES >= 10:  # 10개 이상이면 정규화 강화
    DROPOUT_RATE = 0.65  # Dropout 증가
    L2_REG = 5e-4  # L2 정규화 강화
    print(f"⚠️  클래스 수가 {NUM_CLASSES}개로 많아 정규화를 강화했습니다.")
    print(f"   - Dropout: {DROPOUT_RATE}, L2: {L2_REG}")
elif NUM_CLASSES >= 15:  # 15개 이상이면 더 강화
    DROPOUT_RATE = 0.7
    LSTM_UNITS = 80  # 모델 복잡도 추가 감소
    L2_REG = 1e-3
    print(f"⚠️  클래스 수가 {NUM_CLASSES}개로 매우 많아 정규화를 더 강화했습니다.")
    print(f"   - Dropout: {DROPOUT_RATE}, LSTM units: {LSTM_UNITS}, L2: {L2_REG}")

if NUM_CLASSES > 15:  # 클래스가 많으면 batch size 증가
    BATCH_SIZE = max(BATCH_SIZE, 512)
    print(f"⚠️  클래스 수가 많아 batch size를 {BATCH_SIZE}로 조정했습니다.")

def main():
    """
    QuickDraw 분류 모델 학습
    
    클래스 수를 늘리려면 위의 CATEGORIES 리스트만 수정하면 됩니다.
    A100 GPU 사용 시 자동으로 GPU를 인식하여 학습합니다.
    """
    global BATCH_SIZE, USE_MIXED_PRECISION  # 전역 변수 선언 (함수 최상단에 선언)
    
    print("="*70)
    print("QuickDraw RNN 모델 학습 시작")
    print("="*70)
    print(f"클래스 수: {NUM_CLASSES}")
    print(f"클래스 목록: {', '.join(CATEGORIES)}")
    print(f"클래스당 최대 샘플: {MAX_ITEMS_PER_CLASS or '전체'}")
    print(f"Batch size: {BATCH_SIZE}")
    print(f"최대 Epochs: {EPOCHS}")
    print("="*70)
    
    # GPU 확인 및 최적화 설정 (Metal GPU 포함)
    gpus = tf.config.list_physical_devices('GPU')
    # Metal GPU 확인 (M1/M2/M3 Mac)
    metal_devices = [d for d in tf.config.list_physical_devices() if 'GPU' in d.name or 'metal' in d.name.lower()]
    
    # Metal GPU가 있으면 GPU로 인식
    if metal_devices:
        gpus = metal_devices
        print(f"✓ Metal GPU 감지: {len(gpus)}개 (Apple Silicon)")
        for i, gpu in enumerate(gpus):
            print(f"  GPU {i}: {gpu.name}")
    
    if gpus:
        print(f"✓ GPU 감지: {len(gpus)}개")
        for i, gpu in enumerate(gpus):
            print(f"  GPU {i}: {gpu.name}")
        
        # Metal GPU 감지 시 적절한 배치 사이즈 설정 (너무 크면 오히려 느려질 수 있음)
        if len(metal_devices) > 0:
            BATCH_SIZE = 512  # Metal GPU는 512가 최적 (1024는 메모리 부족으로 스왑 발생 가능)
            print(f"✓ Metal GPU 감지 - 배치 사이즈를 {BATCH_SIZE}로 조정")
            print(f"  💡 학습 속도 향상을 위해 배치 사이즈를 최적화했습니다.")
        else:
            # GPU 메모리 정보 확인 및 배치 사이즈 자동 조정
            try:
                gpu_name = gpus[0].name.lower()
                
                for gpu in gpus:
                    try:
                        tf.config.experimental.set_memory_growth(gpu, True)
                    except:
                        pass
                
                # GPU 메모리 정보 가져오기
                gpu_details = None
                try:
                    gpu_details = tf.config.experimental.get_device_details(gpus[0])
                except:
                    pass
                
                if gpu_details:
                    # GPU 이름으로 메모리 추정 (대략적)
                    if 'a100' in gpu_name or 'a6000' in gpu_name:
                        BATCH_SIZE = max(BATCH_SIZE, 512)
                        print(f"✓ 대용량 GPU 감지 - 배치 사이즈를 {BATCH_SIZE}로 조정")
                    elif 'v100' in gpu_name or 'rtx3090' in gpu_name or 'rtx4090' in gpu_name:
                        BATCH_SIZE = max(BATCH_SIZE, 384)
                        print(f"✓ 중형 GPU 감지 - 배치 사이즈를 {BATCH_SIZE}로 조정")
                    elif 'rtx' in gpu_name or 'gtx' in gpu_name:
                        BATCH_SIZE = max(BATCH_SIZE, 256)
                        print(f"✓ GPU 감지 - 배치 사이즈: {BATCH_SIZE}")
            except Exception as e:
                print(f"  GPU 메모리 확인 경고: {e}")
        
        # Mixed Precision 설정 (FP16 사용으로 2배 빠른 학습 및 메모리 절약)
        if USE_MIXED_PRECISION:
            try:
                policy = tf.keras.mixed_precision.Policy('mixed_float16')
                tf.keras.mixed_precision.set_global_policy(policy)
                print("✓ Mixed Precision (FP16) 활성화 - 학습 속도 2배 향상, 메모리 50% 절약")
                # FP16 사용 시 배치 사이즈를 더 크게 할 수 있음
                BATCH_SIZE = int(BATCH_SIZE * 1.5)  # FP16으로 메모리 여유 생김
                print(f"✓ FP16 메모리 절약으로 배치 사이즈를 {BATCH_SIZE}로 증가")
            except Exception as e:
                print(f"  Mixed Precision 설정 실패: {e}")
    else:
        print("⚠️  GPU를 찾을 수 없습니다. CPU로 학습합니다.")
        # CPU 모드: 메모리 효율을 위해 배치 사이즈 조정
        # 16GB RAM 기준으로 전체 데이터 사용 시 적절한 배치 사이즈
        BATCH_SIZE = min(BATCH_SIZE, 128)  # CPU 모드에서는 128 이하로 제한
        print(f"  CPU 모드 - 배치 사이즈를 {BATCH_SIZE}로 조정")
        print(f"  💡 전체 데이터 사용 시 메모리 효율을 위해 배치 사이즈가 조정되었습니다.")
        # CPU에서는 Mixed Precision 비활성화
        if USE_MIXED_PRECISION:
            USE_MIXED_PRECISION = False
            print("  Mixed Precision 비활성화 (CPU 모드)")
    
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
    # 전체 데이터 사용 시 shuffle buffer 크기 증가 (더 나은 랜덤화)
    shuffle_buffer = min(50000, len(X_train)) if MAX_ITEMS_PER_CLASS is None else min(10000, len(X_train))
    
    # CPU 모드에서는 메모리 효율을 위해 캐싱 선택적 사용
    use_cache = len(gpus) > 0  # GPU가 있을 때만 캐싱 사용
    
    train_ds = tf.data.Dataset.from_tensor_slices((X_train, y_train))
    train_ds = train_ds.shuffle(buffer_size=shuffle_buffer, reshuffle_each_iteration=True)
    train_ds = train_ds.batch(BATCH_SIZE)
    train_ds = train_ds.prefetch(tf.data.AUTOTUNE)  # CPU/GPU 모두에서 활용
    # 캐싱 제거: Metal GPU에서는 캐싱이 오히려 메모리 부족을 일으킬 수 있음
    # if use_cache:
    #     train_ds = train_ds.cache()  # 캐싱 비활성화로 메모리 효율 향상
    
    val_ds = tf.data.Dataset.from_tensor_slices((X_val, y_val))
    val_ds = val_ds.batch(BATCH_SIZE).prefetch(tf.data.AUTOTUNE)
    # if use_cache:
    #     val_ds = val_ds.cache()
    
    print(f"✓ Batch size: {BATCH_SIZE}")
    print(f"✓ Shuffle buffer: {shuffle_buffer:,}")
    if use_cache:
        print(f"✓ 데이터 파이프라인 최적화 완료 (prefetch + cache)")
    else:
        print(f"✓ 데이터 파이프라인 최적화 완료 (prefetch, 캐싱 비활성화 - 메모리 절약)")
    
    # 모델 생성
    print("\n[4/5] 모델 생성 중...")
    print(f"과적합 방지 설정:")
    print(f"  - Dropout rate: {DROPOUT_RATE}")
    print(f"  - LSTM units: {LSTM_UNITS}")
    print(f"  - L2 regularization: {L2_REG}")
    model = build_model(
        num_classes=NUM_CLASSES,
        dropout_rate=DROPOUT_RATE,
        lstm_units=LSTM_UNITS,
        l2_reg=L2_REG,
        use_mixed_precision=USE_MIXED_PRECISION  # Mixed Precision 사용 시 마지막 레이어를 float32로 설정
    )
    
    if USE_MIXED_PRECISION:
        print("✓ Mixed Precision: 마지막 Dense 레이어는 float32로 유지 (수치 안정성)")
    
    print("\n모델 구조:")
    model.summary()
    
    # 콜백 설정
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_dir = "models"
    os.makedirs(model_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, f"quickdraw_rnn_{NUM_CLASSES}classes.keras")
    history_path = os.path.join(model_dir, f"history_{NUM_CLASSES}classes_{timestamp}.json")
    
    # 클래스 수에 따른 Early Stopping patience 조정
    # 클래스가 많을수록 더 많은 학습이 필요하지만, 과적합도 주의해야 함
    if NUM_CLASSES >= 10:
        early_stopping_patience = 12  # 10개 이상: patience 증가
        reduce_lr_patience = 6
    elif NUM_CLASSES >= 15:
        early_stopping_patience = 15  # 15개 이상: 더 많은 patience
        reduce_lr_patience = 7
    else:
        early_stopping_patience = 10  # 기본값
        reduce_lr_patience = 5
    
    # 최고 성능 모델 저장 (검증 손실 기준)
    best_model_path = os.path.join(model_dir, f"quickdraw_rnn_{NUM_CLASSES}classes_best.keras")
    # 마지막 모델도 저장 (선택적)
    last_model_path = os.path.join(model_dir, f"quickdraw_rnn_{NUM_CLASSES}classes_last.keras")
    
    callbacks = [
        ModelCheckpoint(
            filepath=best_model_path,
            monitor='val_loss',
            save_best_only=True,  # 최고 성능 모델만 저장
            verbose=1,
            save_weights_only=False
        ),
        ModelCheckpoint(
            filepath=last_model_path,
            monitor='val_loss',
            save_best_only=False,  # 마지막 모델도 저장
            verbose=0,  # 조용히 저장
            save_weights_only=False
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=reduce_lr_patience,
            min_lr=1e-6,
            verbose=1
        ),
        EarlyStopping(
            monitor='val_loss',
            patience=early_stopping_patience,
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
    print(f"✓ 최고 성능 모델 저장: {best_model_path}")
    print(f"✓ 마지막 모델 저장: {last_model_path}")
    print(f"✓ 히스토리 저장: {history_path}")
    print(f"\n최종 성능:")
    print(f"  학습 정확도: {final_train_acc:.4f} ({final_train_acc*100:.2f}%)")
    print(f"  검증 정확도: {final_val_acc:.4f} ({final_val_acc*100:.2f}%)")
    print(f"\n💡 최고 성능 모델({best_model_path})을 사용하는 것을 권장합니다.")
    print("="*70)

if __name__ == "__main__":
    main()

