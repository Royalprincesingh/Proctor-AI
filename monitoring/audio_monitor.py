import pyaudio
import numpy as np
import time
from datetime import datetime
import requests
import logging
import threading
import queue
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AudioMonitor:
    def __init__(self, api_url="http://localhost:5001/api"):
        self.api_url = api_url
        self.student_id = None
        self.exam_id = None
        self.audio = None
        self.stream = None
        self.is_monitoring = False

        # Audio parameters
        self.CHUNK = 1024
        self.FORMAT = pyaudio.paInt16
        self.CHANNELS = 1
        self.RATE = 44100

        # Audio analysis parameters
        self.silence_threshold = 500  # Amplitude threshold for silence
        self.background_noise_levels = []
        self.consecutive_silence_frames = 0
        self.max_silence_frames = 300  # ~7 seconds at 44100Hz/1024chunk

        # Voice detection
        self.voice_detected_frames = 0
        self.total_frames = 0

    def set_student_and_exam(self, student_id, exam_id):
        """Set student and exam for monitoring"""
        self.student_id = student_id
        self.exam_id = exam_id
        logger.info(f"Audio monitoring started for student: {student_id}, exam: {exam_id}")

    def initialize_audio(self):
        """Initialize PyAudio"""
        try:
            self.audio = pyaudio.PyAudio()

            # Find default input device
            default_device_index = self.audio.get_default_input_device_info()['index']

            self.stream = self.audio.open(
                format=self.FORMAT,
                channels=self.CHANNELS,
                rate=self.RATE,
                input=True,
                input_device_index=default_device_index,
                frames_per_buffer=self.CHUNK
            )

            logger.info("Audio monitoring initialized successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize audio: {e}")
            return False

    def analyze_audio_chunk(self, audio_data):
        """Analyze audio chunk for suspicious activity"""
        alerts = []

        # Convert to numpy array
        audio_array = np.frombuffer(audio_data, dtype=np.int16)
        amplitude = np.abs(audio_array).mean()

        # Track silence
        if amplitude < self.silence_threshold:
            self.consecutive_silence_frames += 1

            # Alert if too much consecutive silence (possible unattended exam)
            if self.consecutive_silence_frames > self.max_silence_frames:
                alerts.append({
                    'type': 'excessive_silence',
                    'severity': 'medium',
                    'message': f'Excessive silence detected ({self.consecutive_silence_frames * self.CHUNK / self.RATE:.1f} seconds)'
                })
        else:
            self.consecutive_silence_frames = 0

        # Track background noise levels
        self.background_noise_levels.append(amplitude)
        if len(self.background_noise_levels) > 100:  # Keep last 100 chunks
            self.background_noise_levels.pop(0)

        # Calculate average background noise
        if len(self.background_noise_levels) > 10:
            avg_noise = np.mean(self.background_noise_levels)
            current_noise = amplitude

            # Detect sudden noise spikes (possible talking or external noise)
            if current_noise > avg_noise * 3 and current_noise > 1000:
                alerts.append({
                    'type': 'sudden_noise_spike',
                    'severity': 'low',
                    'message': f'Sudden noise spike detected (amplitude: {current_noise:.0f})'
                })

        # Basic voice activity detection
        self.total_frames += 1
        if amplitude > 1000:  # Voice threshold
            self.voice_detected_frames += 1

        return alerts

    def detect_multiple_voices(self, audio_data):
        """Advanced voice detection (simplified)"""
        alerts = []

        # This is a simplified version - in production, you'd use more sophisticated
        # voice separation algorithms or ML models

        # For now, just check for unusual frequency patterns
        audio_array = np.frombuffer(audio_data, dtype=np.int16)

        # Simple frequency analysis
        if len(audio_array) > 0:
            # Calculate zero crossings (rough voice activity measure)
            zero_crossings = np.sum(np.diff(np.sign(audio_array)) != 0)
            crossing_rate = zero_crossings / len(audio_array)

            # High crossing rate might indicate multiple voices or background noise
            if crossing_rate > 0.1:  # Threshold for multiple voices
                alerts.append({
                    'type': 'possible_multiple_voices',
                    'severity': 'high',
                    'message': f'Unusual audio pattern detected (crossing rate: {crossing_rate:.3f})'
                })

        return alerts

    def send_alert(self, alert):
        """Send alert to backend with rate limiting and exponential backoff"""
        success = False
        max_retries = 3
        base_delay = 1.0  # Start with 1 second delay

        for attempt in range(max_retries):
            try:
                payload = {
                    'studentId': self.student_id,
                    'examId': self.exam_id,
                    'type': alert['type'],
                    'severity': alert['severity'],
                    'message': alert['message'],
                    'timestamp': datetime.now().isoformat()
                }

                # Use screen-log endpoint for alerts (workaround)
                alert_payload = {
                    'studentId': payload['studentId'],
                    'examId': payload['examId'],
                    'screenshotData': 'alert_data_placeholder',
                    'alerts': [payload]
                }
                response = requests.post(f"{self.api_url}/proctor/screen-log", json=alert_payload, timeout=5)

                if response.status_code == 200:
                    logger.info(f"Audio alert sent: {alert['type']}")
                    success = True
                    break
                elif response.status_code == 429:
                    # Rate limited - wait with exponential backoff
                    delay = base_delay * (2 ** attempt) + np.random.uniform(0, 0.1)
                    logger.warning(f"Rate limited, retrying in {delay:.1f}s (attempt {attempt + 1}/{max_retries})")
                    time.sleep(delay)
                else:
                    logger.error(f"Failed to send audio alert: {response.status_code}")
                    break

            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed (attempt {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt) + np.random.uniform(0, 0.1)
                    time.sleep(delay)

        if not success:
            logger.error(f"Failed to send audio alert after {max_retries} attempts: {alert['type']}")

    def start_monitoring(self):
        """Start audio monitoring loop"""
        logger.info("Starting audio monitoring...")

        if not self.initialize_audio():
            return

        self.is_monitoring = True
        alert_count = 0

        try:
            while self.is_monitoring:
                # Read audio chunk
                audio_data = self.stream.read(self.CHUNK, exception_on_overflow=False)

                # Analyze audio
                alerts = self.analyze_audio_chunk(audio_data)

                # Advanced voice detection (every 10 chunks)
                alert_count += 1
                if alert_count % 10 == 0:
                    voice_alerts = self.detect_multiple_voices(audio_data)
                    alerts.extend(voice_alerts)

                # Send alerts with rate limiting (every 30 seconds max)
                if alerts:
                    current_time = time.time()
                    if not hasattr(self, 'last_alert_time'):
                        self.last_alert_time = 0

                    if current_time - self.last_alert_time >= 30:  # Only send alerts every 30 seconds
                        for alert in alerts:
                            self.send_alert(alert)
                        self.last_alert_time = current_time

                # Small delay to prevent overwhelming the system
                time.sleep(0.1)

        except KeyboardInterrupt:
            logger.info("Audio monitoring stopped by user")
        except Exception as e:
            logger.error(f"Error in audio monitoring: {e}")
        finally:
            self.cleanup()

    def stop_monitoring(self):
        """Stop monitoring"""
        self.is_monitoring = False
        logger.info("Audio monitoring stop requested")

    def get_monitoring_stats(self):
        """Get monitoring statistics"""
        voice_percentage = (self.voice_detected_frames / max(self.total_frames, 1)) * 100

        return {
            'total_frames': self.total_frames,
            'voice_frames': self.voice_detected_frames,
            'voice_percentage': voice_percentage,
            'consecutive_silence': self.consecutive_silence_frames * self.CHUNK / self.RATE
        }

    def cleanup(self):
        """Clean up resources"""
        if self.stream:
            self.stream.stop_stream()
            self.stream.close()
        if self.audio:
            self.audio.terminate()
        logger.info("Audio monitoring stopped")

if __name__ == "__main__":
    # Parse command line arguments
    if len(sys.argv) >= 3:
        student_id = sys.argv[1]
        exam_id = sys.argv[2]
    else:
        # Fallback for testing
        student_id = "student_id_here"
        exam_id = "exam_id_here"
        logger.warning("No command line arguments provided, using default values")

    # Start monitoring
    monitor = AudioMonitor()
    monitor.set_student_and_exam(student_id, exam_id)
    monitor.start_monitoring()

    # Print final stats when monitoring ends
    stats = monitor.get_monitoring_stats()
    print(f"Monitoring Stats: {stats}")
