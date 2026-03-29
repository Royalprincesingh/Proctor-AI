import threading
import time
import signal
import sys
from datetime import datetime
import logging
import requests
import json
from face_detection import FaceMonitor
from screen_monitor import ScreenMonitor
from audio_monitor import AudioMonitor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('monitoring.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ProctorMonitor:
    def __init__(self, api_url="http://localhost:5001/api"):
        self.api_url = api_url
        self.student_id = None
        self.exam_id = None
        self.is_running = False

        # Initialize monitors
        self.face_monitor = FaceMonitor(api_url)
        self.screen_monitor = ScreenMonitor(api_url)
        self.audio_monitor = AudioMonitor(api_url)

        # Monitor threads
        self.threads = []
        self.monitoring_stats = {
            'start_time': None,
            'face_alerts': 0,
            'screen_alerts': 0,
            'audio_alerts': 0,
            'total_alerts': 0
        }

    def set_student_and_exam(self, student_id, exam_id):
        """Set student and exam information for all monitors"""
        self.student_id = student_id
        self.exam_id = exam_id

        self.face_monitor.set_student(student_id)
        self.screen_monitor.set_student_and_exam(student_id, exam_id)
        self.audio_monitor.set_student_and_exam(student_id, exam_id)

        logger.info(f"ProctorMonitor initialized for student: {student_id}, exam: {exam_id}")

    def start_monitoring(self):
        """Start all monitoring threads"""
        if self.is_running:
            logger.warning("Monitoring is already running")
            return

        logger.info("Starting ProctorAI monitoring system...")

        self.is_running = True
        self.monitoring_stats['start_time'] = datetime.now()

        # Send monitoring started event
        self.send_system_event('monitoring_started', 'Monitoring system initialized')

        # Start face monitoring thread
        face_thread = threading.Thread(
            target=self._run_face_monitoring,
            name="FaceMonitor",
            daemon=True
        )
        face_thread.start()
        self.threads.append(face_thread)

        # Start screen monitoring thread
        screen_thread = threading.Thread(
            target=self._run_screen_monitoring,
            name="ScreenMonitor",
            daemon=True
        )
        screen_thread.start()
        self.threads.append(screen_thread)

        # Start audio monitoring thread
        audio_thread = threading.Thread(
            target=self._run_audio_monitoring,
            name="AudioMonitor",
            daemon=True
        )
        audio_thread.start()
        self.threads.append(audio_thread)

        # Start status reporting thread
        status_thread = threading.Thread(
            target=self._report_status,
            name="StatusReporter",
            daemon=True
        )
        status_thread.start()
        self.threads.append(status_thread)

        logger.info("All monitoring threads started")

        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _run_face_monitoring(self):
        """Run face monitoring in a thread"""
        try:
            logger.info("Face monitoring thread started")
            self.face_monitor.start_monitoring()
        except Exception as e:
            logger.error(f"Face monitoring error: {e}")

    def _run_screen_monitoring(self):
        """Run screen monitoring in a thread"""
        try:
            logger.info("Screen monitoring thread started")
            self.screen_monitor.start_monitoring()
        except Exception as e:
            logger.error(f"Screen monitoring error: {e}")

    def _run_audio_monitoring(self):
        """Run audio monitoring in a thread"""
        try:
            logger.info("Audio monitoring thread started")
            self.audio_monitor.start_monitoring()
        except Exception as e:
            logger.error(f"Audio monitoring error: {e}")

    def _report_status(self):
        """Report monitoring status periodically"""
        while self.is_running:
            try:
                # Get stats from monitors
                audio_stats = self.audio_monitor.get_monitoring_stats()

                status_data = {
                    'studentId': self.student_id,
                    'examId': self.exam_id,
                    'uptime': str(datetime.now() - self.monitoring_stats['start_time']),
                    'audio_stats': audio_stats,
                    'total_alerts': self.monitoring_stats['total_alerts']
                }

                # Send status update to backend
                response = requests.post(f"{self.api_url}/proctor/status-update", json=status_data)
                if response.status_code == 200:
                    logger.info("Status update sent successfully")
                else:
                    logger.warning(f"Failed to send status update: {response.status_code}")

            except Exception as e:
                logger.error(f"Error reporting status: {e}")

            # Report every 60 seconds
            time.sleep(60)

    def send_system_event(self, event_type, message):
        """Send system event to backend"""
        try:
            payload = {
                'studentId': self.student_id,
                'examId': self.exam_id,
                'type': event_type,
                'severity': 'info',
                'message': message,
                'timestamp': datetime.now().isoformat()
            }

            response = requests.post(f"{self.api_url}/proctor/log-event", json=payload)
            if response.status_code == 200:
                logger.info(f"System event sent: {event_type}")
            else:
                logger.error(f"Failed to send system event: {response.status_code}")

        except Exception as e:
            logger.error(f"Error sending system event: {e}")

    def stop_monitoring(self):
        """Stop all monitoring threads"""
        if not self.is_running:
            logger.warning("Monitoring is not running")
            return

        logger.info("Stopping ProctorAI monitoring system...")

        self.is_running = False

        # Stop audio monitoring
        self.audio_monitor.stop_monitoring()

        # Wait for threads to finish
        for thread in self.threads:
            if thread.is_alive():
                thread.join(timeout=5)

        # Send monitoring stopped event
        self.send_system_event('monitoring_stopped', 'Monitoring system stopped')

        # Calculate final stats
        end_time = datetime.now()
        duration = end_time - self.monitoring_stats['start_time']

        final_stats = {
            'studentId': self.student_id,
            'examId': self.exam_id,
            'duration': str(duration),
            'total_alerts': self.monitoring_stats['total_alerts'],
            'end_time': end_time.isoformat()
        }

        logger.info(f"Monitoring stopped. Final stats: {final_stats}")

    def _signal_handler(self, signum, frame):
        """Handle system signals for graceful shutdown"""
        logger.info(f"Received signal {signum}, shutting down...")
        self.stop_monitoring()
        sys.exit(0)

    def get_monitoring_stats(self):
        """Get comprehensive monitoring statistics"""
        audio_stats = self.audio_monitor.get_monitoring_stats()

        return {
            'is_running': self.is_running,
            'start_time': self.monitoring_stats['start_time'],
            'uptime': str(datetime.now() - (self.monitoring_stats['start_time'] or datetime.now())),
            'student_id': self.student_id,
            'exam_id': self.exam_id,
            'audio_stats': audio_stats,
            'alert_counts': {
                'face': self.monitoring_stats['face_alerts'],
                'screen': self.monitoring_stats['screen_alerts'],
                'audio': self.monitoring_stats['audio_alerts'],
                'total': self.monitoring_stats['total_alerts']
            },
            'threads_active': len([t for t in self.threads if t.is_alive()])
        }

def load_config():
    """Load monitoring configuration"""
    try:
        with open('config.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # Default configuration
        return {
            'api_url': 'http://localhost:5001/api',
            'student_id': 'test_student',
            'exam_id': 'test_exam',
            'monitoring_duration': 3600  # 1 hour in seconds
        }

if __name__ == "__main__":
    # Load configuration
    config = load_config()

    # Initialize monitor
    monitor = ProctorMonitor(config.get('api_url', 'http://localhost:5001/api'))

    # Set student and exam
    monitor.face_monitor.set_student_and_exam(
        config.get('student_id', 'test_student'),
        config.get('exam_id', 'test_exam')
    )
    monitor.screen_monitor.set_student_and_exam(
        config.get('student_id', 'test_student'),
        config.get('exam_id', 'test_exam')
    )
    monitor.audio_monitor.set_student_and_exam(
        config.get('student_id', 'test_student'),
        config.get('exam_id', 'test_exam')
    )

    try:
        # Start monitoring
        monitor.start_monitoring()

        # Keep the main thread alive
        while monitor.is_running:
            time.sleep(1)

    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Monitoring failed: {e}")
    finally:
        monitor.stop_monitoring()

        # Print final statistics
        stats = monitor.get_monitoring_stats()
        print("\n=== MONITORING SESSION COMPLETE ===")
        print(json.dumps(stats, indent=2, default=str))
