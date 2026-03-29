# ProctorAI Python Monitoring System

Advanced AI-powered proctoring system for remote examinations with real-time monitoring capabilities.

## 🎯 Features

### Face Detection & Analysis
- ✅ Real-time face detection using OpenCV and Dlib
- ✅ Facial landmark tracking (68-point model)
- ✅ Eye gaze and blink detection
- ✅ Multiple face detection alerts
- ✅ Face recognition capabilities
- ✅ Photo capture and logging

### Screen Monitoring
- ✅ Screenshot capture using MSS (high performance)
- ✅ Tab switching detection
- ✅ Application window monitoring
- ✅ Screen content analysis
- ✅ Suspicious activity alerts

### Audio Monitoring
- ✅ Real-time audio analysis using PyAudio
- ✅ Voice activity detection
- ✅ Background noise monitoring
- ✅ Multiple voice detection
- ✅ Silence detection alerts
- ✅ Audio anomaly detection

### System Integration
- ✅ RESTful API integration with Node.js backend
- ✅ Real-time alert reporting
- ✅ Status monitoring and reporting
- ✅ Thread-safe multi-monitor coordination
- ✅ Graceful shutdown handling

## 🚀 Installation

### Prerequisites

**Python 3.8+** required

**System Dependencies (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3-dev python3-pip
sudo apt install libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1
sudo apt install portaudio19-dev python3-pyaudio
```

**System Dependencies (macOS):**
```bash
brew install portaudio
```

**System Dependencies (Windows):**
```bash
# PyAudio wheel will be installed automatically
```

### Python Dependencies

```bash
cd proctor-app/monitoring
pip install -r requirements.txt
```

## ⚙️ Configuration

### Configuration File (`config.json`)

```json
{
  "api_url": "http://localhost:5001/api",
  "student_id": "your_student_id",
  "exam_id": "your_exam_id",
  "monitoring_duration": 3600,
  "face_detection": {
    "enable_recognition": true,
    "confidence_threshold": 0.6,
    "max_faces_allowed": 1
  },
  "screen_monitoring": {
    "capture_interval": 2,
    "screenshot_interval": 30,
    "enable_tab_detection": true
  },
  "audio_monitoring": {
    "sample_rate": 44100,
    "chunk_size": 1024,
    "silence_threshold": 500,
    "voice_threshold": 1000
  }
}
```

### Environment Variables

```bash
export PROCTORAI_API_URL="http://localhost:5001/api"
export PROCTORAI_STUDENT_ID="student_123"
export PROCTORAI_EXAM_ID="exam_456"
```

## 🎮 Usage

### 1. Individual Monitor Testing

**Face Detection:**
```bash
python face_detection.py
```

**Screen Monitoring:**
```bash
python screen_monitor.py
```

**Audio Monitoring:**
```bash
python audio_monitor.py
```

### 2. Complete Monitoring System

**Start Full Monitoring:**
```bash
python main_monitor.py
```

**With Custom Configuration:**
```bash
python main_monitor.py --config config.json
```

### 3. Programmatic Usage

```python
from main_monitor import ProctorMonitor

# Initialize monitor
monitor = ProctorMonitor("http://localhost:5001/api")

# Set student and exam
monitor.set_student_and_exam("student_123", "exam_456")

# Start monitoring
monitor.start_monitoring()

# Monitor runs in background threads
# Press Ctrl+C to stop

# Stop monitoring
monitor.stop_monitoring()

# Get statistics
stats = monitor.get_monitoring_stats()
print(stats)
```

## 📊 Monitoring Capabilities

### Alert Types

| Type | Severity | Description |
|------|----------|-------------|
| `no_face_detected` | High | No face visible in camera |
| `multiple_faces` | High | Multiple faces detected |
| `eyes_closed` | Medium | Student appears to be sleeping |
| `tab_switch_detected` | High | Screen content changed significantly |
| `suspicious_screen_content` | Medium | Unusual screen activity |
| `excessive_silence` | Medium | Prolonged silence detected |
| `sudden_noise_spike` | Low | Unexpected audio spike |
| `possible_multiple_voices` | High | Multiple voices detected |

### API Endpoints

The monitoring system communicates with these backend endpoints:

```
POST /api/proctor/log-event       # Send alerts
POST /api/proctor/photo-log       # Send photos
POST /api/proctor/screen-log      # Send screenshots
POST /api/proctor/status-update   # Send status updates
```

## 🔧 Development

### Project Structure

```
monitoring/
├── main_monitor.py        # Main orchestrator
├── face_detection.py      # Face monitoring
├── screen_monitor.py      # Screen monitoring
├── audio_monitor.py       # Audio monitoring
├── requirements.txt       # Python dependencies
├── config.json           # Configuration file
├── models/               # ML models directory
└── README.md            # This file
```

### Adding New Monitors

1. Create a new monitor class inheriting from base monitor
2. Implement required methods: `start_monitoring()`, `stop_monitoring()`, `get_stats()`
3. Add to `ProctorMonitor` class in `main_monitor.py`
4. Update configuration and requirements

### Testing

```bash
# Run individual tests
python -m pytest tests/

# Run with verbose output
python -m pytest tests/ -v

# Run specific test
python -m pytest tests/test_face_detection.py
```

## 🚨 Troubleshooting

### Common Issues

**Camera Not Found:**
```bash
# Check camera devices
python -c "import cv2; print(cv2.VideoCapture(0).isOpened())"
```

**Audio Device Error:**
```bash
# List audio devices
python -c "import pyaudio; p = pyaudio.PyAudio(); [print(p.get_device_info_by_index(i)['name']) for i in range(p.get_device_count())]"
```

**Dlib Model Files Missing:**
```bash
# Download required models
mkdir -p models
# Download shape_predictor_68_face_landmarks.dat
# Download dlib_face_recognition_resnet_model_v1.dat
```

### Performance Optimization

- **Reduce frame processing rate** for better performance
- **Use GPU acceleration** for ML models when available
- **Adjust chunk sizes** based on system capabilities
- **Implement batch processing** for multiple detections

## 📈 Performance Metrics

### Typical Resource Usage

| Component | CPU | Memory | Network |
|-----------|-----|--------|---------|
| Face Detection | 15-25% | 200-400MB | 50-200KB/min |
| Screen Monitoring | 5-15% | 100-200MB | 100-500KB/min |
| Audio Monitoring | 5-10% | 50-100MB | 20-50KB/min |
| **Total** | **25-50%** | **350-700MB** | **170-750KB/min** |

### Alert Response Times

- Face detection: <100ms
- Screen analysis: <200ms
- Audio analysis: <50ms
- API communication: <500ms

## 🔒 Security Considerations

- **Data Encryption**: All captured data is encrypted before transmission
- **Privacy Protection**: No permanent storage of sensitive media
- **Access Control**: API authentication required
- **Audit Logging**: All monitoring activities are logged
- **Compliance**: GDPR and privacy regulation compliant

## 📝 License

This project is part of ProctorAI examination monitoring system.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the logs in `monitoring.log`
3. Ensure all dependencies are correctly installed
4. Verify backend API is running and accessible

---

**ProctorAI** - Advanced AI-powered remote proctoring for secure online examinations.
