import cv2
import numpy as np
import time
from datetime import datetime
import requests
import base64
import json
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import dlib, provide fallback if not available
try:
    import dlib
    DLIB_AVAILABLE = True
    logger.info("DLib available - Advanced face detection enabled")
except ImportError:
    DLIB_AVAILABLE = False
    logger.warning("DLib not available - Using basic face detection only")
    dlib = None

class FaceMonitor:
    def __init__(self, api_url="http://localhost:5001/api"):
        self.api_url = api_url

        # Initialize face detector and recognizer
        if DLIB_AVAILABLE:
            try:
                self.face_detector = dlib.get_frontal_face_detector()

                # Load facial landmarks predictor
                try:
                    self.predictor = dlib.shape_predictor("models/shape_predictor_68_face_landmarks.dat")
                    self.face_recognizer = dlib.face_recognition_model_v1("models/dlib_face_recognition_resnet_model_v1.dat")
                    logger.info("Advanced face recognition models loaded")
                except:
                    logger.warning("Face recognition models not found. Using basic detection only.")
                    self.predictor = None
                    self.face_recognizer = None
            except Exception as e:
                logger.error(f"Failed to initialize DLib face detector: {e}")
                self.face_detector = None
                self.predictor = None
                self.face_recognizer = None
        else:
            logger.info("Using OpenCV Haar cascades for face detection")
            self.face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            self.predictor = None
            self.face_recognizer = None

        # Initialize camera
        try:
            self.cap = cv2.VideoCapture(0)
            if not self.cap.isOpened():
                logger.error("Could not open camera - face monitoring will be limited")
                self.cap = None
            else:
                logger.info("Camera initialized successfully")
        except Exception as e:
            logger.error(f"Camera initialization failed: {e}")
            self.cap = None

        # Known face encodings (would be loaded from database)
        self.known_faces = {}
        self.student_id = None

    def set_student_and_exam(self, student_id, exam_id):
        """Set the current student and exam for monitoring"""
        self.student_id = student_id
        self.exam_id = exam_id
        logger.info(f"Monitoring started for student: {student_id}, exam: {exam_id}")

    def detect_faces(self, frame):
        """Detect faces in the frame"""
        if self.cap is None:
            return []

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        face_data = []

        if DLIB_AVAILABLE and self.face_detector and hasattr(self.face_detector, 'get_frontal_face_detector'):
            # Using DLib face detection
            faces = self.face_detector(gray)

            for face in faces:
                x, y, w, h = face.left(), face.top(), face.width(), face.height()

                face_info = {
                    'bbox': [x, y, w, h],
                    'confidence': 0.9,  # Dlib doesn't provide confidence, using placeholder
                    'landmarks': []
                }

                # Get facial landmarks if predictor is available
                if self.predictor:
                    try:
                        landmarks = self.predictor(gray, face)
                        for i in range(68):
                            face_info['landmarks'].append([landmarks.part(i).x, landmarks.part(i).y])
                    except Exception as e:
                        logger.warning(f"Failed to get landmarks: {e}")

                face_data.append(face_info)

        elif self.face_detector:
            # Using OpenCV Haar cascades
            faces = self.face_detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

            for (x, y, w, h) in faces:
                face_info = {
                    'bbox': [int(x), int(y), int(w), int(h)],
                    'confidence': 0.8,  # Haar cascade confidence
                    'landmarks': []  # Haar cascades don't provide landmarks
                }
                face_data.append(face_info)

        return face_data

    def analyze_behavior(self, face_data, frame):
        """Analyze student behavior from face data"""
        alerts = []
        logger.info(f"🔍 Analyzing behavior for {len(face_data)} faces detected")

        if not face_data:
            logger.warning("🚨 NO FACE DETECTED!")
            alerts.append({
                'type': 'no_face_detected',
                'severity': 'high',
                'message': 'No face detected in frame - student may have left camera view'
            })
            return alerts

        logger.info(f"✅ Found {len(face_data)} face(s)")

        if len(face_data) > 1:
            logger.warning(f"🚨 MULTIPLE FACES DETECTED: {len(face_data)} faces")
            alerts.append({
                'type': 'multiple_faces',
                'severity': 'high',
                'message': f'Multiple faces detected: {len(face_data)} - possible unauthorized person present'
            })

        # Analyze eye gaze and head position
        for i, face in enumerate(face_data):
            logger.info(f"👀 Analyzing face #{i+1}")

            if face['landmarks'] and len(face['landmarks']) >= 68:
                landmarks = face['landmarks']

                # Check head pose/orientation
                head_pose = self.estimate_head_pose(landmarks)
                logger.info(f"📐 Head pose: yaw={head_pose['yaw']:.1f}°, pitch={head_pose['pitch']:.1f}°, confidence={head_pose['confidence']:.2f}")

                if head_pose['confidence'] > 0.7:
                    # Check if face is turned away (more than 30 degrees)
                    if abs(head_pose['yaw']) > 30 or abs(head_pose['pitch']) > 30:
                        logger.warning(f"🚨 FACE TURNED AWAY: yaw={head_pose['yaw']:.1f}°, pitch={head_pose['pitch']:.1f}°")
                        alerts.append({
                            'type': 'face_turned_away',
                            'severity': 'high',
                            'message': f'Face turned away from screen (yaw: {head_pose["yaw"]:.1f}°, pitch: {head_pose["pitch"]:.1f}°)'
                        })

                # Simple eye tracking (left eye: points 36-41, right eye: 42-47)
                if len(landmarks) >= 48:  # Make sure we have eye landmarks
                    left_eye = landmarks[36:42]
                    right_eye = landmarks[42:48]

                    # Calculate eye aspect ratio (EAR)
                    left_ear = self.eye_aspect_ratio(left_eye)
                    right_ear = self.eye_aspect_ratio(right_eye)
                    avg_ear = (left_ear + right_ear) / 2.0

                    logger.info(f"👁️ Eye aspect ratio: {avg_ear:.3f} (left: {left_ear:.3f}, right: {right_ear:.3f})")

                    # Check for closed eyes (potential sleeping) - lower threshold for better detection
                    if avg_ear < 0.20:
                        logger.warning(f"🚨 EYES CLOSED: EAR = {avg_ear:.3f}")
                        alerts.append({
                            'type': 'eyes_closed',
                            'severity': 'medium',
                            'message': f'Eyes appear to be closed (EAR: {avg_ear:.3f}) - possible sleeping'
                        })

                    # Check for looking away (eye gaze detection)
                    eye_gaze = self.estimate_eye_gaze(left_eye, right_eye, landmarks)
                    logger.info(f"👀 Eye gaze: looking_away={eye_gaze['looking_away']}, direction={eye_gaze['direction']}, ratio={eye_gaze['gaze_ratio']:.3f}")

                    if eye_gaze['looking_away']:
                        logger.warning(f"🚨 LOOKING AWAY: direction = {eye_gaze['direction']}")
                        alerts.append({
                            'type': 'looking_away',
                            'severity': 'medium',
                            'message': f'Eyes looking away from screen ({eye_gaze["direction"]}) - possible distraction'
                        })

        logger.info(f"📊 Analysis complete: {len(alerts)} alerts generated")
        return alerts

    def eye_aspect_ratio(self, eye):
        """Calculate eye aspect ratio"""
        # Vertical eye landmarks
        A = np.linalg.norm(np.array(eye[1]) - np.array(eye[5]))
        B = np.linalg.norm(np.array(eye[2]) - np.array(eye[4]))

        # Horizontal eye landmarks
        C = np.linalg.norm(np.array(eye[0]) - np.array(eye[3]))

        # EAR calculation
        ear = (A + B) / (2.0 * C)
        return ear

    def estimate_head_pose(self, landmarks):
        """Estimate head pose from facial landmarks"""
        try:
            # Use key facial landmarks to estimate head orientation
            # Points: nose tip (30), chin (8), left eye corner (36), right eye corner (45)
            nose_tip = np.array(landmarks[30])
            chin = np.array(landmarks[8])
            left_eye = np.array(landmarks[36])
            right_eye = np.array(landmarks[45])

            # Calculate basic head orientation
            eye_center = (left_eye + right_eye) / 2
            nose_vector = nose_tip - eye_center
            chin_vector = chin - eye_center

            # Estimate yaw (left-right rotation) based on nose position relative to eyes
            eye_distance = np.linalg.norm(right_eye - left_eye)
            nose_offset = nose_vector[0] / eye_distance

            # Estimate pitch (up-down rotation) based on chin position
            chin_offset = chin_vector[1] / eye_distance

            # Convert to degrees (rough approximation)
            yaw = np.degrees(np.arctan2(nose_offset, 1.0))
            pitch = np.degrees(np.arctan2(chin_offset, 1.0))

            return {
                'yaw': yaw,
                'pitch': pitch,
                'roll': 0.0,  # Would need more complex calculation
                'confidence': 0.8
            }
        except Exception as e:
            logger.warning(f"Head pose estimation failed: {e}")
            return {
                'yaw': 0.0,
                'pitch': 0.0,
                'roll': 0.0,
                'confidence': 0.0
            }

    def estimate_eye_gaze(self, left_eye, right_eye, landmarks):
        """Estimate eye gaze direction"""
        try:
            # Simple eye gaze estimation based on pupil position relative to eye corners
            # Left eye: corners at indices 0 and 3, pupil approximation at 2
            # Right eye: corners at indices 0 and 3, pupil approximation at 2

            left_pupil = np.array(left_eye[2])  # Approximate pupil center
            left_corner_inner = np.array(left_eye[0])
            left_corner_outer = np.array(left_eye[3])

            right_pupil = np.array(right_eye[2])  # Approximate pupil center
            right_corner_inner = np.array(right_eye[0])
            right_corner_outer = np.array(right_eye[3])

            # Calculate horizontal gaze ratio for each eye
            left_gaze_ratio = (left_pupil[0] - left_corner_inner[0]) / (left_corner_outer[0] - left_corner_inner[0])
            right_gaze_ratio = (right_pupil[0] - right_corner_inner[0]) / (right_corner_outer[0] - right_corner_inner[0])

            avg_gaze_ratio = (left_gaze_ratio + right_gaze_ratio) / 2.0

            # Determine if looking away
            looking_away = False
            direction = "center"

            if avg_gaze_ratio < 0.3:
                looking_away = True
                direction = "left"
            elif avg_gaze_ratio > 0.7:
                looking_away = True
                direction = "right"

            return {
                'looking_away': looking_away,
                'direction': direction,
                'gaze_ratio': avg_gaze_ratio
            }
        except Exception as e:
            logger.warning(f"Eye gaze estimation failed: {e}")
            return {
                'looking_away': False,
                'direction': 'center',
                'gaze_ratio': 0.5
            }

    def capture_and_send_photo(self, frame, alerts):
        """Capture photo and send to backend"""
        try:
            # Encode frame as base64
            _, buffer = cv2.imencode('.jpg', frame)
            photo_data = base64.b64encode(buffer).decode('utf-8')

            # Send to backend
            payload = {
                'studentId': self.student_id,
                'photoData': photo_data,
                'alerts': alerts,
                'timestamp': datetime.now().isoformat()
            }

            response = requests.post(f"{self.api_url}/proctor/photo-log", json=payload)
            if response.status_code == 200:
                logger.info("Photo log sent successfully")
            else:
                logger.error(f"Failed to send photo log: {response.status_code}")

        except Exception as e:
            logger.error(f"Error sending photo: {e}")

    def start_monitoring(self):
        """Start the monitoring loop"""
        logger.info("Starting face monitoring...")

        if self.cap is None:
            logger.warning("Camera not available - face monitoring disabled")
            # Send alert about camera not being available
            self.send_alert({
                'type': 'camera_unavailable',
                'severity': 'medium',
                'message': 'Camera not available for face monitoring'
            })
            return

        frame_count = 0
        alert_batch = []
        last_api_call = time.time()

        while True:
            ret, frame = self.cap.read()
            if not ret:
                logger.error("Failed to capture frame")
                break

            frame_count += 1

            # Process every 60th frame to reduce load (every 2 seconds at 30fps)
            if frame_count % 60 == 0:
                # Detect faces
                faces = self.detect_faces(frame)

                # Analyze behavior
                alerts = self.analyze_behavior(faces, frame)

                # Add to batch instead of sending immediately
                if alerts:
                    alert_batch.extend(alerts)

                # Send batched alerts every 30 seconds to avoid rate limiting
                current_time = time.time()
                if current_time - last_api_call >= 30 and alert_batch:
                    self.send_alert_batch(alert_batch)
                    alert_batch = []  # Clear batch
                    last_api_call = current_time

                # Capture and send photo periodically (every 90 seconds)
                if frame_count % 2700 == 0:  # 30 fps * 90 seconds = 2700 frames
                    self.capture_and_send_photo(frame, alerts)

            # Display frame (optional) - only if window can be created
            try:
                cv2.imshow('ProctorAI Monitoring', frame)
            except cv2.error:
                pass  # GUI not available

            # Exit on 'q' key
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

            # Small delay to prevent excessive CPU usage
            time.sleep(0.01)

        self.cleanup()

    def send_alert(self, alert):
        """Send alert to backend"""
        try:
            payload = {
                'studentId': self.student_id,
                'type': alert['type'],
                'severity': alert['severity'],
                'message': alert['message'],
                'timestamp': datetime.now().isoformat()
            }

            response = requests.post(f"{self.api_url}/proctor/log-event", json=payload)
            if response.status_code == 200:
                logger.info(f"Alert sent: {alert['type']}")
            else:
                logger.error(f"Failed to send alert: {response.status_code}")

        except Exception as e:
            logger.error(f"Error sending alert: {e}")

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
                            'examId': self.exam_id or 'unknown',
                            'type': alert['type'],
                            'severity': alert['severity'],
                            'message': alert['message'],
                            'timestamp': datetime.now().isoformat()
                        }

                        # Add headers to ensure proper request format
                        headers = {
                            'Content-Type': 'application/json',
                            'User-Agent': 'ProctorAI-Monitoring/1.0'
                        }

                        # Use the working screen-log endpoint for alerts (temporary workaround)
                        alert_payload = {
                            'studentId': payload['studentId'],
                            'examId': payload['examId'],
                            'screenshotData': 'alert_data_placeholder',  # Required field
                            'alerts': [payload]  # Put alert in alerts array
                        }
                        response = requests.post(
                            f"{self.api_url}/proctor/screen-log",
                            json=alert_payload,
                            headers=headers,
                            timeout=5
                        )

                        if response.status_code == 200:
                            logger.info(f"Batch alert sent: {alert['type']}")
                            success = True
                            break
                        elif response.status_code == 401:
                            logger.error(f"Authentication failed: {response.status_code} - {response.text}")
                            break  # Don't retry auth failures
                        elif response.status_code == 429:
                            # Rate limited - wait with exponential backoff
                            delay = base_delay * (2 ** attempt) + np.random.uniform(0, 0.1)
                            logger.warning(f"Rate limited, retrying in {delay:.1f}s (attempt {attempt + 1}/{max_retries})")
                            time.sleep(delay)
                        else:
                            logger.error(f"Failed to send batch alert: {response.status_code} - {response.text}")
                            break

                    except requests.exceptions.RequestException as e:
                        logger.error(f"Request failed (attempt {attempt + 1}): {e}")
                        if attempt < max_retries - 1:
                            delay = base_delay * (2 ** attempt) + np.random.uniform(0, 0.1)
                            time.sleep(delay)

                if not success:
                    logger.error(f"Failed to send alert after {max_retries} attempts: {alert['type']}")

                # Always add delay between alerts to prevent rate limiting
                time.sleep(0.2)

        except Exception as e:
            logger.error(f"Error sending alert batch: {e}")

    def cleanup(self):
        """Clean up resources"""
        self.cap.release()
        cv2.destroyAllWindows()
        logger.info("Monitoring stopped")

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
    monitor = FaceMonitor()
    monitor.set_student_and_exam(student_id, exam_id)
    monitor.start_monitoring()
