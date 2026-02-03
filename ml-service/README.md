# ML Service - Gender Classification API

Privacy-first Flask service for gender classification from camera-captured images.

## Privacy Guarantees

- ✅ Images are processed **in memory only**
- ✅ Images are **never written to disk**
- ✅ Images are **never stored in database**
- ✅ Images are **immediately discarded** after processing
- ✅ Only classification result (Male/Female) is returned
- ✅ No PII collection or storage

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables (optional):
```bash
export PORT=5000
export FLASK_DEBUG=False
```

3. Run the service:
```bash
python main.py
```

The service will start on `http://localhost:5000` by default.

## API Endpoints

### POST `/classify`

Classify gender from a base64-encoded image.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "gender": "male",
  "confidence": 0.87
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Image data is required"
}
```

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "ml_libs_available": true
}
```

## Integration with ML Model

Currently uses a mock classifier. To integrate your actual model:

1. **TensorFlow:**
```python
import tensorflow as tf

model = tf.keras.models.load_model('path/to/model.h5')

def classify_gender(image_array):
    prediction = model.predict(np.expand_dims(image_array, axis=0))
    gender_idx = np.argmax(prediction[0])
    confidence = float(prediction[0][gender_idx])
    gender = 'male' if gender_idx == 0 else 'female'
    return {'gender': gender, 'confidence': confidence}
```

2. **PyTorch:**
```python
import torch
import torchvision.transforms as transforms

model = torch.load('path/to/model.pth')
model.eval()

def classify_gender(image_array):
    # Preprocess and convert to tensor
    transform = transforms.Compose([...])
    tensor = transform(image_array)
    
    with torch.no_grad():
        output = model(tensor.unsqueeze(0))
        prediction = torch.nn.functional.softmax(output, dim=1)
        confidence, gender_idx = torch.max(prediction, 1)
    
    gender = 'male' if gender_idx == 0 else 'female'
    return {'gender': gender, 'confidence': float(confidence)}
```

3. Replace the `mock_gender_classifier` function in `main.py` with your actual model inference.

## Image Processing Flow

1. **Receive**: Base64 image in request body
2. **Decode**: Convert base64 to PIL Image (in memory)
3. **Validate**: Check size and format
4. **Preprocess**: Resize, normalize for model input
5. **Classify**: Run model inference
6. **Discard**: Image data is garbage collected
7. **Return**: Only classification result

## Security Considerations

- Maximum image size: 5MB
- CORS enabled for frontend requests
- Input validation on all endpoints
- Error handling prevents information leakage
- No file system access for image storage

## Performance

- Target inference time: < 2 seconds
- Memory-efficient processing
- No disk I/O operations
- Stateless design for scalability

## Environment Variables

- `PORT`: Server port (default: 5000)
- `FLASK_DEBUG`: Enable debug mode (default: False)
- `REACT_APP_ML_API_URL`: Frontend should set this to Flask service URL

