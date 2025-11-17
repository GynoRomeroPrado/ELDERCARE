"""
ELDERCARE+ Fall Detection Model - Edge Deployment
Convert TensorFlow model to TensorFlow Lite for Coral Edge TPU

Author: ELDERCARE+ ML Team
Version: 1.0.0
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow import keras
import subprocess


def convert_to_tflite(model_path, output_path, quantize=True):
    """
    Convert Keras model to TensorFlow Lite format
    with INT8 quantization for Edge TPU deployment
    """
    print(f"Loading model from {model_path}...")
    model = keras.models.load_model(model_path)

    print("Converting to TensorFlow Lite...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)

    if quantize:
        print("Applying INT8 quantization...")

        # Enable quantization
        converter.optimizations = [tf.lite.Optimize.DEFAULT]

        # Set supported ops for Edge TPU
        converter.target_spec.supported_ops = [
            tf.lite.OpsSet.TFLITE_BUILTINS_INT8
        ]

        # Representative dataset for calibration
        def representative_dataset_gen():
            """
            Generate representative samples for quantization calibration
            """
            print("Generating representative dataset for calibration...")

            # Use synthetic data similar to training
            from train_fall_detection import SyntheticFallGenerator

            generator = SyntheticFallGenerator(grid_size=64, sequence_length=20)

            for i in range(100):
                # Mix of fall and non-fall samples
                if i % 2 == 0:
                    fall_type = np.random.choice(['forward', 'backward', 'sideways'])
                    sequence = generator.generate_fall_sequence(fall_type)
                else:
                    activity = np.random.choice(['walking', 'sitting', 'bending'])
                    sequence = generator.generate_non_fall_sequence(activity)

                # Extract one window
                windows = generator.extract_sliding_windows(sequence, window_size=20, stride=10)

                if len(windows) > 0:
                    window = windows[0]
                    window = np.expand_dims(window, axis=0)  # Add batch dimension
                    window = np.expand_dims(window, axis=-1)  # Add channel dimension
                    window = window.astype(np.float32)

                    yield [window]

                if (i + 1) % 20 == 0:
                    print(f"  Calibration: {i+1}/100")

        converter.representative_dataset = representative_dataset_gen

        # Enforce full integer quantization
        converter.inference_input_type = tf.uint8
        converter.inference_output_type = tf.uint8

    # Convert
    tflite_model = converter.convert()

    # Save
    with open(output_path, 'wb') as f:
        f.write(tflite_model)

    model_size = len(tflite_model) / 1024 / 1024
    print(f"TFLite model saved: {output_path}")
    print(f"Model size: {model_size:.2f} MB")

    return output_path


def compile_for_edge_tpu(tflite_path, output_dir):
    """
    Compile TFLite model for Google Coral Edge TPU
    Requires Edge TPU Compiler to be installed
    """
    print("\nCompiling for Edge TPU...")

    # Check if edgetpu_compiler is available
    try:
        subprocess.run(['edgetpu_compiler', '--version'], check=True, capture_output=True)
    except FileNotFoundError:
        print("ERROR: edgetpu_compiler not found!")
        print("Install from: https://coral.ai/docs/edgetpu/compiler/")
        return None

    # Compile
    output_name = os.path.basename(tflite_path).replace('.tflite', '_edgetpu.tflite')
    output_path = os.path.join(output_dir, output_name)

    cmd = [
        'edgetpu_compiler',
        tflite_path,
        '-o', output_dir
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        print(f"Edge TPU model compiled: {output_path}")
        print(result.stdout)

        # Check compilation stats
        if 'Operator compatibility check' in result.stdout:
            print("\nOperator compatibility:")
            print(result.stdout.split('Operator compatibility check')[1].split('\n')[0])

        return output_path
    else:
        print(f"ERROR: Compilation failed!")
        print(result.stderr)
        return None


def benchmark_model(tflite_path, use_edgetpu=False, num_runs=100):
    """
    Benchmark TFLite model inference time
    """
    print(f"\nBenchmarking model: {tflite_path}")
    print(f"Edge TPU: {use_edgetpu}")
    print(f"Runs: {num_runs}")

    if use_edgetpu:
        try:
            from pycoral.utils import edgetpu
            from pycoral.adapters import common

            interpreter = edgetpu.make_interpreter(tflite_path)
        except ImportError:
            print("ERROR: pycoral library not found!")
            print("Install with: pip install pycoral")
            return
    else:
        interpreter = tf.lite.Interpreter(model_path=tflite_path)

    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    print(f"\nInput shape: {input_details[0]['shape']}")
    print(f"Output shapes: {[out['shape'] for out in output_details]}")

    # Generate test input
    input_shape = input_details[0]['shape']
    input_dtype = input_details[0]['dtype']

    if input_dtype == np.uint8:
        # Quantized model
        test_input = np.random.randint(0, 256, size=input_shape, dtype=np.uint8)
    else:
        # Float model
        test_input = np.random.random(size=input_shape).astype(np.float32)

    # Warmup
    print("\nWarming up...")
    for _ in range(10):
        interpreter.set_tensor(input_details[0]['index'], test_input)
        interpreter.invoke()

    # Benchmark
    print(f"Running {num_runs} inference iterations...")

    import time
    times = []

    for _ in range(num_runs):
        start = time.perf_counter()
        interpreter.set_tensor(input_details[0]['index'], test_input)
        interpreter.invoke()
        end = time.perf_counter()

        times.append((end - start) * 1000)  # Convert to milliseconds

    times = np.array(times)

    print("\nBenchmark Results:")
    print(f"  Mean: {np.mean(times):.2f} ms")
    print(f"  Median: {np.median(times):.2f} ms")
    print(f"  Min: {np.min(times):.2f} ms")
    print(f"  Max: {np.max(times):.2f} ms")
    print(f"  Std Dev: {np.std(times):.2f} ms")
    print(f"  p95: {np.percentile(times, 95):.2f} ms")
    print(f"  p99: {np.percentile(times, 99):.2f} ms")

    # Check if meets requirement (<100ms)
    if np.mean(times) < 100:
        print(f"\n✓ PASS: Mean inference time {np.mean(times):.2f}ms < 100ms requirement")
    else:
        print(f"\n✗ FAIL: Mean inference time {np.mean(times):.2f}ms >= 100ms requirement")


def validate_model(tflite_path, keras_model_path, num_samples=100):
    """
    Validate TFLite model accuracy against original Keras model
    """
    print("\nValidating TFLite model accuracy...")

    # Load models
    keras_model = keras.models.load_model(keras_model_path)
    tflite_interpreter = tf.lite.Interpreter(model_path=tflite_path)
    tflite_interpreter.allocate_tensors()

    input_details = tflite_interpreter.get_input_details()
    output_details = tflite_interpreter.get_output_details()

    # Generate test samples
    from train_fall_detection import SyntheticFallGenerator

    generator = SyntheticFallGenerator(grid_size=64, sequence_length=20)

    keras_predictions = []
    tflite_predictions = []

    for i in range(num_samples):
        # Generate sample
        if i % 2 == 0:
            fall_type = np.random.choice(['forward', 'backward'])
            sequence = generator.generate_fall_sequence(fall_type)
        else:
            sequence = generator.generate_non_fall_sequence('walking')

        windows = generator.extract_sliding_windows(sequence, window_size=20, stride=10)

        if len(windows) > 0:
            window = windows[0]
            window = np.expand_dims(window, axis=0)
            window = np.expand_dims(window, axis=-1).astype(np.float32)

            # Keras prediction
            keras_pred = keras_model.predict(window, verbose=0)
            keras_fall = np.argmax(keras_pred[0][0])

            # TFLite prediction
            if input_details[0]['dtype'] == np.uint8:
                # Quantized input
                input_scale, input_zero_point = input_details[0]['quantization']
                window_quantized = window / input_scale + input_zero_point
                window_quantized = window_quantized.astype(np.uint8)
                tflite_interpreter.set_tensor(input_details[0]['index'], window_quantized)
            else:
                tflite_interpreter.set_tensor(input_details[0]['index'], window)

            tflite_interpreter.invoke()

            # Get output (fall detection)
            output = tflite_interpreter.get_tensor(output_details[0]['index'])

            if output_details[0]['dtype'] == np.uint8:
                # Dequantize output
                output_scale, output_zero_point = output_details[0]['quantization']
                output = (output.astype(np.float32) - output_zero_point) * output_scale

            tflite_fall = np.argmax(output[0])

            keras_predictions.append(keras_fall)
            tflite_predictions.append(tflite_fall)

    keras_predictions = np.array(keras_predictions)
    tflite_predictions = np.array(tflite_predictions)

    # Calculate agreement
    agreement = np.sum(keras_predictions == tflite_predictions) / len(keras_predictions)

    print(f"\nValidation Results:")
    print(f"  Samples: {len(keras_predictions)}")
    print(f"  Agreement: {agreement * 100:.2f}%")

    if agreement >= 0.95:
        print(f"  ✓ PASS: Agreement >= 95%")
    else:
        print(f"  ✗ FAIL: Agreement < 95%")


def main():
    """
    Main conversion and deployment pipeline
    """
    print("=" * 80)
    print("ELDERCARE+ Fall Detection - Edge Deployment Pipeline")
    print("=" * 80)

    # Paths
    MODEL_DIR = "../models"
    OUTPUT_DIR = "../models/edge"

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Find latest trained model
    import glob
    models = glob.glob(f"{MODEL_DIR}/fall_detection_*_best.h5")

    if not models:
        print("ERROR: No trained model found!")
        print(f"Please train a model first using train_fall_detection.py")
        return

    latest_model = max(models, key=os.path.getctime)
    print(f"\nUsing model: {latest_model}")

    # 1. Convert to TFLite (quantized)
    tflite_path = os.path.join(OUTPUT_DIR, "fall_detection_quantized.tflite")
    convert_to_tflite(latest_model, tflite_path, quantize=True)

    # 2. Validate accuracy
    validate_model(tflite_path, latest_model, num_samples=100)

    # 3. Benchmark (CPU)
    print("\n" + "=" * 80)
    print("CPU Benchmark")
    print("=" * 80)
    benchmark_model(tflite_path, use_edgetpu=False, num_runs=100)

    # 4. Compile for Edge TPU
    edgetpu_path = compile_for_edge_tpu(tflite_path, OUTPUT_DIR)

    if edgetpu_path and os.path.exists(edgetpu_path):
        # 5. Benchmark (Edge TPU)
        print("\n" + "=" * 80)
        print("Edge TPU Benchmark")
        print("=" * 80)

        try:
            benchmark_model(edgetpu_path, use_edgetpu=True, num_runs=100)
        except Exception as e:
            print(f"Edge TPU benchmark failed: {e}")
            print("Make sure you're running on a device with Edge TPU")

    print("\n" + "=" * 80)
    print("Deployment Pipeline Complete!")
    print("=" * 80)
    print(f"\nDeployment artifacts:")
    print(f"  TFLite (quantized): {tflite_path}")
    if edgetpu_path:
        print(f"  Edge TPU: {edgetpu_path}")


if __name__ == "__main__":
    main()
