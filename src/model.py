from tensorflow import keras
from tensorflow.keras import layers

MAX_SEQ_LEN = 200
N_FEATURES = 3

def build_model(num_classes):
    """
    Build and compile a model for QuickDraw classification.
    
    Args:
        num_classes: Number of output classes
    
    Returns:
        Compiled Keras model
    """
    model = keras.Sequential([
        layers.Masking(mask_value=0, input_shape=(MAX_SEQ_LEN, N_FEATURES)),
        layers.Bidirectional(layers.LSTM(128)),
        layers.Dropout(0.5),
        layers.Dense(num_classes, activation='softmax')
    ])
    
    optimizer = keras.optimizers.Adam(learning_rate=1e-3)
    
    model.compile(
        optimizer=optimizer,
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

