from tensorflow import keras
from tensorflow.keras import layers

MAX_SEQ_LEN = 200  # 시퀀스 최대 길이 (패딩/트렁케이션 후)
N_FEATURES = 3  # (Δx, Δy, end_flag)

def build_model(
    num_classes, 
    dropout_rate=0.65,  # Dropout 비율 (엄격한 모델: 기본값 0.65, 더 높은 정규화)
    l2_reg=1e-3,  # L2 정규화 계수 (엄격한 모델: 기본값 1e-3, 더 강한 정규화)
    learning_rate=5e-4,  # 학습률 (엄격한 모델: 기본값 5e-4, 더 작은 학습률로 안정적 학습)
    use_batch_norm=True  # Batch Normalization 사용 여부 (기본값 True)
):
    """
    QuickDraw 분류 모델 생성 - 엄격한 버전 (더 강한 정규화)
    
    기존 모델 대비 개선사항:
    1. 더 강한 정규화: Dropout 0.65, L2 1e-3 (기존: 0.5, 1e-4)
    2. Batch Normalization 추가: 학습 안정성 및 일반화 성능 향상
    3. 더 작은 학습률: 5e-4 (기존: 1e-3) - 더 안정적인 학습
    4. 추가 Dropout 레이어: CNN과 GRU 사이에도 Dropout 적용
    5. 더 작은 Dense 레이어: 256 → 128 (과적합 방지)
    
    아키텍처:
    1. Conv1D (2층) + BatchNorm + Dropout: 로컬 패턴 추출
    2. MaxPooling: 시퀀스 길이 절반으로 축소
    3. Bidirectional GRU (2층) + BatchNorm + Dropout: 시퀀스 의존성 학습
    4. Dense + BatchNorm + Dropout: 최종 분류
    
    Args:
        num_classes: 출력 클래스 수
        dropout_rate: Dropout 비율 (0.6~0.7 권장, 엄격한 모델)
        l2_reg: L2 정규화 계수 (1e-3 권장, 강한 정규화)
        learning_rate: 초기 학습률 (5e-4 권장, 안정적 학습)
        use_batch_norm: Batch Normalization 사용 여부
    
    Returns:
        Compiled Keras model
    """
    inputs = keras.Input(shape=(MAX_SEQ_LEN, N_FEATURES))

    # 1D CNN으로 초반 특징 추출 (로컬 패턴 학습)
    # 첫 번째 Conv1D 레이어
    x = layers.Conv1D(64, 7, activation='relu', padding='same', 
                      kernel_regularizer=keras.regularizers.l2(l2_reg))(inputs)
    if use_batch_norm:
        x = layers.BatchNormalization()(x)  # Batch Normalization 추가
    x = layers.Dropout(dropout_rate * 0.5)(x)  # CNN 레이어 간 Dropout (더 약하게)
    
    # 두 번째 Conv1D 레이어
    x = layers.Conv1D(64, 5, activation='relu', padding='same',
                      kernel_regularizer=keras.regularizers.l2(l2_reg))(x)
    if use_batch_norm:
        x = layers.BatchNormalization()(x)
    x = layers.Dropout(dropout_rate * 0.5)(x)
    
    x = layers.MaxPooling1D(2)(x)  # 시퀀스 길이: 200 → 100

    # Bidirectional GRU로 시퀀스 의존성 학습
    # 첫 번째 GRU 레이어
    x = layers.Bidirectional(
        layers.GRU(128, return_sequences=True,
                   kernel_regularizer=keras.regularizers.l2(l2_reg),
                   recurrent_regularizer=keras.regularizers.l2(l2_reg))
    )(x)
    if use_batch_norm:
        x = layers.BatchNormalization()(x)
    x = layers.Dropout(dropout_rate)(x)  # GRU 레이어 간 Dropout
    
    # 두 번째 GRU 레이어
    x = layers.Bidirectional(
        layers.GRU(128,
                   kernel_regularizer=keras.regularizers.l2(l2_reg),
                   recurrent_regularizer=keras.regularizers.l2(l2_reg))
    )(x)
    if use_batch_norm:
        x = layers.BatchNormalization()(x)
    x = layers.Dropout(dropout_rate)(x)

    # Fully Connected 레이어 (분류)
    # 더 작은 Dense 레이어로 과적합 방지 (256 → 128)
    x = layers.Dense(128, activation='relu',
                     kernel_regularizer=keras.regularizers.l2(l2_reg))(x)
    if use_batch_norm:
        x = layers.BatchNormalization()(x)
    x = layers.Dropout(dropout_rate)(x)  # 과적합 방지

    # 출력 레이어 (softmax로 확률 분포 생성)
    outputs = layers.Dense(num_classes, activation='softmax',
                           kernel_regularizer=keras.regularizers.l2(l2_reg))(x)

    model = keras.Model(inputs, outputs)

    # M1/M2 Mac 호환을 위해 legacy optimizer 사용
    try:
        optimizer = keras.optimizers.legacy.Adam(learning_rate=learning_rate)
    except AttributeError:
        optimizer = keras.optimizers.Adam(learning_rate=learning_rate)

    model.compile(
        optimizer=optimizer,
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    return model

