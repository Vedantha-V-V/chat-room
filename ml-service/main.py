"""
Flask API for gender classification
Privacy-first: Images are processed in memory and never stored
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
import numpy as np
from PIL import Image
import os
import sys

# For demo purposes, using a simple mock classifier
# In production, replace with actual ML model (TensorFlow/PyTorch)
try:
    # Try to import actual ML libraries if available
    import tensorflow as tf
    # Load your trained model here
    # model = tf.keras.models.load_model('path/to/model')
    HAS_ML_LIBS = True
except ImportError:
    HAS_ML_LIBS = False
    print("Warning: ML libraries not found. Using mock classifier.")

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Configuration
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB max
ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/jpg']


def mock_gender_classifier(image_array):
    """
    Mock gender classifier for demonstration
    Replace this with actual ML model inference
    
    Args:
        image_array: numpy array of image (H, W, 3)
    
    Returns:
        dict: {'gender': 'male'|'female', 'confidence': float}
    """
    # Mock implementation - returns random result
    # In production, use: model.predict(image_array)
    import random
    gender = random.choice(['male', 'female'])
    confidence = round(random.uniform(0.7, 0.95), 2)
    
    return {
        'gender': gender,
        'confidence': confidence
    }


def preprocess_image(image):
    """
    Preprocess image for model input
    Resize, normalize, etc.
    
    Args:
        image: PIL Image object
    
    Returns:
        numpy array: Preprocessed image ready for model
    """
    # Resize to model input size (adjust based on your model)
    target_size = (224, 224)
    image = image.resize(target_size, Image.Resampling.LANCZOS)
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Convert to numpy array and normalize
    img_array = np.array(image)
    img_array = img_array.astype('float32') / 255.0
    
    # Add batch dimension if needed
    # img_array = np.expand_dims(img_array, axis=0)
    
    return img_array


def decode_base64_image(base64_string):
    """
    Decode base64 image string to PIL Image
    Image is kept in memory only, never written to disk
    
    Args:
        base64_string: Base64 encoded image (with or without data URL prefix)
    
    Returns:
        PIL.Image: Decoded image object
    """
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Check size
        if len(image_data) > MAX_IMAGE_SIZE:
            raise ValueError(f"Image too large. Maximum size: {MAX_IMAGE_SIZE / 1024 / 1024}MB")
        
        # Create PIL Image from bytes (in memory only)
        image = Image.open(io.BytesIO(image_data))
        
        return image
    except Exception as e:
        raise ValueError(f"Invalid image data: {str(e)}")


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'ml_libs_available': HAS_ML_LIBS
    })


@app.route('/classify', methods=['POST'])
def classify_gender():
    """
    Gender classification endpoint
    
    Privacy guarantees:
    - Image is received as base64 in request body
    - Image is decoded in memory only
    - Image is processed and immediately discarded
    - Only classification result is returned
    - Image is NEVER written to disk or database
    
    Request body:
        {
            "image": "data:image/jpeg;base64,..." or "base64_string"
        }
    
    Response:
        {
            "success": true,
            "gender": "male" | "female",
            "confidence": 0.0-1.0
        }
    """
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({
                'success': False,
                'error': 'Image data is required'
            }), 400
        
        image_base64 = data['image']
        
        if not image_base64:
            return jsonify({
                'success': False,
                'error': 'Image data cannot be empty'
            }), 400
        
        # Decode image (in memory only)
        try:
            image = decode_base64_image(image_base64)
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        
        # Preprocess image for model
        image_array = preprocess_image(image)
        
        # Classify gender (image_array is in memory, will be garbage collected)
        if HAS_ML_LIBS:
            # Use actual model here
            # result = model.predict(image_array)
            # For now, use mock
            result = mock_gender_classifier(image_array)
        else:
            result = mock_gender_classifier(image_array)
        
        # Explicitly clear image data from memory
        del image
        del image_array
        
        # Return only the classification result
        return jsonify({
            'success': True,
            'gender': result['gender'],
            'confidence': result['confidence']
        })
    
    except Exception as e:
        print(f"Classification error: {str(e)}", file=sys.stderr)
        return jsonify({
            'success': False,
            'error': 'Failed to process image. Please try again.'
        }), 500


@app.route('/classify', methods=['OPTIONS'])
def classify_options():
    """Handle CORS preflight"""
    return '', 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"Starting Flask server on port {port}")
    print("Privacy mode: Images are processed in memory and never stored")
    
    app.run(host='0.0.0.0', port=port, debug=debug)

