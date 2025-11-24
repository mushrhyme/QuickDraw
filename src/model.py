from tensorflow import keras
from tensorflow.keras import layers

MAX_SEQ_LEN = 200
N_FEATURES = 3

def build_model(num_classes, dropout_rate=0.6, lstm_units=96, l2_reg=1e-4, use_mixed_precision=False):
    """
    Build and compile a model for QuickDraw classification.
    과적합 방지를 위해 정규화 강화 버전
    
    Args:
        num_classes: Number of output classes
        dropout_rate: Dropout 비율 (기본값 0.6, 과적합 시 증가)
        lstm_units: LSTM 유닛 수 (기본값 96, 과적합 시 감소)
        l2_reg: L2 정규화 계수 (기본값 1e-4)
        use_mixed_precision: Mixed Precision 사용 여부 (마지막 레이어를 float32로 설정)
    
    Returns:
        Compiled Keras model
    """
    # Mixed Precision 사용 시 마지막 Dense 레이어를 float32로 설정
    if use_mixed_precision:
        # 마지막 레이어만 float32로 설정
        dense_layer = layers.Dense(
            num_classes,
            activation='softmax',
            kernel_regularizer=keras.regularizers.l2(l2_reg),
            dtype='float32'  # Mixed Precision 사용 시 마지막 레이어는 float32
        )
    else:
        dense_layer = layers.Dense(
            num_classes,
            activation='softmax',
            kernel_regularizer=keras.regularizers.l2(l2_reg)
        )
    
    model = keras.Sequential([
        layers.Masking(mask_value=0, input_shape=(MAX_SEQ_LEN, N_FEATURES)),
        # LSTM 유닛 수 감소 및 L2 정규화 추가
        layers.Bidirectional(
            layers.LSTM(
                lstm_units,
                kernel_regularizer=keras.regularizers.l2(l2_reg),  # L2 정규화
                recurrent_regularizer=keras.regularizers.l2(l2_reg),
                return_sequences=False
            )
        ),
        layers.Dropout(dropout_rate),  # Dropout 비율 증가 (0.5 -> 0.6)
        # Dense 레이어에도 정규화 추가
        dense_layer
    ])
    
    # 학습률 감소 (1e-3 -> 5e-4)로 더 안정적인 학습
    # M1/M2 Mac 호환을 위해 legacy optimizer 사용
    try:
        optimizer = keras.optimizers.legacy.Adam(learning_rate=5e-4)
    except AttributeError:
        # legacy가 없는 경우 일반 optimizer 사용
        optimizer = keras.optimizers.Adam(learning_rate=5e-4)
    
    model.compile(
        optimizer=optimizer,
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model
