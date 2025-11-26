from tensorflow import keras
from tensorflow.keras import layers

MAX_SEQ_LEN = 200  # 시퀀스 최대 길이 (패딩/트렁케이션 후)
N_FEATURES = 3  # (Δx, Δy, end_flag)

def build_model(
    num_classes, 
    dropout_rate=0.5,  # Dropout 비율 (과적합 방지, 기본값 0.5)
    l2_reg=1e-4,  # L2 정규화 계수 (기본값 1e-4)
    learning_rate=1e-3  # 학습률 (기본값 1e-3)
):
    """
    QuickDraw 분류 모델 생성 (Conv1D + Bidirectional GRU 하이브리드)
    
    아키텍처:
    1. Conv1D (2층): 로컬 패턴 추출 (선 방향, 곡선 등)
    2. MaxPooling: 시퀀스 길이 절반으로 축소
    3. Bidirectional GRU (2층): 양방향 시퀀스 의존성 학습
    4. Dense + Dropout: 최종 분류
    
    Args:
        num_classes: 출력 클래스 수
        dropout_rate: Dropout 비율 (0.3~0.6 권장, 클래스 수가 많을수록 높게)
        l2_reg: L2 정규화 계수 (1e-4~1e-3 권장)
        learning_rate: 초기 학습률
    
    Returns:
        Compiled Keras model
    """
    inputs = keras.Input(shape=(MAX_SEQ_LEN, N_FEATURES))

    # 1D CNN으로 초반 특징 추출 (로컬 패턴 학습)
    # Conv1D(64, 7): 64개 필터, 커널 크기 7 (7개 시퀀스 포인트를 한 번에 봄)
    x = layers.Conv1D(64, 7, activation='relu', padding='same', 
                      kernel_regularizer=keras.regularizers.l2(l2_reg))(inputs)
    x = layers.Conv1D(64, 5, activation='relu', padding='same',
                      kernel_regularizer=keras.regularizers.l2(l2_reg))(x)
    x = layers.MaxPooling1D(2)(x)  # 시퀀스 길이: 200 → 100

    # Bidirectional GRU로 시퀀스 의존성 학습
    # return_sequences=True: 첫 번째 GRU는 다음 레이어를 위해 시퀀스 전체 출력
    x = layers.Bidirectional(
        layers.GRU(128, return_sequences=True,
                   kernel_regularizer=keras.regularizers.l2(l2_reg),
                   recurrent_regularizer=keras.regularizers.l2(l2_reg))
    )(x)
    # return_sequences=False: 마지막 GRU는 최종 벡터만 출력
    x = layers.Bidirectional(
        layers.GRU(128,
                   kernel_regularizer=keras.regularizers.l2(l2_reg),
                   recurrent_regularizer=keras.regularizers.l2(l2_reg))
    )(x)

    # Fully Connected 레이어 (분류)
    x = layers.Dense(256, activation='relu',
                     kernel_regularizer=keras.regularizers.l2(l2_reg))(x)
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
