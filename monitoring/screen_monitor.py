import cv2
import numpy as np
import pyautogui
import time
from datetime import datetime
import requests
import base64
import logging
import os
import sys
from PIL import Image
import mss

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ScreenMonitor:
    def __init__(self, api_url="http://localhost:5001/api"):
        self.api_url = api_url
        self.student_id = None
        self.exam_id = None
        self.previous_screen = None
        self.sct = mss.mss()

    def set_student_and_exam(self, student_id, exam_id):
        """Set student and exam for monitoring"""
        self.student_id = student_id
        self.exam_id = exam_id
        logger.info(f"Screen monitoring started for student: {student_id}, exam: {exam_id}")

    def capture_screen(self):
        """Capture screenshot using mss (faster than pyautogui)"""
        try:
            # Capture entire screen
            monitor = self.sct.monitors[1]  # Primary monitor
            screenshot = self.sct.grab(monitor)

            # Convert to PIL Image
            img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
            return np.array(img)
        except Exception as e:
            logger.error(f"Error capturing screen: {e}")
            return None

    def detect_tab_switching(self, current_screen):
        """Detect if user switched tabs or windows"""
        alerts = []
        logger.info("🔍 Detecting tab/window switches...")

        if self.previous_screen is None:
            logger.info("📸 Storing first screenshot for comparison")
            self.previous_screen = current_screen.copy()
            return alerts

        # Simple difference detection
        if current_screen is not None and self.previous_screen is not None:
            try:
                # Convert to grayscale for comparison
                current_gray = cv2.cvtColor(current_screen, cv2.COLOR_RGB2GRAY)
                previous_gray = cv2.cvtColor(self.previous_screen, cv2.COLOR_RGB2GRAY)

                # Calculate difference
                diff = cv2.absdiff(current_gray, previous_gray)
                _, thresh = cv2.threshold(diff, 30, 255, cv2.THRESH_BINARY)
                change_percentage = (np.sum(thresh > 0) / thresh.size) * 100

                logger.info(f"📊 Screen change analysis: {change_percentage:.2f}% difference")

                # If significant change (>50% for better detection), possible tab switch
                if change_percentage > 50:
                    logger.warning(f"🚨 TAB SWITCH DETECTED: {change_percentage:.1f}% change")
                    alerts.append({
                        'type': 'tab_switch_detected',
                        'severity': 'high',
                        'message': f'Tab switch detected ({change_percentage:.1f}% screen change) - browser tab/window changed'
                    })

                # Advanced detection: Check for sudden complete content changes
                # This often indicates switching between applications/windows
                if change_percentage > 80:
                    logger.warning(f"🚨 WINDOW SWITCH DETECTED: {change_percentage:.1f}% major change")
                    alerts.append({
                        'type': 'window_switch_detected',
                        'severity': 'high',
                        'message': f'Window switch detected ({change_percentage:.1f}% content change) - application/window changed'
                    })

                # Update previous screen for next comparison
                self.previous_screen = current_screen.copy()
                logger.info("✅ Screen comparison completed")

            except Exception as e:
                logger.error(f"💥 Error in screen comparison: {e}")

        logger.info(f"📋 Tab detection result: {len(alerts)} alerts generated")
        return alerts

    def detect_suspicious_windows(self, current_screen):
        """Detect suspicious windows or applications"""
        alerts = []

        # This is a simplified version - in production, you'd use more sophisticated
        # window detection libraries or OCR to identify specific applications

        # For now, just check for drastic color changes that might indicate
        # switching to different applications
        if current_screen is not None:
            try:
                # Check for mostly white screens (could indicate document viewer)
                gray = cv2.cvtColor(current_screen, cv2.COLOR_RGB2GRAY)
                white_pixels = np.sum(gray > 200)
                total_pixels = gray.size
                white_percentage = (white_pixels / total_pixels) * 100

                if white_percentage > 80:
                    alerts.append({
                        'type': 'suspicious_screen_content',
                        'severity': 'medium',
                        'message': 'Screen appears to be mostly white (possible document viewer)'
                    })

            except Exception as e:
                logger.error(f"Error analyzing screen content: {e}")

        return alerts

    def capture_and_send_screenshot(self, frame, alerts):
        """Capture screenshot and send to backend"""
        try:
            # Encode frame as base64
            _, buffer = cv2.imencode('.jpg', cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))
            screenshot_data = base64.b64encode(buffer).decode('utf-8')

            # Send to backend
            payload = {
                'studentId': self.student_id,
                'examId': self.exam_id,
                'screenshotData': screenshot_data,
                'alerts': alerts,
                'timestamp': datetime.now().isoformat()
            }

            response = requests.post(f"{self.api_url}/proctor/screen-log", json=payload)
            if response.status_code == 200:
                logger.info("Screenshot log sent successfully")
            else:
                logger.error(f"Failed to send screenshot log: {response.status_code}")

        except Exception as e:
            logger.error(f"Error sending screenshot: {e}")

    def start_monitoring(self):
        """Start screen monitoring loop"""
        logger.info("Starting screen monitoring...")

        frame_count = 0
        alert_batch = []
        last_api_call = time.time()

        while True:
            frame_count += 1

            try:
                # Capture screen every 2 seconds (reduced frequency)
                if frame_count % 120 == 0:  # Every 4 seconds at 30 FPS
                    current_screen = self.capture_screen()

                    if current_screen is not None:
                        # Detect tab switching
                        tab_alerts = self.detect_tab_switching(current_screen)

                        # Detect suspicious windows
                        window_alerts = self.detect_suspicious_windows(current_screen)

                        # Combine alerts
                        all_alerts = tab_alerts + window_alerts

                        # Add to batch instead of sending immediately
                        if all_alerts:
                            alert_batch.extend(all_alerts)

                        # Send batched alerts every 30 seconds to avoid rate limiting
                        current_time = time.time()
                        if current_time - last_api_call >= 30 and alert_batch:
                            self.send_alert_batch(alert_batch)
                            alert_batch = []  # Clear batch
                            last_api_call = current_time

                        # Capture and send screenshot every 120 seconds (reduced frequency)
                        if frame_count % 3600 == 0:  # 30 FPS * 120 seconds = 3600 frames
                            self.capture_and_send_screenshot(current_screen, all_alerts)

                time.sleep(1/30)  # 30 FPS

            except KeyboardInterrupt:
                logger.info("Screen monitoring stopped by user")
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(1)  # Wait before retrying

        self.cleanup()

    def send_alert(self, alert):
        """Send alert to backend"""
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
            response = requests.post(f"{self.api_url}/proctor/screen-log", json=alert_payload)
            if response.status_code == 200:
                logger.info(f"Screen alert sent: {alert['type']}")
            else:
                logger.error(f"Failed to send screen alert: {response.status_code}")

        except Exception as e:
            logger.error(f"Error sending screen alert: {e}")

    def send_alert_batch(self, alerts):
        """Send multiple alerts in batch to reduce API calls with rate limiting"""
        if not alerts:
            return

        try:
            # Send alerts with exponential backoff for rate limiting
            for alert in alerts:
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
                            logger.info(f"Batch screen alert sent: {alert['type']}")
                            success = True
                            break
                        elif response.status_code == 429:
                            # Rate limited - wait with exponential backoff
                            delay = base_delay * (2 ** attempt) + np.random.uniform(0, 0.1)
                            logger.warning(f"Rate limited, retrying in {delay:.1f}s (attempt {attempt + 1}/{max_retries})")
                            time.sleep(delay)
                        else:
                            logger.error(f"Failed to send batch screen alert: {response.status_code}")
                            break

                    except requests.exceptions.RequestException as e:
                        logger.error(f"Request failed (attempt {attempt + 1}): {e}")
                        if attempt < max_retries - 1:
                            delay = base_delay * (2 ** attempt) + np.random.uniform(0, 0.1)
                            time.sleep(delay)

                if not success:
                    logger.error(f"Failed to send screen alert after {max_retries} attempts: {alert['type']}")

                # Always add delay between alerts to prevent rate limiting
                time.sleep(0.2)

        except Exception as e:
            logger.error(f"Error sending screen alert batch: {e}")

    def cleanup(self):
        """Clean up resources"""
        self.sct.close()
        logger.info("Screen monitoring stopped")

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
    monitor = ScreenMonitor()
    monitor.set_student_and_exam(student_id, exam_id)
    monitor.start_monitoring()
