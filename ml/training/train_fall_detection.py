"""
ELDERCARE+ Fall Detection Model Training

CNN-LSTM Hybrid Model for Privacy-Preserving Fall Detection
Uses mmWave radar point clouds (no cameras)

Author: ELDERCARE+ ML Team
Version: 1.0.0
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, classification_report
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import json

# Configuration
CONFIG = {
    "model": {
        "input_shape": (20, 64, 64, 1),  # 20 frames, 64x64 grid, 1 channel
        "sequence_length": 20,  # 1 second @ 20 FPS
        "grid_size": 64,
        "num_classes_fall": 2,  # Fall / No Fall
        "num_classes_severity": 3,  # Low / Medium / High
    },
    "training": {
        "batch_size": 32,
        "epochs": 100,
        "learning_rate": 0.001,
        "validation_split": 0.2,
        "test_split": 0.1,
    },
    "data": {
        "synthetic_samples": 80000,
        "real_samples": 20000,
        "augmentation_factor": 3,
    },
    "paths": {
        "synthetic_data": "../datasets/synthetic/",
        "real_data": "../datasets/real/",
        "models": "../models/",
        "logs": "./logs/",
    }
}


class SyntheticFallGenerator:
    """
    Generate realistic synthetic radar point clouds for fall detection
    """

    def __init__(self, grid_size=64, sequence_length=20):
        self.grid_size = grid_size
        self.sequence_length = sequence_length
        self.fall_types = ['forward', 'backward', 'sideways', 'syncope']

    def generate_standing_posture(self, height=1.7, noise_level=0.02):
        """
        Generate point cloud for standing person
        """
        points = []

        # Head (0.2m tall)
        for z in np.linspace(height - 0.2, height, 3):
            for _ in range(5):
                x = np.random.normal(0, 0.1)
                y = np.random.normal(0, 0.1)
                points.append([x, y, z])

        # Torso (0.6m tall, 0.4m wide)
        for z in np.linspace(height - 0.8, height - 0.2, 8):
            for _ in range(10):
                x = np.random.normal(0, 0.2)
                y = np.random.normal(0, 0.15)
                points.append([x, y, z])

        # Arms
        for x_offset in [-0.3, 0.3]:
            for z in np.linspace(height - 0.8, height - 0.3, 5):
                for _ in range(3):
                    x = np.random.normal(x_offset, 0.05)
                    y = np.random.normal(0, 0.05)
                    points.append([x, y, z])

        # Legs
        for x_offset in [-0.15, 0.15]:
            for z in np.linspace(0.1, height - 0.8, 8):
                for _ in range(5):
                    x = np.random.normal(x_offset, 0.08)
                    y = np.random.normal(0, 0.08)
                    points.append([x, y, z])

        points = np.array(points)

        # Add radar noise
        points += np.random.normal(0, noise_level, points.shape)

        # Add micro-movements (breathing, swaying)
        breathing = np.sin(np.random.random() * 2 * np.pi) * 0.01
        points[:, 2] += breathing

        return points

    def generate_falling_trajectory(self, fall_type='forward', duration=20):
        """
        Generate trajectory for falling motion
        """
        trajectory = []
        initial_height = 1.7

        for frame in range(duration):
            progress = frame / duration  # 0 to 1

            if fall_type == 'forward':
                # Forward pitch
                angle = progress * 90  # 0 to 90 degrees
                height = initial_height * np.cos(np.radians(angle))
                forward = initial_height * np.sin(np.radians(angle)) * 0.5

                trajectory.append({
                    'height': max(0.3, height),
                    'forward': forward,
                    'sideways': 0,
                    'angle': angle
                })

            elif fall_type == 'backward':
                angle = progress * 90
                height = initial_height * np.cos(np.radians(angle))
                backward = -initial_height * np.sin(np.radians(angle)) * 0.5

                trajectory.append({
                    'height': max(0.3, height),
                    'forward': backward,
                    'sideways': 0,
                    'angle': -angle
                })

            elif fall_type == 'sideways':
                angle = progress * 90
                height = initial_height * np.cos(np.radians(angle))
                sideways = initial_height * np.sin(np.radians(angle)) * 0.5

                trajectory.append({
                    'height': max(0.3, height),
                    'forward': 0,
                    'sideways': sideways,
                    'angle': angle
                })

            elif fall_type == 'syncope':
                # Collapse (legs give out)
                height = initial_height * (1 - progress**2)

                trajectory.append({
                    'height': max(0.3, height),
                    'forward': 0,
                    'sideways': 0,
                    'angle': 0
                })

        return trajectory

    def points_to_grid(self, points):
        """
        Convert 3D point cloud to 2D occupancy grid (64x64)
        Grid shows maximum height at each (x, y) position
        """
        grid = np.zeros((self.grid_size, self.grid_size), dtype=np.float32)

        # Map points to grid (-3m to 3m → 0 to 63)
        for point in points:
            x, y, z = point

            # Convert to grid coordinates
            grid_x = int((x + 3) / 6 * (self.grid_size - 1))
            grid_y = int((y + 3) / 6 * (self.grid_size - 1))

            if 0 <= grid_x < self.grid_size and 0 <= grid_y < self.grid_size:
                # Store maximum height (z) at this location
                grid[grid_y, grid_x] = max(grid[grid_y, grid_x], z / 3.0)  # Normalize to 0-1

        return grid

    def generate_fall_sequence(self, fall_type='forward'):
        """
        Generate complete fall sequence:
        - Pre-fall (standing): 60 frames (3 seconds)
        - Fall transition: 20 frames (1 second)
        - Post-fall (on ground): 40 frames (2 seconds)
        Total: 120 frames @ 20 FPS = 6 seconds
        """
        sequence = []

        # Pre-fall: standing normally
        for _ in range(60):
            points = self.generate_standing_posture()
            grid = self.points_to_grid(points)
            sequence.append(grid)

        # Fall transition
        trajectory = self.generate_falling_trajectory(fall_type, duration=20)

        for pose in trajectory:
            # Generate falling posture based on trajectory
            points = self.generate_falling_posture(pose)
            grid = self.points_to_grid(points)
            sequence.append(grid)

        # Post-fall: on ground
        for _ in range(40):
            points = self.generate_ground_posture()
            grid = self.points_to_grid(points)
            sequence.append(grid)

        return np.array(sequence)

    def generate_falling_posture(self, pose):
        """
        Generate point cloud for person in falling posture
        """
        points = []
        height = pose['height']
        angle = np.radians(pose['angle'])

        # Body tilted at angle
        for z in np.linspace(0.3, height, 15):
            for _ in range(8):
                x = np.random.normal(pose['forward'], 0.15)
                y = np.random.normal(pose['sideways'], 0.15)
                points.append([x, y, z])

        return np.array(points)

    def generate_ground_posture(self, movement=False):
        """
        Generate point cloud for person on ground
        """
        points = []

        # Lying down (low height, spread out)
        for x in np.linspace(-0.5, 0.5, 10):
            for y in np.linspace(-0.3, 0.3, 6):
                for _ in range(3):
                    z = np.random.normal(0.3, 0.05)  # ~30cm off ground
                    points.append([
                        x + np.random.normal(0, 0.05),
                        y + np.random.normal(0, 0.05),
                        max(0.1, z)
                    ])

        if movement:
            # Add struggling motion
            points = np.array(points)
            points[:, :2] += np.random.normal(0, 0.1, (points.shape[0], 2))

        return np.array(points) if not movement else points

    def generate_non_fall_sequence(self, activity='walking'):
        """
        Generate non-fall activity sequences
        """
        sequence = []

        if activity == 'walking':
            # Walking: standing height, horizontal movement
            for i in range(120):
                points = self.generate_standing_posture()
                # Add forward motion
                points[:, 1] += (i / 120.0) * 2  # 2m forward over 6 seconds
                grid = self.points_to_grid(points)
                sequence.append(grid)

        elif activity == 'sitting':
            # Sitting down slowly
            for i in range(60):
                # Gradually lower height
                height = 1.7 - (i / 60.0) * 0.8  # 1.7m → 0.9m
                points = self.generate_standing_posture(height=height)
                grid = self.points_to_grid(points)
                sequence.append(grid)

            # Sitting
            for _ in range(60):
                points = self.generate_standing_posture(height=0.9)
                grid = self.points_to_grid(points)
                sequence.append(grid)

        elif activity == 'bending':
            # Bending over and back up
            for i in range(40):
                angle = (i / 40.0) * 60  # Bend 60 degrees
                height = 1.7 * np.cos(np.radians(angle))
                points = self.generate_standing_posture(height=height)
                grid = self.points_to_grid(points)
                sequence.append(grid)

            for i in range(40):
                angle = 60 - (i / 40.0) * 60  # Back up
                height = 1.7 * np.cos(np.radians(angle))
                points = self.generate_standing_posture(height=height)
                grid = self.points_to_grid(points)
                sequence.append(grid)

            # Standing
            for _ in range(40):
                points = self.generate_standing_posture()
                grid = self.points_to_grid(points)
                sequence.append(grid)

        elif activity == 'lying_down':
            # Intentionally lying down (slow, controlled)
            for i in range(80):
                height = 1.7 - (i / 80.0) * 1.4  # Slow descent
                points = self.generate_standing_posture(height=max(0.3, height))
                grid = self.points_to_grid(points)
                sequence.append(grid)

            # Lying
            for _ in range(40):
                points = self.generate_ground_posture()
                grid = self.points_to_grid(points)
                sequence.append(grid)

        return np.array(sequence)

    def extract_sliding_windows(self, sequence, window_size=20, stride=5):
        """
        Extract sliding windows from long sequence
        Used to create multiple training samples from one sequence
        """
        windows = []

        for i in range(0, len(sequence) - window_size + 1, stride):
            window = sequence[i:i+window_size]
            windows.append(window)

        return np.array(windows)


def build_model(input_shape=(20, 64, 64, 1)):
    """
    Build CNN-LSTM hybrid model for fall detection

    Architecture:
    1. 3D Convolutional layers (spatial-temporal features)
    2. LSTM layers (temporal sequence modeling)
    3. Dual classification heads (fall detection + severity)
    """

    inputs = layers.Input(shape=input_shape)

    # 3D Convolutional blocks
    x = layers.Conv3D(32, (3, 3, 3), activation='relu', padding='same')(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling3D((2, 2, 2))(x)
    x = layers.Dropout(0.2)(x)

    x = layers.Conv3D(64, (3, 3, 3), activation='relu', padding='same')(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling3D((2, 2, 2))(x)
    x = layers.Dropout(0.2)(x)

    x = layers.Conv3D(128, (3, 3, 3), activation='relu', padding='same')(x)
    x = layers.BatchNormalization()(x)
    x = layers.GlobalAveragePooling3D()(x)

    # Reshape for LSTM (add sequence dimension back)
    x = layers.Reshape((1, 128))(x)
    x = layers.RepeatVector(10)(x)  # Create temporal sequence

    # LSTM layers
    x = layers.LSTM(128, return_sequences=True, dropout=0.3)(x)
    x = layers.LSTM(64, dropout=0.3)(x)

    # Shared dense layer
    x = layers.Dense(32, activation='relu')(x)
    x = layers.Dropout(0.2)(x)

    # Classification heads
    fall_output = layers.Dense(2, activation='softmax', name='fall_detection')(x)
    severity_output = layers.Dense(3, activation='softmax', name='severity')(x)

    model = models.Model(inputs=inputs, outputs=[fall_output, severity_output])

    return model


def generate_synthetic_dataset(generator, num_samples=10000):
    """
    Generate synthetic training dataset
    """
    print(f"Generating {num_samples} synthetic samples...")

    X = []
    y_fall = []
    y_severity = []

    fall_types = ['forward', 'backward', 'sideways', 'syncope']
    non_fall_activities = ['walking', 'sitting', 'bending', 'lying_down']

    # Generate fall samples (50%)
    for i in range(num_samples // 2):
        fall_type = np.random.choice(fall_types)
        sequence = generator.generate_fall_sequence(fall_type)

        # Extract windows from sequence
        windows = generator.extract_sliding_windows(sequence, window_size=20, stride=5)

        for window in windows:
            X.append(window)
            y_fall.append(1)  # Fall

            # Assign severity based on fall type
            if fall_type in ['forward', 'backward']:
                severity = np.random.choice([1, 2], p=[0.3, 0.7])  # Mostly medium/high
            elif fall_type == 'syncope':
                severity = 2  # High severity
            else:
                severity = np.random.choice([0, 1], p=[0.5, 0.5])  # Low/medium

            y_severity.append(severity)

        if (i + 1) % 1000 == 0:
            print(f"  Generated {i+1}/{num_samples//2} fall samples")

    # Generate non-fall samples (50%)
    for i in range(num_samples // 2):
        activity = np.random.choice(non_fall_activities)
        sequence = generator.generate_non_fall_sequence(activity)

        windows = generator.extract_sliding_windows(sequence, window_size=20, stride=5)

        for window in windows:
            X.append(window)
            y_fall.append(0)  # No fall
            y_severity.append(0)  # N/A (low)

        if (i + 1) % 1000 == 0:
            print(f"  Generated {i+1}/{num_samples//2} non-fall samples")

    X = np.array(X)
    y_fall = np.array(y_fall)
    y_severity = np.array(y_severity)

    # Add channel dimension
    X = np.expand_dims(X, axis=-1)

    print(f"Dataset generated: {X.shape}")
    print(f"  Fall distribution: {np.bincount(y_fall)}")
    print(f"  Severity distribution: {np.bincount(y_severity)}")

    return X, y_fall, y_severity


def augment_data(X, y_fall, y_severity, factor=2):
    """
    Data augmentation: rotation, noise, scaling
    """
    print(f"Augmenting dataset (factor={factor})...")

    X_aug = []
    y_fall_aug = []
    y_severity_aug = []

    for i in range(len(X)):
        # Original
        X_aug.append(X[i])
        y_fall_aug.append(y_fall[i])
        y_severity_aug.append(y_severity[i])

        # Augmented versions
        for _ in range(factor - 1):
            # Rotation (flip horizontally/vertically)
            augmented = X[i].copy()

            if np.random.random() > 0.5:
                augmented = np.flip(augmented, axis=2)  # Flip width

            if np.random.random() > 0.5:
                augmented = np.flip(augmented, axis=1)  # Flip height

            # Add noise
            noise = np.random.normal(0, 0.02, augmented.shape)
            augmented = np.clip(augmented + noise, 0, 1)

            # Scaling (zoom in/out)
            scale = np.random.uniform(0.9, 1.1)
            # (Simple implementation, could use scipy.ndimage.zoom)

            X_aug.append(augmented)
            y_fall_aug.append(y_fall[i])
            y_severity_aug.append(y_severity[i])

    X_aug = np.array(X_aug)
    y_fall_aug = np.array(y_fall_aug)
    y_severity_aug = np.array(y_severity_aug)

    print(f"Augmented dataset: {X_aug.shape}")

    return X_aug, y_fall_aug, y_severity_aug


def train_model():
    """
    Main training loop
    """
    print("=" * 60)
    print("ELDERCARE+ Fall Detection Model Training")
    print("=" * 60)

    # Create directories
    os.makedirs(CONFIG['paths']['models'], exist_ok=True)
    os.makedirs(CONFIG['paths']['logs'], exist_ok=True)

    # Initialize synthetic data generator
    generator = SyntheticFallGenerator(
        grid_size=CONFIG['model']['grid_size'],
        sequence_length=CONFIG['model']['sequence_length']
    )

    # Generate dataset
    X, y_fall, y_severity = generate_synthetic_dataset(
        generator,
        num_samples=CONFIG['data']['synthetic_samples']
    )

    # Augment data
    X, y_fall, y_severity = augment_data(
        X, y_fall, y_severity,
        factor=CONFIG['data']['augmentation_factor']
    )

    # Convert labels to categorical
    y_fall_cat = keras.utils.to_categorical(y_fall, num_classes=2)
    y_severity_cat = keras.utils.to_categorical(y_severity, num_classes=3)

    # Train/validation/test split
    X_train, X_temp, y_fall_train, y_fall_temp, y_severity_train, y_severity_temp = train_test_split(
        X, y_fall_cat, y_severity_cat,
        test_size=0.3,
        stratify=y_fall,
        random_state=42
    )

    X_val, X_test, y_fall_val, y_fall_test, y_severity_val, y_severity_test = train_test_split(
        X_temp, y_fall_temp, y_severity_temp,
        test_size=0.33,  # 0.33 of 0.3 = 0.1 total
        stratify=np.argmax(y_fall_temp, axis=1),
        random_state=42
    )

    print(f"\nDataset split:")
    print(f"  Train: {X_train.shape[0]}")
    print(f"  Validation: {X_val.shape[0]}")
    print(f"  Test: {X_test.shape[0]}")

    # Build model
    print("\nBuilding model...")
    model = build_model(input_shape=CONFIG['model']['input_shape'])

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=CONFIG['training']['learning_rate']),
        loss={
            'fall_detection': 'categorical_crossentropy',
            'severity': 'categorical_crossentropy'
        },
        loss_weights={
            'fall_detection': 1.0,
            'severity': 0.5  # Secondary objective
        },
        metrics={
            'fall_detection': ['accuracy', keras.metrics.Precision(), keras.metrics.Recall()],
            'severity': ['accuracy']
        }
    )

    print(model.summary())

    # Callbacks
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    callbacks = [
        ModelCheckpoint(
            filepath=f"{CONFIG['paths']['models']}/fall_detection_{timestamp}_best.h5",
            monitor='val_fall_detection_accuracy',
            save_best_only=True,
            mode='max',
            verbose=1
        ),
        EarlyStopping(
            monitor='val_fall_detection_loss',
            patience=15,
            restore_best_weights=True,
            verbose=1
        ),
        ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-7,
            verbose=1
        ),
        keras.callbacks.TensorBoard(
            log_dir=f"{CONFIG['paths']['logs']}/fit_{timestamp}",
            histogram_freq=1
        )
    ]

    # Train model
    print("\nTraining model...")
    history = model.fit(
        X_train,
        {
            'fall_detection': y_fall_train,
            'severity': y_severity_train
        },
        batch_size=CONFIG['training']['batch_size'],
        epochs=CONFIG['training']['epochs'],
        validation_data=(
            X_val,
            {
                'fall_detection': y_fall_val,
                'severity': y_severity_val
            }
        ),
        callbacks=callbacks,
        verbose=1
    )

    # Evaluate on test set
    print("\nEvaluating on test set...")
    test_results = model.evaluate(
        X_test,
        {
            'fall_detection': y_fall_test,
            'severity': y_severity_test
        },
        verbose=1
    )

    print("\nTest Results:")
    for i, metric in enumerate(model.metrics_names):
        print(f"  {metric}: {test_results[i]:.4f}")

    # Generate predictions
    y_pred = model.predict(X_test)
    y_fall_pred = np.argmax(y_pred[0], axis=1)
    y_fall_true = np.argmax(y_fall_test, axis=1)

    # Confusion matrix
    cm = confusion_matrix(y_fall_true, y_fall_pred)

    print("\nConfusion Matrix:")
    print(cm)

    print("\nClassification Report:")
    print(classification_report(
        y_fall_true,
        y_fall_pred,
        target_names=['No Fall', 'Fall']
    ))

    # Save final model
    final_model_path = f"{CONFIG['paths']['models']}/fall_detection_{timestamp}_final.h5"
    model.save(final_model_path)
    print(f"\nModel saved: {final_model_path}")

    # Save config
    with open(f"{CONFIG['paths']['models']}/config_{timestamp}.json", 'w') as f:
        json.dump(CONFIG, f, indent=2)

    return model, history


if __name__ == "__main__":
    # Set random seeds for reproducibility
    np.random.seed(42)
    tf.random.set_seed(42)

    # Train model
    model, history = train_model()

    print("\n" + "=" * 60)
    print("Training complete!")
    print("=" * 60)
