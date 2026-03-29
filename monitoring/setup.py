#!/usr/bin/env python3
"""
ProctorAI Monitoring System Setup Script
Automated installation and configuration for the Python monitoring system.
"""

import sys
import os
import subprocess
import platform
import json
from pathlib import Path

def run_command(command, shell=False):
    """Run a shell command and return success status"""
    try:
        result = subprocess.run(command, shell=shell, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major == 3 and version.minor >= 8:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} - Compatible")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} - Requires Python 3.8+")
        return False

def install_system_dependencies():
    """Install system-level dependencies"""
    system = platform.system().lower()

    print(f"\n🔧 Installing system dependencies for {system}...")

    if system == "linux":
        # Ubuntu/Debian
        commands = [
            "sudo apt update",
            "sudo apt install -y python3-dev python3-pip",
            "sudo apt install -y libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1",
            "sudo apt install -y portaudio19-dev python3-pyaudio"
        ]
    elif system == "darwin":  # macOS
        commands = [
            "brew install portaudio"
        ]
    elif system == "windows":
        print("✅ Windows - System dependencies will be handled by pip")
        return True
    else:
        print(f"⚠️  Unsupported system: {system}")
        return True

    for cmd in commands:
        print(f"Running: {cmd}")
        success, stdout, stderr = run_command(cmd, shell=True)
        if not success:
            print(f"⚠️  Warning: {cmd} failed")
            print(f"Error: {stderr}")
        else:
            print(f"✅ {cmd} completed")

    return True

def install_python_dependencies():
    """Install Python dependencies"""
    print("\n🐍 Installing Python dependencies...")

    requirements_file = Path("requirements.txt")
    if not requirements_file.exists():
        print("❌ requirements.txt not found!")
        return False

    success, stdout, stderr = run_command([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

    if success:
        print("✅ Python dependencies installed successfully")
        return True
    else:
        print("❌ Failed to install Python dependencies")
        print(f"Error: {stderr}")
        return False

def create_directories():
    """Create necessary directories"""
    print("\n📁 Creating directories...")

    directories = ["models", "logs", "temp"]

    for dir_name in directories:
        Path(dir_name).mkdir(exist_ok=True)
        print(f"✅ Created directory: {dir_name}")

    return True

def check_camera():
    """Check if camera is available"""
    print("\n📷 Checking camera availability...")

    try:
        import cv2
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                print("✅ Camera is working")
                cap.release()
                return True
            else:
                print("⚠️  Camera found but cannot capture frames")
        else:
            print("❌ Camera not found or not accessible")
        cap.release()
    except ImportError:
        print("⚠️  OpenCV not installed yet - camera check will be performed after installation")
        return True
    except Exception as e:
        print(f"❌ Camera check failed: {e}")

    return False

def check_audio():
    """Check if audio devices are available"""
    print("\n🎵 Checking audio devices...")

    try:
        import pyaudio
        audio = pyaudio.PyAudio()

        device_count = audio.get_device_count()
        if device_count > 0:
            print(f"✅ Found {device_count} audio device(s)")

            # List input devices
            input_devices = []
            for i in range(device_count):
                device_info = audio.get_device_info_by_index(i)
                if device_info.get('maxInputChannels') > 0:
                    input_devices.append(device_info.get('name', f'Device {i}'))

            if input_devices:
                print(f"✅ Input devices: {', '.join(input_devices)}")
            else:
                print("⚠️  No input devices found")
        else:
            print("❌ No audio devices found")

        audio.terminate()
        return len(input_devices) > 0

    except ImportError:
        print("⚠️  PyAudio not installed yet - audio check will be performed after installation")
        return True
    except Exception as e:
        print(f"❌ Audio check failed: {e}")
        return False

def create_default_config():
    """Create default configuration file if it doesn't exist"""
    config_file = Path("config.json")

    if config_file.exists():
        print("✅ Configuration file already exists")
        return True

    print("📝 Creating default configuration file...")

    default_config = {
        "api_url": "http://localhost:5001/api",
        "student_id": "your_student_id",
        "exam_id": "your_exam_id",
        "monitoring_duration": 3600,
        "face_detection": {
            "enable_recognition": True,
            "confidence_threshold": 0.6,
            "max_faces_allowed": 1,
            "frame_skip_rate": 30
        },
        "screen_monitoring": {
            "capture_interval": 2,
            "screenshot_interval": 30,
            "enable_tab_detection": True,
            "change_threshold": 70
        },
        "audio_monitoring": {
            "sample_rate": 44100,
            "chunk_size": 1024,
            "silence_threshold": 500,
            "voice_threshold": 1000,
            "max_silence_seconds": 7
        },
        "logging": {
            "level": "INFO",
            "file": "monitoring.log",
            "max_file_size": 10485760,
            "backup_count": 5
        },
        "performance": {
            "max_cpu_usage": 50,
            "max_memory_mb": 700,
            "network_timeout": 30
        }
    }

    try:
        with open(config_file, 'w') as f:
            json.dump(default_config, f, indent=2)
        print("✅ Default configuration created: config.json")
        return True
    except Exception as e:
        print(f"❌ Failed to create config file: {e}")
        return False

def test_imports():
    """Test if all required modules can be imported"""
    print("\n🧪 Testing module imports...")

    required_modules = [
        'cv2', 'numpy', 'dlib', 'PIL', 'mss', 'pyaudio',
        'requests', 'logging', 'threading', 'time', 'datetime'
    ]

    failed_imports = []

    for module in required_modules:
        try:
            if module == 'cv2':
                import cv2
            elif module == 'PIL':
                import PIL
            elif module == 'mss':
                import mss
            elif module == 'pyaudio':
                import pyaudio
            else:
                __import__(module)
            print(f"✅ {module}")
        except ImportError:
            print(f"❌ {module}")
            failed_imports.append(module)

    if failed_imports:
        print(f"\n⚠️  Some modules failed to import: {', '.join(failed_imports)}")
        print("Run 'pip install -r requirements.txt' to install missing dependencies")
        return False

    print("✅ All required modules imported successfully")
    return True

def main():
    """Main setup function"""
    print("🚀 ProctorAI Monitoring System Setup")
    print("=" * 50)

    # Check Python version
    if not check_python_version():
        sys.exit(1)

    # Install system dependencies
    if not install_system_dependencies():
        print("⚠️  System dependency installation had warnings")

    # Install Python dependencies
    if not install_python_dependencies():
        sys.exit(1)

    # Create directories
    create_directories()

    # Create default config
    create_default_config()

    # Test imports
    if not test_imports():
        print("⚠️  Some modules failed to import")

    # Check hardware
    camera_ok = check_camera()
    audio_ok = check_audio()

    print("\n" + "=" * 50)
    print("🎉 Setup Complete!")
    print("=" * 50)

    if camera_ok and audio_ok:
        print("✅ All checks passed - system ready to use!")
        print("\n🚀 To start monitoring:")
        print("   python main_monitor.py")
        print("\n📖 For help:")
        print("   cat README.md")
    else:
        print("⚠️  Some hardware checks failed - system may have limited functionality")
        print("   Camera:", "✅" if camera_ok else "❌")
        print("   Audio:", "✅" if audio_ok else "❌")

    print("\n📁 Important files:")
    print("   📄 Configuration: config.json")
    print("   📋 Dependencies: requirements.txt")
    print("   📖 Documentation: README.md")
    print("   🚀 Main script: main_monitor.py")

if __name__ == "__main__":
    main()
