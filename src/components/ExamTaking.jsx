import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionAPI, examAPI, authHelpers } from '../services/api';
import { QRCodeCanvas } from 'qrcode.react';

const ExamTaking = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  // Check URL parameters for mobile mode
  const urlParams = new URLSearchParams(window.location.search);
  // const isMobileMode = urlParams.get('mobile') === 'true'; // Commented for desktop focus
  const isMobileMode = false; // Force desktop mode for now
  const urlStudentId = urlParams.get('student');

  const [exam, setExam] = useState(null);
  const [student, setStudent] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Track camera readiness - must be declared before useEffect hooks
  const [cameraReady, setCameraReady] = useState(false);
  const [screenReady, setScreenReady] = useState(false);
  const [setupPhase, setSetupPhase] = useState(true); // New state for setup phase

  // Tab switch detection
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabSwitchAlert, setShowTabSwitchAlert] = useState(false);
  const [tabSwitchModalVisible, setTabSwitchModalVisible] = useState(false);

  // Load exam details and student info
  useEffect(() => {
    const loadExam = async () => {
      try {
        setLoading(true);
        setError('');

        // Get student from session
        const session = authHelpers.getCurrentSession();
        if (!session || !session.user) {
          navigate('/');
          return;
        }
        setStudent(session.user);

        // Load exam details
        const examResponse = await examAPI.getExam(examId);
        if (examResponse.success) {
          setExam(examResponse.data);
        } else {
          setError('Failed to load exam details');
        }
      } catch (err) {
        console.error('Error loading exam:', err);
        setError('Failed to load exam');
      } finally {
        setLoading(false);
      }
    };

    if (examId) {
      loadExam();
    }
  }, [examId, navigate]);

  // Calculate exam duration in seconds and start setup phase
  useEffect(() => {
    if (exam) {
      const durationInMinutes = exam.duration || 60;
      const durationInSeconds = durationInMinutes * 60;
      setTimeLeft(durationInSeconds);

      // Load questions
      loadQuestions();

      // Start monitoring setup when exam data is loaded
      console.log('🎯 Starting pre-exam monitoring setup...');
      startMonitoringSetup();
    }
  }, [exam]);

  // Timer countdown
  useEffect(() => {
    if (examStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up - auto submit
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [examStarted, timeLeft]);

  // Camera access and monitoring
  useEffect(() => {
    if (examStarted) {
      startCamera();
    }

    return () => {
      // Cleanup when component unmounts
      console.log('ExamTaking component unmounting - stopping monitoring...');
      stopCamera();
      // Note: Python monitoring processes will be stopped by the backend when needed
    };
  }, [examStarted]);

  // Cleanup on navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('Page unloading - stopping monitoring...');
      stopCamera();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Tab/Window switch detection using Page Visibility API
  useEffect(() => {
    if (examStarted) {
      console.log('👁️ Setting up tab/window switch detection...');

      let lastHiddenTime = null;
      let localTabSwitchCount = tabSwitchCount; // Use local variable to avoid stale closure

      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Tab/window became hidden - increment counter and show alert
          lastHiddenTime = Date.now();
          console.log('⚠️ Tab/window hidden - possible tab switch');

          localTabSwitchCount += 1;
          console.log('📊 Tab switch count incremented to:', localTabSwitchCount);

          // Update React state
          setTabSwitchCount(localTabSwitchCount);

          // Show alert modal immediately
          setTabSwitchModalVisible(true);
          updateLiveAlerts(`⚠️ Tab switch #${localTabSwitchCount} detected - exam integrity compromised`);

          // Send alert to backend
          sendTabSwitchAlert('tab_hidden', localTabSwitchCount);

          // Check if this is the 3rd switch - auto submit
          if (localTabSwitchCount >= 3) {
            console.log('🚨 3rd tab switch detected - auto submitting exam');
            updateLiveAlerts('🚨 Multiple tab switches detected - auto submitting exam');

            // Auto-submit immediately without delay for violations
            handleSubmitExam();
          }
        } else {
          // Tab/window became visible again
          if (lastHiddenTime) {
            const hiddenDuration = Date.now() - lastHiddenTime;
            console.log(`✅ Tab/window visible again - was hidden for ${hiddenDuration}ms`);
            updateLiveAlerts(`✅ Returned to exam tab (${hiddenDuration}ms away)`);

            if (hiddenDuration > 5000) { // More than 5 seconds
              updateLiveAlerts('🚨 WARNING: Extended absence from exam tab detected');
              sendTabSwitchAlert('extended_absence', localTabSwitchCount, hiddenDuration);
            }
          }
        }
      };

      const handleWindowBlur = () => {
        console.log('🔄 Window lost focus - possible window switch');
        updateLiveAlerts('🔄 Window lost focus - ensure you stay on exam');
      };

      const handleWindowFocus = () => {
        console.log('🎯 Window gained focus');
      };

      // Prevent right-click context menu
      const handleContextMenu = (e) => {
        e.preventDefault();
        updateLiveAlerts('⚠️ Right-click detected - potential cheating attempt');
        sendTabSwitchAlert('right_click_detected', 1);
      };

      // Prevent copy/paste operations
      const handleCopy = (e) => {
        e.preventDefault();
        updateLiveAlerts('⚠️ Copy operation blocked');
        sendTabSwitchAlert('copy_attempt', 1);
      };

      const handlePaste = (e) => {
        e.preventDefault();
        updateLiveAlerts('⚠️ Paste operation blocked');
        sendTabSwitchAlert('paste_attempt', 1);
      };

      const handleCut = (e) => {
        e.preventDefault();
        updateLiveAlerts('⚠️ Cut operation blocked');
        sendTabSwitchAlert('cut_attempt', 1);
      };

      // Prevent keyboard shortcuts
      const handleKeyDown = (e) => {
        // Prevent F12 (developer tools)
        if (e.key === 'F12') {
          e.preventDefault();
          updateLiveAlerts('⚠️ Developer tools access blocked');
          sendTabSwitchAlert('dev_tools_attempt', 1);
        }

        // Prevent Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
          e.preventDefault();
          updateLiveAlerts('⚠️ Developer tools shortcut blocked');
          sendTabSwitchAlert('dev_tools_shortcut', 1);
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
          e.preventDefault();
          updateLiveAlerts('⚠️ View source blocked');
          sendTabSwitchAlert('view_source_attempt', 1);
        }
      };

      // Add event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('copy', handleCopy);
      document.addEventListener('paste', handlePaste);
      document.addEventListener('cut', handleCut);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        console.log('🛑 Removing tab/window detection listeners...');
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleWindowBlur);
        window.removeEventListener('focus', handleWindowFocus);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('copy', handleCopy);
        document.removeEventListener('paste', handlePaste);
        document.removeEventListener('cut', handleCut);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [examStarted]);

  const sendTabSwitchAlert = async (type, count, duration = null) => {
    try {
      const session = authHelpers.getCurrentSession();
      const token = session?.token;

      if (!token || !student?.id || !exam?._id) return;

      const message = type === 'tab_hidden'
        ? `Tab switch #${count} detected - student left exam tab`
        : type === 'extended_absence'
        ? `Extended absence detected (${Math.round(duration/1000)}s) - possible cheating`
        : 'Window/tab activity detected';

      const response = await fetch('http://localhost:5001/api/proctor/log-event', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: student.id,
          examId: exam._id,
          type: type === 'tab_hidden' ? 'tab_switch_detected' : 'window_switch_detected',
          severity: type === 'extended_absence' ? 'high' : 'medium',
          message: message,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log('✅ Tab switch alert sent to backend');
      } else {
        console.error('❌ Failed to send tab switch alert:', response.status);
      }
    } catch (error) {
      console.error('💥 Error sending tab switch alert:', error);
    }
  };

  // Real-time alert polling
  useEffect(() => {
    if (examStarted && student?.id && exam?._id) {
      console.log('🚀 Starting real-time alert polling...');

      const pollAlerts = async () => {
        try {
          const session = authHelpers.getCurrentSession();
          const token = session?.token;

          if (!token) return;

          console.log('🔍 Polling for alerts...');
          const response = await fetch(
            `http://localhost:5001/api/proctor/student-alerts/${student.id}/${exam._id}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          console.log('📡 Alert response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('📨 Alert data received:', data);

            if (data.success && data.alerts && data.alerts.length > 0) {
              console.log('🚨 ALERTS DETECTED:', data.alerts.length);

              // Display each alert in the UI with timestamp
              data.alerts.forEach(alert => {
                const alertMessage = `🚨 ${alert.severity.toUpperCase()}: ${alert.message}`;
                console.log('📢 Displaying alert:', alertMessage);
                updateLiveAlerts(alertMessage);
              });
            } else {
              console.log('✅ No new alerts');
            }
          } else {
            console.error('❌ Alert polling failed:', response.status);
          }
        } catch (error) {
          console.error('💥 Alert polling error:', error);
        }
      };

      // Poll every 2 seconds for faster alerts
      const intervalId = setInterval(pollAlerts, 2000);

      // Initial poll
      pollAlerts();

      return () => {
        console.log('🛑 Stopping alert polling...');
        clearInterval(intervalId);
      };
    }
  }, [examStarted, student?.id, exam?._id]);

  // Live video streaming to backend - triggered after camera is ready (both setup and exam phases)
  useEffect(() => {
    if (student?.id && cameraReady && (setupPhase || examStarted)) {
      console.log('🎥 Camera is ready, starting live video streaming to backend...');

      // Small delay to ensure camera is fully initialized
      setTimeout(() => {
        startCameraStreaming();
        // Note: Screen streaming requires explicit user permission
        // Will be initiated separately if needed
        console.log('📺 Screen streaming will require manual user permission');
      }, 2000);

      return () => {
        console.log('🛑 Stopping live video streaming...');
        stopVideoStreaming();
      };
    }
  }, [student?.id, cameraReady, setupPhase, examStarted]);

  // Screen sharing initiation - separate from camera
  const initiateScreenSharing = async () => {
    try {
      console.log('🖥️ Initiating screen sharing...');
      await startScreenStreaming();
      updateLiveAlerts('✅ Screen sharing started successfully');
    } catch (error) {
      console.error('❌ Screen sharing failed:', error);
      updateLiveAlerts('❌ Screen sharing permission denied');
    }
  };

  // Screen sharing is now manual only - no auto-start

  const startCameraStreaming = () => {
    try {
      console.log('📹 Starting camera frame streaming...');

      // Try setup camera first (during setup phase), then exam camera
      let videoElement = document.getElementById('setupCamera');
      if (!videoElement || !videoElement.srcObject) {
        videoElement = document.getElementById('examCamera');
      }

      if (!videoElement || !videoElement.srcObject) {
        console.warn('⚠️ Camera not available for streaming - video element not ready');
        updateLiveAlerts('⚠️ Camera streaming unavailable - video not ready');
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let frameCount = 0;

      const sendFrame = async () => {
        try {
          if (!videoElement.srcObject || !videoElement.videoWidth) {
            console.warn('⚠️ Camera stream not ready for frame capture');
            return;
          }

          frameCount++;
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;

          ctx.drawImage(videoElement, 0, 0);

          const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.8);
          });

          if (blob && blob.size > 0) {
            console.log(`📤 Sending camera frame #${frameCount} (${blob.size} bytes)`);

            const response = await fetch('http://localhost:5001/api/proctor/camera-frame', {
              method: 'POST',
              headers: {
                'student-id': student.id,
                'Content-Type': 'image/jpeg'
              },
              body: blob
            });

            if (response.ok) {
              console.log(`✅ Camera frame #${frameCount} sent successfully`);
            } else {
              console.error(`❌ Camera frame #${frameCount} send failed:`, response.status);
            }
          } else {
            console.warn(`⚠️ Camera frame #${frameCount} blob creation failed`);
          }
        } catch (error) {
          console.error('💥 Camera frame capture/send error:', error);
        }
      };

      // Send frame every 1000ms (1 fps - reduced for stability)
      const cameraInterval = setInterval(sendFrame, 1000);

      // Store interval for cleanup
      if (!window.streamingIntervals) window.streamingIntervals = {};
      window.streamingIntervals.camera = cameraInterval;

      console.log('✅ Camera streaming started - sending frames every 1 second');
      updateLiveAlerts('📹 Camera streaming to admin started');
    } catch (error) {
      console.error('❌ Camera streaming setup error:', error);
      updateLiveAlerts('❌ Camera streaming failed to start');
    }
  };

  const startScreenStreaming = async () => {
    try {
      console.log('🖥️ Starting screen frame streaming...');

      // Request screen sharing permission
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: false
      });

      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;

      await screenVideo.play();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const sendFrame = () => {
        try {
          if (!screenVideo.srcObject || !screenVideo.videoWidth) return;

          canvas.width = screenVideo.videoWidth;
          canvas.height = screenVideo.videoHeight;

          ctx.drawImage(screenVideo, 0, 0);

          canvas.toBlob((blob) => {
            if (blob) {
              fetch('http://localhost:5001/api/proctor/screen-frame', {
                method: 'POST',
                headers: {
                  'student-id': student.id
                },
                body: blob
              }).catch(err => console.error('Screen frame send error:', err));
            }
          }, 'image/jpeg', 0.7);
        } catch (error) {
          console.error('Screen frame capture error:', error);
        }
      };

      // Send frame every 1000ms (1 fps for screen - less critical)
      const screenInterval = setInterval(sendFrame, 1000);

      // Store interval for cleanup
      if (!window.streamingIntervals) window.streamingIntervals = {};
      window.streamingIntervals.screen = screenInterval;
      window.streamingIntervals.screenStream = screenStream;

      console.log('✅ Screen streaming started');
      setScreenReady(true);
      updateLiveAlerts('✅ Screen sharing started successfully');
    } catch (error) {
      console.error('❌ Screen streaming error:', error);
      console.log('⚠️ Screen sharing permission denied - continuing with camera only');
      updateLiveAlerts('❌ Screen sharing permission denied');
    }
  };

  const stopVideoStreaming = () => {
    try {
      // Clear all streaming intervals
      if (window.streamingIntervals) {
        Object.values(window.streamingIntervals).forEach(interval => {
          if (typeof interval === 'number') {
            clearInterval(interval);
          } else if (interval && typeof interval.getTracks === 'function') {
            // Stop media stream
            interval.getTracks().forEach(track => track.stop());
          }
        });
        window.streamingIntervals = {};
      }

      console.log('✅ Video streaming stopped');
    } catch (error) {
      console.error('❌ Error stopping video streaming:', error);
    }
  };

  const startCamera = async () => {
    try {
      console.log(`🎥 Starting camera (${isMobileMode ? 'mobile full-body mode' : 'desktop mode'})…`);

      const videoElement = document.getElementById("examCamera");
      const loadingElement = document.getElementById("cameraLoading");
      const statusElement = document.getElementById("cameraStatus");

      if (!videoElement) {
        console.error("❌ Camera element not found");
        updateLiveAlerts("❌ Camera element not found");
        return;
      }

      // Show permission prompt immediately
      if (loadingElement) {
        loadingElement.innerHTML = `
          <div class="text-center text-light">
            <i class="bi bi-camera-video fs-4 mb-2"></i><br/>
            <small>Requesting camera permission...</small>
            <br/>
            <small class="text-warning mt-1">Please click "Allow" when prompted</small>
            <br/>
            <small class="text-info mt-1">If blocked, click camera icon in address bar</small>
          </div>
        `;
      }

      // Add timeout to detect if camera permission is stuck
      const permissionTimeout = setTimeout(() => {
        console.warn('⏰ Camera permission timeout - user may need to manually allow');
        updateLiveAlerts('⚠️ Camera permission timeout - please check browser settings');

        // Update loading message
        if (loadingElement) {
          loadingElement.innerHTML = `
            <div class="text-center text-light">
              <i class="bi bi-camera-video-off fs-4 mb-2"></i><br/>
              <small>Camera permission needed</small>
              <br/>
              <small class="text-warning mt-1">Click camera icon in address bar to allow</small>
              <br/>
              <button class="btn btn-sm btn-primary mt-2" onclick="location.reload()">Retry</button>
            </div>
          `;
        }
      }, 8000); // 8 second timeout

      // Mobile-specific optimizations
      videoElement.playsInline = true;
      videoElement.muted = true;
      videoElement.autoplay = true;

      // Different object fit for mobile vs desktop
      if (isMobileMode) {
        videoElement.style.objectFit = "contain"; // Show full room/body view
        videoElement.style.transform = "none"; // No mirror effect for room view
        console.log("🏠 Mobile mode: Using contain fit for full room visibility");
      } else {
        videoElement.style.objectFit = "cover";
        videoElement.style.transform = "scaleX(-1)"; // Mirror effect for desktop
        console.log("💻 Desktop mode: Using cover fit with mirror");
      }

      videoElement.setAttribute('autoplay', '');
      videoElement.setAttribute('muted', '');
      videoElement.setAttribute('playsinline', '');

      // Detect if we're on mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log("📱 Device type:", isMobileDevice ? "Mobile" : "Desktop");
      console.log("🎯 Monitoring mode:", isMobileMode ? "Full-body room monitoring" : "Standard face monitoring");

      // Simple camera constraints first
      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 30 }
        },
        audio: false
      };

      console.log("📹 Requesting camera with constraints:", constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("🎉 Camera access granted successfully");

      // Clear permission timeout
      clearTimeout(permissionTimeout);

      // -------------------------
      // SET STREAM TO VIDEO ELEMENTS
      // -------------------------
      console.log('📹 Setting stream to video elements...');
      console.log('Stream tracks:', stream.getTracks());

      // Set stream to both setup camera and exam camera
      const setupCameraElement = document.getElementById('setupCamera');
      const examCameraElement = document.getElementById('examCamera');

      // Clear any existing streams
      if (setupCameraElement) {
        setupCameraElement.srcObject = null;
        setupCameraElement.srcObject = stream.clone();
      }

      if (examCameraElement) {
        examCameraElement.srcObject = null;
        examCameraElement.srcObject = stream.clone();
      }

      // For backward compatibility, also set to the original videoElement if it exists
      if (videoElement && videoElement !== setupCameraElement && videoElement !== examCameraElement) {
        videoElement.srcObject = null;
        videoElement.srcObject = stream;
      }

      // Wait for metadata to load with better error handling
      console.log('⏳ Waiting for video metadata to load...');

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('⏰ Video metadata load timeout');
          console.log('Video element state:', {
            readyState: videoElement.readyState,
            networkState: videoElement.networkState,
            error: videoElement.error,
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight,
            srcObject: !!videoElement.srcObject
          });
          reject(new Error("Video load timeout"));
        }, 5000); // Reduced timeout

        const onLoadedMetadata = () => {
          console.log('✅ Video metadata loaded successfully');
          console.log('Video dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
          clearTimeout(timeout);
          videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoElement.removeEventListener('error', onError);
          resolve();
        };

        const onError = (e) => {
          console.error('❌ Video load error:', e);
          console.error('Video error details:', {
            code: e.target.error?.code,
            message: e.target.error?.message
          });
          clearTimeout(timeout);
          videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoElement.removeEventListener('error', onError);
          reject(new Error("Video load error"));
        };

        videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
        videoElement.addEventListener('error', onError);
      });

      // Start playing with error handling
      console.log('▶️ Attempting to play video...');
      try {
        await videoElement.play();
        console.log('✅ Video playing successfully');
      } catch (playError) {
        console.error('❌ Video play failed:', playError);
        // Some browsers require user interaction, try again
        videoElement.muted = true;
        await videoElement.play();
        console.log('✅ Video playing after mute');
      }

      // Hide loading spinner
      if (loadingElement) {
        loadingElement.style.display = "none";
        console.log('✅ Loading spinner hidden');
      }

      // Camera status UI
      if (statusElement) {
        statusElement.className = "badge bg-success";
        statusElement.innerHTML = isMobileDevice ?
          '<i class="bi bi-phone"></i> Mobile On' :
          '<i class="bi bi-camera-video"></i> On';
        console.log('✅ Camera status updated');
      }

      updateLiveAlerts(`✅ Camera active (${isMobileDevice ? 'Mobile' : 'Desktop'})`);

      // Mark camera as ready for streaming
      setCameraReady(true);
      console.log('📹 Camera marked as ready for streaming');

      // Start mobile-specific monitoring if on mobile
      if (isMobileDevice) {
        startMobileMonitoring();
      }

    } catch (error) {
      console.error("💥 Camera error:", error);

      const loadingElement = document.getElementById("cameraLoading");
      if (loadingElement) {
        loadingElement.innerHTML = `
          <div class="text-center text-light">
            <i class="bi bi-camera-video-off fs-4"></i><br/>
            <small>${error.message || "Camera failed"}</small>
            <br/>
            <small class="text-danger mt-1">${error.name || 'Permission Error'}</small>
            <br/>
            <button class="btn btn-sm btn-primary mt-2" onclick="location.reload()">Refresh Page</button>
          </div>
        `;
      }

      const statusElement = document.getElementById("cameraStatus");
      if (statusElement) {
        statusElement.className = "badge bg-danger";
        statusElement.innerHTML =
          '<i class="bi bi-exclamation-triangle"></i> Failed';
      }

      updateLiveAlerts(
        `⚠️ Camera error: ${error.message || "Camera access denied"}`
      );

      console.log("🎯 Continuing with screen/audio monitoring (camera optional)");
    }
  };

  // Mobile-specific monitoring functions
  const startMobileMonitoring = () => {
    console.log("📱 Starting mobile-specific monitoring...");

    // Monitor device orientation
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleDeviceOrientation);
      console.log("📱 Device orientation monitoring enabled");
    }

    // Monitor device motion (accelerometer)
    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleDeviceMotion);
      console.log("📱 Device motion monitoring enabled");
    }

    // Monitor visibility changes (app switching)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Monitor online/offline status
    window.addEventListener('online', () => updateLiveAlerts("📱 Device back online"));
    window.addEventListener('offline', () => updateLiveAlerts("⚠️ Device went offline"));
  };

  const handleDeviceOrientation = (event) => {
    // Monitor if device is tilted (potential cheating)
    const beta = event.beta; // Front-to-back tilt
    const gamma = event.gamma; // Left-to-right tilt

    if (Math.abs(beta) > 45 || Math.abs(gamma) > 45) {
      updateLiveAlerts(`📱 Device significantly tilted (β:${beta?.toFixed(1)}°, γ:${gamma?.toFixed(1)}°)`);
    }
  };

  const handleDeviceMotion = (event) => {
    // Monitor sudden movements
    const acceleration = event.acceleration;
    if (acceleration) {
      const magnitude = Math.sqrt(
        (acceleration.x || 0) ** 2 +
        (acceleration.y || 0) ** 2 +
        (acceleration.z || 0) ** 2
      );

      if (magnitude > 15) { // Sudden movement threshold
        updateLiveAlerts(`📱 Sudden device movement detected (${magnitude.toFixed(1)} m/s²)`);
      }
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      updateLiveAlerts("⚠️ App minimized or switched away from");
    } else {
      updateLiveAlerts("✅ App brought back to foreground");
    }
  };

  const stopCamera = () => {
    try {
      const videoElement = document.getElementById('examCamera');
      if (videoElement && videoElement.srcObject) {
        const stream = videoElement.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
      }
      console.log('Camera stopped');
    } catch (error) {
      console.error('Error stopping camera:', error);
    }
  };

  const updateLiveAlerts = (message) => {
    const alertsElement = document.getElementById('liveAlerts');
    if (alertsElement) {
      const timestamp = new Date().toLocaleTimeString();
      const alertHtml = `
        <div class="mb-1">
          <small class="text-primary">${timestamp}:</small>
          <small class="text-dark">${message}</small>
        </div>
      `;
      alertsElement.innerHTML = alertHtml + alertsElement.innerHTML;

      // Keep only last 5 alerts
      const alerts = alertsElement.querySelectorAll('div');
      if (alerts.length > 5) {
        for (let i = 5; i < alerts.length; i++) {
          alerts[i].remove();
        }
      }
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await questionAPI.getQuestionsByExam(exam._id);

      if (response.success) {
        setQuestions(response.data);
        // Initialize answers object
        const initialAnswers = {};
        response.data.forEach(q => {
          initialAnswers[q._id] = '';
        });
        setAnswers(initialAnswers);
      } else {
        setError('Failed to load questions');
      }
    } catch (err) {
      console.error('Error loading questions:', err);
      setError('Failed to load exam questions');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleStartExam = () => {
    setExamStarted(true);
    // Start monitoring when exam begins
    startMonitoring();
  };

  const startMonitoring = async () => {
    try {
      console.log('Starting monitoring...');

      // Use the proper API helpers that handle authentication
      const studentId = student?.id || student?._id;
      const examId = exam._id;

      if (!studentId || !examId) {
        console.warn('Missing student ID or exam ID for monitoring');
        return;
      }

      console.log('Starting monitoring for:', { studentId, examId });

      // Start all monitoring types in parallel
      const monitoringPromises = [
        // Face detection monitoring
        fetch('http://localhost:5001/api/proctor/start-monitoring', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authHelpers.getCurrentSession()?.token}`
          },
          body: JSON.stringify({
            studentId: studentId,
            examId: examId,
            monitoringType: 'face_detection'
          })
        }),

        // Screen monitoring
        fetch('http://localhost:5001/api/proctor/start-monitoring', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authHelpers.getCurrentSession()?.token}`
          },
          body: JSON.stringify({
            studentId: studentId,
            examId: examId,
            monitoringType: 'screen_monitoring'
          })
        }),

        // Audio monitoring
        fetch('http://localhost:5001/api/proctor/start-monitoring', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authHelpers.getCurrentSession()?.token}`
          },
          body: JSON.stringify({
            studentId: studentId,
            examId: examId,
            monitoringType: 'audio_monitoring'
          })
        })
      ];

      const results = await Promise.allSettled(monitoringPromises);

      results.forEach((result, index) => {
        const types = ['Face Detection', 'Screen Monitoring', 'Audio Monitoring'];
        if (result.status === 'fulfilled') {
          if (result.value.ok) {
            console.log(`✅ ${types[index]} monitoring started successfully`);
          } else {
            console.warn(`⚠️ ${types[index]} monitoring failed to start:`, result.value.status);
          }
        } else {
          console.error(`❌ ${types[index]} monitoring error:`, result.reason);
        }
      });

      console.log('🎯 All monitoring types initialization attempted');

    } catch (error) {
      console.error('💥 Error starting monitoring:', error);
    }
  };

  const handleSubmitExam = async () => {
    console.log('handleSubmitExam called');
    console.log('Exam:', exam);
    console.log('Student:', student);
    console.log('Questions:', questions);
    console.log('Answers:', answers);

    try {
      // Calculate score (simple implementation)
      let correctAnswers = 0;
      questions.forEach(question => {
        if (answers[question._id] === question.correctAnswer) {
          correctAnswers++;
        }
      });

      const score = Math.round((correctAnswers / questions.length) * 100);
      console.log('Calculated score:', score, 'Correct answers:', correctAnswers);

      // Get token from session
      const session = authHelpers.getCurrentSession();
      const token = session?.token;
      console.log('Session token:', token ? 'Present' : 'Missing');

      if (!token) {
        alert('Session expired. Please login again.');
        navigate('/');
        return;
      }

      console.log('Submitting to backend...');
      // Submit exam results
      const response = await fetch('http://localhost:5001/api/exams/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          examId: exam._id,
          studentId: student.id,
          answers: answers,
          score: score,
          totalQuestions: questions.length,
          timeSpent: exam.duration * 60 - timeLeft
        })
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (response.ok) {
        // Stop monitoring FIRST before showing results
        console.log('Stopping monitoring before showing results...');
        await stopMonitoring();

        // Stop camera
        stopCamera();

        // Show detailed results
        let resultMessage = `Exam Completed!\n\nScore: ${score}%\nCorrect Answers: ${correctAnswers}/${questions.length}\n\n`;

        questions.forEach((question, index) => {
          const userAnswerLetter = answers[question._id] || '';
          const userAnswerText = userAnswerLetter ? question.options[userAnswerLetter.charCodeAt(0) - 65] : 'Not answered';
          const correctAnswerText = question.options[question.correctAnswer.charCodeAt(0) - 65];

          const isCorrect = userAnswerLetter === question.correctAnswer;
          resultMessage += `Q${index + 1}: ${isCorrect ? '✅ Correct' : '❌ Wrong'}\n`;
          resultMessage += `Your answer: ${userAnswerText}\n`;
          resultMessage += `Correct answer: ${correctAnswerText}\n\n`;
        });

        alert(resultMessage);

        // Navigate back to dashboard
        navigate('/dashboard');
      } else {
        alert(`Failed to submit exam: ${responseData.message || 'Please contact administrator.'}`);
      }
    } catch (error) {
      console.error('Submit exam error:', error);
      alert('Failed to submit exam. Please try again.');
    }
  };

  const stopMonitoring = async () => {
    try {
      console.log('🔄 Starting monitoring stop process...');

      // Get token from session
      const session = authHelpers.getCurrentSession();
      const token = session?.token;

      if (!token) {
        console.warn('❌ No token found for stopping monitoring');
        return;
      }

      console.log('📤 Sending stop monitoring request...');
      const studentId = student?.id || student?._id;
      const examId = exam?._id;

      console.log('Student ID:', studentId);
      console.log('Exam ID:', examId);

      if (!studentId || !examId) {
        console.warn('❌ Missing student ID or exam ID for stopping monitoring');
        return;
      }

      const response = await fetch('http://localhost:5001/api/proctor/stop-monitoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: studentId,
          examId: examId
        })
      });

      console.log('📥 Stop monitoring response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Monitoring stopped successfully:', responseData);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to stop monitoring:', response.status, errorText);
      }
    } catch (error) {
      console.error('💥 Error stopping monitoring:', error);
    }
  };

  // Start monitoring setup - camera and screen setup before exam
  const startMonitoringSetup = async () => {
    console.log('🎯 Starting pre-exam monitoring setup...');

    try {
      // Start camera setup immediately
      await startCamera();

      // Start screen sharing after camera is ready
      if (cameraReady) {
        setTimeout(async () => {
          await initiateScreenSharing();
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Error in monitoring setup:', error);
      updateLiveAlerts('⚠️ Monitoring setup failed - please refresh and try again');
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h4>Loading Exam...</h4>
          <p className="text-muted">Please wait while we prepare your exam</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="text-danger mb-3">
            <i className="bi bi-exclamation-triangle fs-1"></i>
          </div>
          <h4>Error Loading Exam</h4>
          <p className="text-muted">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Generate QR code data URL for mobile scanning
  const generateMobileExamUrl = () => {
    const baseUrl = window.location.origin;
    const examUrl = `${baseUrl}/exam/${examId}?mobile=true&student=${student?.id}`;
    return examUrl;
  };

  if (!examStarted) {
    // Show setup phase first
    if (setupPhase) {
      return (
        <div className="min-vh-100 bg-light">
          <div className="container-fluid py-4">
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div className="card shadow">
                  <div className="card-header bg-warning text-dark text-center">
                    <h4 className="mb-0">
                      <i className="bi bi-gear me-2"></i>
                      Pre-Exam Setup: Camera & Screen Verification
                    </h4>
                  </div>
                  <div className="card-body">
                    <div className="text-center mb-4">
                      <h5 className="text-primary">{exam?.title}</h5>
                      <p className="text-muted">Please enable camera and screen sharing for proctoring verification</p>
                    </div>

                    <div className="row">
                      {/* Camera Setup */}
                      <div className="col-md-6 mb-4">
                        <div className="card border-primary">
                          <div className="card-header bg-primary text-white text-center">
                            <h6 className="mb-0">
                              <i className="bi bi-camera-video me-2"></i>
                              Camera Setup
                              {cameraReady && <i className="bi bi-check-circle-fill ms-2 text-success"></i>}
                            </h6>
                          </div>
                          <div className="card-body text-center">
                            <div className="bg-dark rounded mb-3 position-relative" style={{height: '200px'}}>
                              <video
                                id="setupCamera"
                                autoPlay
                                muted
                                playsInline
                                controls={false}
                                className="w-100 h-100 rounded"
                                style={{
                                  transform: 'scaleX(-1)',
                                  objectFit: 'cover',
                                  display: 'block'
                                }}
                              ></video>
                              <div className="position-absolute top-50 start-50 translate-middle">
                                <div className="spinner-border text-light" role="status">
                                  <span className="visually-hidden">Loading camera...</span>
                                </div>
                              </div>
                            </div>

                            {!cameraReady ? (
                              <button
                                className="btn btn-primary"
                                onClick={() => startCamera()}
                              >
                                <i className="bi bi-camera-video me-2"></i>
                                Enable Camera
                              </button>
                            ) : (
                              <div className="text-success">
                                <i className="bi bi-check-circle-fill me-2"></i>
                                Camera Ready
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Screen Setup */}
                      <div className="col-md-6 mb-4">
                        <div className="card border-success">
                          <div className="card-header bg-success text-white text-center">
                            <h6 className="mb-0">
                              <i className="bi bi-display me-2"></i>
                              Screen Sharing Setup
                              {screenReady && <i className="bi bi-check-circle-fill ms-2 text-warning"></i>}
                            </h6>
                          </div>
                          <div className="card-body text-center">
                            <div className="bg-secondary rounded mb-3 d-flex align-items-center justify-content-center" style={{height: '200px'}}>
                              {!screenReady ? (
                                <div className="text-center text-light">
                                  <i className="bi bi-display fs-1 mb-2"></i>
                                  <p className="mb-0">Screen sharing required</p>
                                  <small>Admin will monitor your screen during exam</small>
                                </div>
                              ) : (
                                <div className="text-center text-light">
                                  <i className="bi bi-check-circle-fill fs-1 text-success mb-2"></i>
                                  <p className="mb-0 text-success">Screen sharing active</p>
                                </div>
                              )}
                            </div>

                            {!screenReady ? (
                              <button
                                className="btn btn-success"
                                onClick={() => initiateScreenSharing()}
                              >
                                <i className="bi bi-display me-2"></i>
                                Share Screen
                              </button>
                            ) : (
                              <div className="text-success">
                                <i className="bi bi-check-circle-fill me-2"></i>
                                Screen Ready
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Summary */}
                    <div className="row mb-4">
                      <div className="col-12">
                        <div className="card">
                          <div className="card-body">
                            <h6 className="card-title">Setup Status</h6>
                            <div className="row text-center">
                              <div className="col-6">
                                <div className={`p-3 rounded ${cameraReady ? 'bg-success bg-opacity-25' : 'bg-warning bg-opacity-25'}`}>
                                  <i className={`bi ${cameraReady ? 'bi-camera-video text-success' : 'bi-camera-video-off text-warning'} fs-2`}></i>
                                  <p className="mb-0 mt-2 fw-bold">{cameraReady ? 'Camera Ready' : 'Camera Needed'}</p>
                                </div>
                              </div>
                              <div className="col-6">
                                <div className={`p-3 rounded ${screenReady ? 'bg-success bg-opacity-25' : 'bg-warning bg-opacity-25'}`}>
                                  <i className={`bi ${screenReady ? 'bi-display text-success' : 'bi-display text-warning'} fs-2`}></i>
                                  <p className="mb-0 mt-2 fw-bold">{screenReady ? 'Screen Ready' : 'Screen Needed'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="alert alert-info">
                      <h6 className="alert-heading">
                        <i className="bi bi-info-circle me-2"></i>
                        Setup Instructions
                      </h6>
                      <ul className="mb-0">
                        <li>Click "Enable Camera" and allow camera access when prompted</li>
                        <li>Click "Share Screen" and select what to share (entire screen recommended)</li>
                        <li>Ensure your face is clearly visible in the camera</li>
                        <li>Make sure your exam environment is properly lit</li>
                        <li>Admin will verify your setup before you can start the exam</li>
                      </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="d-flex justify-content-between align-items-center">
                      <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/dashboard')}
                      >
                        <i className="bi bi-arrow-left me-2"></i>
                        Back to Dashboard
                      </button>

                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => {
                            // Refresh setup
                            setCameraReady(false);
                            setScreenReady(false);
                            startMonitoringSetup();
                          }}
                        >
                          <i className="bi bi-arrow-clockwise me-2"></i>
                          Refresh Setup
                        </button>

                        <button
                          className="btn btn-success btn-lg"
                          disabled={!cameraReady || !screenReady}
                          onClick={() => {
                            setSetupPhase(false);
                          }}
                        >
                          <i className="bi bi-check-circle me-2"></i>
                          Setup Complete - Start Exam
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Setup Monitoring Sidebar */}
              <div className="col-lg-4 mt-4 mt-lg-0">
                <div className="card shadow border-primary">
                  <div className="card-header bg-primary text-white text-center">
                    <h6 className="mb-0">
                      <i className="bi bi-camera-video me-2"></i>
                      Setup Monitoring
                    </h6>
                  </div>
                  <div className="card-body p-3">
                    {/* Camera Feed */}
                    <div className="mb-3">
                      <div className="bg-dark rounded overflow-hidden position-relative border border-primary" style={{minHeight: '200px', aspectRatio: '4/3'}}>
                        <video
                          id="examCamera"
                          autoPlay
                          muted
                          playsInline
                          controls={false}
                          disablePictureInPicture
                          className="w-100 h-100"
                          style={{
                            transform: 'scaleX(-1)',
                            pointerEvents: 'none',
                            backgroundColor: '#000',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        ></video>

                        <div className="position-absolute top-50 start-50 translate-middle text-center">
                          <div className="spinner-border text-light" role="status" id="cameraLoading" style={{width: '2rem', height: '2rem'}}>
                            <span className="visually-hidden">Loading camera...</span>
                          </div>
                          <div className="text-light mt-2">
                            <small>Initializing camera...</small>
                          </div>
                        </div>

                        <div className="position-absolute top-0 end-0 p-1">
                          <span className="badge bg-danger" id="cameraStatus">
                            <i className="bi bi-camera-video-off me-1"></i>
                            Off
                          </span>
                        </div>
                      </div>

                      <div className="text-center mt-2">
                        <small className="text-muted">
                          <i className="bi bi-info-circle me-1"></i>
                          Admin can see your camera feed for verification
                        </small>
                      </div>
                    </div>

                    {/* Real-time Alerts */}
                    <div className="mb-3">
                      <h6 className="text-primary mb-2">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        Setup Alerts
                      </h6>
                      <div className="bg-light rounded p-2" style={{minHeight: '100px', maxHeight: '150px', overflowY: 'auto'}}>
                        <div id="liveAlerts" className="small text-muted">
                          Setup in progress...<br/>
                          Waiting for camera and screen permissions.
                        </div>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="alert alert-warning py-2 px-3 mb-0">
                      <small>
                        <strong>Admin Verification:</strong><br/>
                        The administrator is monitoring your setup to ensure exam integrity.
                        Please wait for approval before starting the exam.
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show final ready screen after setup is complete
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow" style={{maxWidth: '700px', width: '100%'}}>
          <div className="card-header bg-success text-white text-center">
            <h4 className="mb-0">
              <i className="bi bi-check-circle-fill me-2"></i>
              Setup Complete - Ready to Start Exam
            </h4>
          </div>
          <div className="card-body text-center">
            <div className="mb-4">
              <h5 className="text-primary">{exam?.title}</h5>
              <p className="text-muted mb-2">Duration: {exam?.duration} minutes</p>
              <p className="text-muted">Questions: {questions.length}</p>
            </div>

            {/* Setup Status */}
            <div className="row mb-4">
              <div className="col-6">
                <div className="text-center p-3 bg-success bg-opacity-25 rounded">
                  <i className="bi bi-camera-video text-success fs-2 mb-2"></i>
                  <p className="mb-0 fw-bold text-success">Camera Active</p>
                </div>
              </div>
              <div className="col-6">
                <div className="text-center p-3 bg-success bg-opacity-25 rounded">
                  <i className="bi bi-display text-success fs-2 mb-2"></i>
                  <p className="mb-0 fw-bold text-success">Screen Shared</p>
                </div>
              </div>
            </div>

            {/* Mobile QR Code Section */}
            <div className="mb-4 p-4 bg-light rounded">
              <h6 className="text-primary mb-3">
                <i className="bi bi-phone me-2"></i>
                Optional: Mobile Full-Body Monitoring
              </h6>
              <div className="row align-items-center">
                <div className="col-md-6">
                  <div className="bg-white p-3 rounded border">
                    <QRCodeCanvas
                      value={generateMobileExamUrl()}
                      size={150}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                  <small className="text-muted d-block mt-2">
                    Scan with Google Lens or QR scanner on mobile
                  </small>
                </div>
                <div className="col-md-6 text-start">
                  <h6 className="text-success">📱 Enhanced Security Features:</h6>
                  <ul className="small text-muted mb-0">
                    <li>Full body and room visibility</li>
                    <li>Advanced cheating detection</li>
                    <li>Real-time environment monitoring</li>
                    <li>Mobile device sensors tracking</li>
                  </ul>
                  <div className="mt-2">
                    <small className="text-info">
                      <i className="bi bi-info-circle me-1"></i>
                      Use mobile device for comprehensive proctoring
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <div className="alert alert-warning">
              <h6 className="alert-heading">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Important Instructions
              </h6>
              <ul className="mb-0 text-start">
                <li>Keep your camera on throughout the exam</li>
                <li>Do not switch tabs or windows</li>
                <li>Ensure stable internet connection</li>
                <li>Complete all questions before time expires</li>
                <li className="text-primary">
                  <strong>Mobile users:</strong> Scan QR code above for full-body monitoring
                </li>
              </ul>
            </div>

            <div className="d-grid gap-2 mt-4">
              <button
                className="btn btn-success btn-lg"
                onClick={handleStartExam}
              >
                <i className="bi bi-play-fill me-2"></i>
                Start Exam Now
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/dashboard')}
              >
                <i className="bi bi-arrow-left me-2"></i>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredQuestions = Object.values(answers).filter(answer => answer !== '').length;

  return (
    <div className="min-vh-100 bg-light">
      {/* Header with timer and progress */}
      <nav className="navbar navbar-light bg-white shadow-sm">
        <div className="container-fluid">
          <div className="d-flex align-items-center">
            <h5 className="mb-0 fw-bold text-primary me-3">{exam?.title}</h5>
            <span className="badge bg-info">Question {currentQuestionIndex + 1} of {questions.length}</span>
          </div>

          <div className="d-flex align-items-center">
            <div className="me-3 text-center">
              <div className={`badge ${timeLeft < 300 ? 'bg-danger' : 'bg-success'} fs-6 px-3 py-2`}>
                <i className="bi bi-clock me-1"></i>
                {formatTime(timeLeft)}
              </div>
            </div>

            <div className="text-center me-3">
              <small className="text-muted d-block">Answered</small>
              <span className="badge bg-primary">{answeredQuestions}/{questions.length}</span>
            </div>

            <button
              className="btn btn-danger"
              onClick={() => {
                console.log('Submit button clicked - submitting exam directly');
                handleSubmitExam();
              }}
            >
              <i className="bi bi-check-circle me-1"></i>
              Submit Exam
            </button>
          </div>
        </div>
      </nav>

      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-lg-6">
            <div className="card shadow">
              <div className="card-body">
                {/* Question */}
                <div className="mb-4">
                  <h5 className="card-title mb-3">
                    Question {currentQuestionIndex + 1}
                  </h5>
                  <div className="bg-light p-3 rounded mb-4">
                    <p className="mb-0 fs-5">{currentQuestion?.questionText}</p>
                  </div>
                </div>

                {/* Options */}
                <div className="mb-4">
                  <div className="row g-3">
                    {currentQuestion?.options.map((option, index) => {
                      const optionLetter = String.fromCharCode(65 + index);
                      const isSelected = answers[currentQuestion._id] === optionLetter;

                      return (
                        <div key={index} className="col-md-6">
                          <div
                            className={`card h-100 cursor-pointer border-2 ${
                              isSelected ? 'border-primary bg-primary bg-opacity-10' : 'border-light'
                            }`}
                            onClick={() => handleAnswerChange(currentQuestion._id, optionLetter)}
                            style={{cursor: 'pointer'}}
                          >
                            <div className="card-body d-flex align-items-center">
                              <div className={`badge me-3 fs-6 ${
                                isSelected ? 'bg-primary' : 'bg-secondary'
                              }`}>
                                {optionLetter}
                              </div>
                              <div className="flex-grow-1">
                                <p className="mb-0">{option}</p>
                              </div>
                              {isSelected && (
                                <i className="bi bi-check-circle text-primary fs-5"></i>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Navigation */}
                <div className="d-flex justify-content-between align-items-center">
                  <button
                    className="btn btn-outline-primary"
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                  >
                    <i className="bi bi-chevron-left me-1"></i>
                    Previous
                  </button>

                  <div className="d-flex gap-2">
                    {questions.map((_, index) => (
                      <button
                        key={index}
                        className={`btn btn-sm ${
                          index === currentQuestionIndex
                            ? 'btn-primary'
                            : answers[questions[index]._id]
                              ? 'btn-success'
                              : 'btn-outline-secondary'
                        }`}
                        onClick={() => setCurrentQuestionIndex(index)}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    className="btn btn-outline-primary"
                    onClick={handleNext}
                    disabled={currentQuestionIndex === questions.length - 1}
                  >
                    Next
                    <i className="bi bi-chevron-right ms-1"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Camera Monitoring Sidebar */}
          <div className="col-lg-3 mt-4 mt-lg-0">
            <div className="card shadow border-primary">
              <div className="card-header bg-primary text-white text-center">
                <h6 className="mb-0">
                  <i className="bi bi-camera-video me-2"></i>
                  Live Monitoring
                </h6>
              </div>
              <div className="card-body p-3">
                {/* Camera Feed */}
                <div className="mb-3">
                  <div className="bg-dark rounded overflow-hidden position-relative border border-primary" style={{minHeight: '250px', aspectRatio: '4/3'}}>
                    <video
                      id="examCamera"
                      autoPlay
                      muted
                      playsInline
                      controls={false}
                      disablePictureInPicture
                      className="w-100 h-100"
                      style={{
                        transform: isMobileMode ? 'none' : 'scaleX(-1)', // Mirror effect only for desktop
                        pointerEvents: 'none', // Prevent user interaction
                        backgroundColor: '#000',
                        objectFit: isMobileMode ? 'contain' : 'cover',
                        display: 'block' // Ensure it's displayed as block
                      }}
                      onContextMenu={(e) => e.preventDefault()} // Disable right-click
                      onLoadedData={() => {
                        console.log('🎥 Video loaded successfully');
                        updateLiveAlerts('✅ Camera video loaded and displaying');
                      }}
                      onError={(e) => {
                        console.error('🎥 Video error:', e);
                        updateLiveAlerts('❌ Camera video failed to load');
                      }}
                    ></video>

                    {/* Loading overlay */}
                    <div className="position-absolute top-50 start-50 translate-middle text-center">
                      <div className="spinner-border text-light" role="status" id="cameraLoading" style={{width: '3rem', height: '3rem'}}>
                        <span className="visually-hidden">Loading camera...</span>
                      </div>
                      <div className="text-light mt-2">
                        <small>Initializing camera...</small>
                      </div>
                    </div>

                    {/* Camera permission indicator */}
                    <div className="position-absolute top-0 end-0 p-1">
                      <span className="badge bg-danger" id="cameraStatus">
                        <i className="bi bi-camera-video-off me-1"></i>
                        Off
                      </span>
                    </div>

                    {/* Camera instruction overlay */}
                    <div className="position-absolute bottom-0 start-0 end-0 bg-dark bg-opacity-75 text-white text-center p-2">
                      <small>
                         Face Monitoring Active - Keep face visible
                      </small>
                    </div>

                    {/* Camera permission prompt */}
                    <div className="position-absolute top-50 start-50 translate-middle text-center text-light d-none" id="cameraPermissionPrompt">
                      <div className="bg-dark bg-opacity-75 p-3 rounded">
                        <i className="bi bi-camera-video fs-1 mb-2"></i>
                        <h6>Camera Access Required</h6>
                        <p className="mb-2">Please allow camera access for exam monitoring</p>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={startCamera}
                        >
                          <i className="bi bi-arrow-clockwise me-1"></i>
                          Enable Camera
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mt-2">
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      Camera is recording for proctoring - Admin can see your feed
                    </small>
                    <br/>
                    <div className="d-flex gap-1 mt-2">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          console.log('🎥 Manual camera retry triggered');
                          startCamera();
                        }}
                        style={{fontSize: '0.7rem'}}
                      >
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Retry Camera
                      </button>

                      <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => {
                          console.log('🖥️ Manual screen share triggered');
                          initiateScreenSharing();
                        }}
                        style={{fontSize: '0.7rem'}}
                      >
                        <i className="bi bi-display me-1"></i>
                        Share Screen
                      </button>
                    </div>
                  </div>
                </div>

                {/* Monitoring Status */}
                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <small className="text-muted">Face Detection</small>
                    <span className="badge bg-success">Active</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <small className="text-muted">Screen Monitoring</small>
                    <span className="badge bg-success">Active</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <small className="text-muted">Audio Monitoring</small>
                    <span className="badge bg-success">Active</span>
                  </div>
                </div>

                {/* Real-time Alerts */}
                <div className="mb-3">
                  <h6 className="text-primary mb-2">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    Live Alerts
                  </h6>
                  <div className="bg-light rounded p-2" style={{minHeight: '80px', maxHeight: '120px', overflowY: 'auto'}}>
                    <div id="liveAlerts" className="small text-muted">
                      Monitoring active...<br/>
                      No alerts yet.
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className={`alert py-2 px-3 mb-0 ${isMobileMode ? 'alert-success' : 'alert-info'}`}>
                  <small>
                    {isMobileMode ? (
                      <>
                        <strong>🏠 Full-Body Monitoring Active</strong><br/>
                        Keep entire body and room visible to camera
                      </>
                    ) : (
                      <>
                        <strong>Keep your face visible</strong><br/>
                        Do not leave the camera view
                      </>
                    )}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switch Warning Modal */}
      {tabSwitchModalVisible && (
        <div className="modal fade show d-block" style={{backgroundColor: 'rgba(220, 53, 69, 0.95)'}} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-danger">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  Tab Switch Detected!
                </h5>
              </div>
              <div className="modal-body text-center">
                <div className="mb-4">
                  <i className="bi bi-exclamation-triangle text-danger fs-1 mb-3"></i>
                  <h4 className="text-danger mb-3">Warning!</h4>
                  <p className="mb-3 fs-5">
                    You have switched tabs/windows <strong>{tabSwitchCount}</strong> time{tabSwitchCount > 1 ? 's' : ''}.
                  </p>
                  <p className="text-muted">
                    This violates exam integrity rules. Please return to the exam immediately.
                  </p>
                </div>

                {tabSwitchCount >= 3 && (
                  <div className="alert alert-danger">
                    <h6 className="alert-heading mb-2">
                      <i className="bi bi-x-circle-fill me-2"></i>
                      Multiple Violations Detected
                    </h6>
                    <p className="mb-2">
                      Due to multiple tab switches, your exam will be automatically submitted.
                    </p>
                    <div className="text-center">
                      <div className="spinner-border text-danger mb-2" role="status">
                        <span className="visually-hidden">Submitting exam...</span>
                      </div>
                      <p className="text-danger fw-bold">Submitting your exam...</p>
                    </div>
                  </div>
                )}

                {tabSwitchCount < 3 && (
                  <div className="alert alert-warning">
                    <strong>Important:</strong> If you switch tabs/windows {3 - tabSwitchCount} more time{3 - tabSwitchCount > 1 ? 's' : ''}, your exam will be automatically submitted.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {tabSwitchCount < 3 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setTabSwitchModalVisible(false)}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    I Understand - Return to Exam
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monitoring Indicator */}
      <div className="position-fixed bottom-0 end-0 p-3" style={{zIndex: 1050}}>
        <div className="card shadow-sm border-success">
          <div className="card-body py-2 px-3">
            <div className="d-flex align-items-center">
              <div className="text-success me-2">
                <i className="bi bi-record-circle-fill fs-5"></i>
              </div>
              <small className="text-muted mb-0">
                <strong>Being Monitored</strong><br/>
                ProctorAI is watching
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamTaking;
