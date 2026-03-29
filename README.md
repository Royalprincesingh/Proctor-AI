<div align="center">

<img src="https://img.shields.io/badge/Proctor-AI-blue?style=for-the-badge&logo=artificial-intelligence&logoColor=white" alt="Proctor-AI" height="60"/>

# 🤖 Proctor-AI

### AI-Powered Exam Proctoring System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/Royalprincesingh/Proctor-AI?style=flat-square&color=gold)](https://github.com/Royalprincesingh/Proctor-AI/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/Royalprincesingh/Proctor-AI?style=flat-square)](https://github.com/Royalprincesingh/Proctor-AI/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/Royalprincesingh/Proctor-AI?style=flat-square&color=red)](https://github.com/Royalprincesingh/Proctor-AI/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/Royalprincesingh/Proctor-AI/pulls)

*Secure. Smart. Seamless — AI-driven proctoring for the modern era.*

---

[🚀 Features](#-features) · [🛠️ Tech Stack](#%EF%B8%8F-tech-stack) · [⚡ Quick Start](#-quick-start) · [📖 Usage](#-usage) · [🤝 Contributing](#-contributing) · [📜 License](#-license)

</div>

---

## 📌 Overview

**Proctor-AI** is an intelligent, AI-powered online exam proctoring platform that ensures the integrity of remote assessments. Using computer vision, machine learning, and behavioral analytics, Proctor-AI monitors students in real time — detecting suspicious activities, tracking attention, and generating comprehensive reports for educators.

> 🎯 **Goal:** Make remote exams as trustworthy as in-person ones — without invading privacy.

---

## 🚀 Features

| Feature | Description |
|---|---|
| 👁️ **Face Detection & Recognition** | Verifies identity at login and continuously monitors during the exam |
| 🏃 **Movement Detection** | Detects when a student leaves the frame or looks away repeatedly |
| 🖥️ **Tab-Switch Detection** | Alerts when the examinee switches browser tabs or windows |
| 🤫 **Noise Detection** | Flags suspicious audio events in the test environment |
| 📊 **Real-Time Analytics** | Live dashboard for proctors with confidence scores and alerts |
| 📝 **Automated Reports** | Generates detailed violation reports after each exam session |
| 🔒 **Secure Authentication** | Role-based access control for students, teachers, and admins |
| 📱 **Responsive UI** | Works seamlessly on desktops, laptops, and tablets |

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| **Frontend** | React.js · TailwindCSS · WebRTC |
| **Backend** | Node.js · Express.js |
| **AI / ML** | Python · OpenCV · TensorFlow / PyTorch · face-api.js |
| **Database** | MongoDB · Redis (session caching) |
| **Auth** | JWT · OAuth 2.0 |
| **DevOps** | Docker · GitHub Actions |

</div>

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** v18+
- **Python** 3.9+
- **MongoDB** (local or Atlas)
- **npm** or **yarn**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Royalprincesingh/Proctor-AI.git
cd Proctor-AI

# 2. Install backend dependencies
npm install

# 3. Install Python AI dependencies
pip install -r requirements.txt

# 4. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 5. Start the development server
npm run dev
```

### Environment Variables

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
REDIS_URL=redis://localhost:6379
```

---

## 📖 Usage

### For Students

1. **Log in** with your credentials — the system verifies your face via webcam.
2. **Start the exam** — Proctor-AI begins monitoring your session.
3. **Complete the exam** — stay in frame and avoid suspicious behavior.
4. **Submit** — your session data is securely recorded.

### For Proctors / Teachers

1. **Dashboard** — monitor all active exam sessions in real time.
2. **Alerts** — receive instant notifications for flagged behavior.
3. **Reports** — download detailed post-exam violation reports.

---

## 📂 Project Structure

```
Proctor-AI/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page-level components
│   │   └── utils/        # Helper functions
├── server/               # Node.js backend
│   ├── controllers/      # Route controllers
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   └── middleware/       # Auth & validation middleware
├── ai/                   # Python AI/ML modules
│   ├── face_detection/   # Face detection & recognition
│   ├── behaviour/        # Behaviour analysis
│   └── audio/            # Audio event detection
├── docker-compose.yml
└── README.md
```

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**!

1. 🍴 **Fork** the project
2. 🌿 **Create** your feature branch: `git checkout -b feature/AmazingFeature`
3. 💾 **Commit** your changes: `git commit -m 'Add some AmazingFeature'`
4. 📤 **Push** to the branch: `git push origin feature/AmazingFeature`
5. 🔃 **Open** a Pull Request

Please review our Contributing Guidelines before submitting a PR.

---

## 🛡️ Security

If you discover a security vulnerability, please **do not** open a public issue. Instead, send an email to the repository owner via GitHub. We take security seriously and will respond promptly.

---

## 📜 License

Distributed under the **MIT License**.

---

## 👤 Author

<div align="center">

**Prince Singh**

[![GitHub](https://img.shields.io/badge/GitHub-Royalprincesingh-181717?style=flat-square&logo=github)](https://github.com/Royalprincesingh)

*Built with ❤️ to make online education more trustworthy.*

</div>

---

<div align="center">

⭐ **Star this repo** if you find it helpful!

[![Star History](https://img.shields.io/github/stars/Royalprincesingh/Proctor-AI?style=social)](https://github.com/Royalprincesingh/Proctor-AI)

</div>
