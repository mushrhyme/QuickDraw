import json
import numpy as np
from pathlib import Path

MAX_SEQ_LEN = 200

def drawing_to_sequence(drawing):
    """
    Convert strokes into a time sequence.
    Compute (Δx, Δy, end_flag) for each point.
    Normalize Δx, Δy by dividing by 255.
    Pad/truncate to MAX_SEQ_LEN = 200.
    
    Args:
        drawing: List of strokes, where each stroke is [x_coords, y_coords]
    
    Returns:
        numpy array of shape (MAX_SEQ_LEN, 3) with (Δx, Δy, end_flag)
    """
    sequence = []
    prev_x = None
    prev_y = None
    
    for stroke_idx, stroke in enumerate(drawing):
        x_coords = stroke[0]
        y_coords = stroke[1]
        
        # Convert to sequence of points
        for point_idx in range(len(x_coords)):
            curr_x = x_coords[point_idx]
            curr_y = y_coords[point_idx]
            
            if prev_x is None:
                # First point of the entire drawing: delta is 0
                dx = 0
                dy = 0
            else:
                # Compute delta from previous point
                dx = curr_x - prev_x
                dy = curr_y - prev_y
            
            # Normalize by dividing by 255
            dx_normalized = dx / 255.0
            dy_normalized = dy / 255.0
            
            # end_flag is 1 if this is the last point of the stroke, 0 otherwise
            end_flag = 1.0 if point_idx == len(x_coords) - 1 else 0.0
            
            sequence.append([dx_normalized, dy_normalized, end_flag])
            
            # Update previous coordinates
            prev_x = curr_x
            prev_y = curr_y
    
    # Convert to numpy array
    sequence = np.array(sequence, dtype=np.float32)
    
    # Pad or truncate to MAX_SEQ_LEN
    if len(sequence) < MAX_SEQ_LEN:
        # Pad with zeros
        padding = np.zeros((MAX_SEQ_LEN - len(sequence), 3), dtype=np.float32)
        sequence = np.vstack([sequence, padding])
    elif len(sequence) > MAX_SEQ_LEN:
        # Truncate
        sequence = sequence[:MAX_SEQ_LEN]
    
    return sequence

def load_category_ndjson(path, label_index, max_items=None):
    """
    Reads ndjson file and returns (X, y) converted from QuickDraw drawing format.
    
    Args:
        path: Path to the ndjson file
        label_index: Integer label for this category
        max_items: Maximum number of items to load (None for all)
    
    Returns:
        Tuple (X, y) where X is numpy array of sequences and y is numpy array of labels
    """
    path = Path(path)
    X = []
    y = []
    
    with open(path, 'r') as f:
        for line_idx, line in enumerate(f):
            if max_items is not None and line_idx >= max_items:
                break
            
            # Parse JSON line
            data = json.loads(line.strip())
            
            # Extract drawing
            drawing = data.get('drawing', [])
            
            if len(drawing) == 0:
                continue
            
            # Convert drawing to sequence
            sequence = drawing_to_sequence(drawing)
            
            X.append(sequence)
            y.append(label_index)
    
    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int32)
    
    return X, y

def load_dataset(categories, base_path="data/raw", max_items=None):
    """
    Loads all categories and returns combined (X, y) as NumPy arrays.
    
    Args:
        categories: List of category names
        base_path: Base path to the raw data directory
        max_items: Maximum number of items per category (None for all)
    
    Returns:
        Tuple (X, y) where X is numpy array of all sequences and y is numpy array of all labels
    """
    base_path = Path(base_path)
    all_X = []
    all_y = []
    
    for label_index, category in enumerate(categories):
        filepath = base_path / f"{category}.ndjson"
        
        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")
        
        X, y = load_category_ndjson(filepath, label_index, max_items=max_items)
        all_X.append(X)
        all_y.append(y)
    
    # Concatenate all categories
    X = np.concatenate(all_X, axis=0)
    y = np.concatenate(all_y, axis=0)
    
    return X, y

