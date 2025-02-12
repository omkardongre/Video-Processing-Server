# Video Processing Server

A robust Node.js/Express server for handling video uploads, real-time recording, and AI-powered video processing.

## 🚀 Features

- Real-time video recording via WebSocket
- Chunked video upload support using TUS protocol
- AWS S3 integration for video storage
- Video transcription using AssemblyAI
- AI-powered summary generation using Google's Gemini
- Support for multiple video formats (MP4, WebM, MOV, AVI)
- Plan-based limitations (Basic/Pro)
- FFmpeg integration for audio extraction and video processing

## 🛠️ Tech Stack

- Node.js & Express
- TypeScript
- Socket.IO for real-time communication
- TUS Server for resumable uploads
- AWS SDK for S3 storage
- FFmpeg for video processing
- AssemblyAI for transcription
- Google Gemini AI for summarization

## 📋 Prerequisites

- Node.js (v14 or higher)
- FFmpeg installed on the system
- AWS S3 bucket and credentials
- AssemblyAI API key
- Google Gemini API key

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
VIDEO_SERVER_PORT=5000
NEXT_API_HOST=http://localhost:3000/api
RECORDER_HOST=http://localhost:3000

# AWS Configuration
BUCKET_NAME=your-bucket-name
ACCESS_KEY=your-aws-access-key
SECRET_KEY=your-aws-secret-key
BUCKET_REGION=your-bucket-region

# API Keys
ASSEMBLY_AI_KEY=your-assembly-ai-key
GEMINI_API_KEY=your-gemini-api-key
```

## 🚀 Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd video-processing-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## 📁 Project Structure

- `/src`
  - `/config` - Configuration and service initialization
  - `/constants` - Application constants and limits
  - `/routes` - API routes including upload handling
  - `/services` - Core business logic
  - `/socket` - WebSocket handling
  - `/types` - TypeScript interfaces
  - `/utils` - Utility functions
  - `app.ts` - Express application setup
  - `server.ts` - Server entry point

## 🔄 API Endpoints

### File Upload
- `POST /upload` - TUS protocol endpoint for chunked uploads

### WebSocket Events
- `video-chunks` - Receive video chunks for real-time recording
- `process-video` - Trigger video processing after recording
- `disconnect` - Handle client disconnection

## 📝 Video Processing Pipeline

1. Video Upload/Recording
2. File Validation
3. S3 Upload
4. Audio Extraction (Pro Plan)
5. Transcription (Pro Plan)
6. AI Summary Generation (Pro Plan)
7. Metadata Update
8. Cleanup

## 🔒 Security

- CORS protection
- File type validation
- Plan-based restrictions
- Secure credential handling

## 📈 Plan Limitations

### Basic Plan
- Max file size: 1GB
- Max duration: 30 minutes

### Pro Plan
- Max file size: 10GB
- Max duration: 3 hours
- Additional features: Transcription & AI Summary

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project was created for learning purposes, inspired by Web Prodigies https://www.youtube.com/watch?v=3R63m4sTpKo


## 👤 Author

Omkar D