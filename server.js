const cors = require("cors");
const http = require("http");
const fs = require("fs").promises;
const fsSync = require("fs");
const axios = require("axios");
const path = require("path");
const express = require("express");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { AssemblyAI } = require('assemblyai');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { GoogleGenerativeAI } = require("@google/generative-ai");
ffmpeg.setFfmpegPath(ffmpegPath);

// Initialize environment variables
dotenv.config();

// Initialize Express app and middleware
const app = express();
app.use(cors());
const server = http.createServer(app);

// Initialize services
// const openai = new OpenAI({ apiKey: process.env.OPEN_AI_KEY });
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_KEY,
  },
  region: process.env.BUCKET_REGION,
});

// Initialize AssemblyAI client
const assemblyClient = new AssemblyAI({
  apiKey: process.env.ASSEMBLY_AI_KEY
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.ELECTRON_HOST,  
    methods: ["GET", "POST"],
  },
});

// File handling utilities
const createUploadDirectory = async () => {
  const uploadPath = path.join(__dirname, "temp_upload");
  try {
    await fs.access(uploadPath);
  } catch {
    await fs.mkdir(uploadPath);
  }
  return uploadPath;
};

const extractAudioFromVideo = async (videoPath) => {
  const audioPath = videoPath.replace('.webm', '.mp3');
  
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .toFormat('mp3')
      .on('end', () => resolve(audioPath))
      .on('error', reject)
      .save(audioPath);
  });
};

const handleVideoProcessing = async (userId, filename, plan) => {
  const filePath = path.join(__dirname, "temp_upload", filename);
  
  try {
    const file = await fs.readFile(filePath);
    
    // Upload to S3
    // const s3Response = await s3.send(new PutObjectCommand({
    //   Key: filename,
    //   Bucket: process.env.BUCKET_NAME,
    //   ContentType: "video/webm",
    //   Body: file,
    // }));

    // if (s3Response["$metadata"].httpStatusCode !== 200) {
    //   throw new Error("S3 upload failed");
    // }

    console.log("✅ Video uploaded to AWS for plan:", plan);

    // Handle PRO features
    if (plan === "PRO") {
      const stats = await fs.stat(filePath);
      if (stats.size < 25000000) {
        await handleProFeatures(filePath, filename, userId);
      }
    }

    // Mark as complete and cleanup
    await axios.post(
      `${process.env.NEXT_API_HOST}/recording/${userId}/complete`,
      { filename }
    );

    // await fs.unlink(filePath);
    console.log(`🗑️ ${filename} deleted successfully`);
    
  } catch (error) {
    console.error("🔴 Error processing video:", error);
    throw error;
  }
};

const handleProFeatures = async (filePath, filename, userId) => {
  try {
    // const audioPath = await extractAudioFromVideo(filePath);
    console.log("🎧 Audio extracted from video");

    // const transcript = await assemblyClient.transcripts.transcribe({
    //   audio: audioPath,
    //   language_code: "en",
    //   punctuate: true,
    //   format_text: true
    // });

    console.log("🎙️ Transcript generated successfully")

    // if (transcript) {
    //   // Use Gemini to generate title and description
    //   const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    //   const prompt = `Generate a title and description from this transcription: ${transcript.text}. Return as JSON in this exact format: {"title": "title", "summary": "summary"}`;
      
    //   const result = await model.generateContent(prompt);
    //   const response = await result.response;
    //   const content = response.text();
  

    //   // log the content
    //   //log the transcript.text
    //   console.log("🎙️ Content:", content);
    //   console.log("🎙️ Transcript:", transcript.text);

    //   await axios.post(
    //       `${process.env.NEXT_API_HOST}/recording/${userId}/transcribe`,
    //       {
    //         filename,
    //         content,
    //         transcript: transcript.text,
    //     }
    //   );
    // }

    // Clean up audio file
    // await fs.unlink(audioPath);

  } catch (error) {
    console.error("Error in pro features:", error);
    throw error;
  }
};

// Socket connection handling
io.on("connection", async (socket) => {
  console.log("🟢 Socket connected");
  const uploadPath = await createUploadDirectory();
  const writeStreams = new Map();


  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });


  socket.on("video-chunks", (data, callback) => {
    console.log("🎞️ Video chunk received");
    
    let writeStream = writeStreams.get(data.filename);
    if (!writeStream) {
      writeStream = fsSync.createWriteStream(
        path.join(uploadPath, data.filename),
        { flags: 'a' }
      );
      writeStreams.set(data.filename, writeStream);
    }

    writeStream.write(Buffer.from(data.chunks));
    callback(true);
    
  });

  socket.on("process-video", async (data) => {
    console.log("⌛ Processing video:", data);
    
    // Close write stream if exists
    const writeStream = writeStreams.get(data.filename);
    if (writeStream) {
      writeStream.end();
      writeStreams.delete(data.filename);
    }

    try {
      const processing = await axios.post(
        `${process.env.NEXT_API_HOST}/recording/${data.userId}/processing`,
        {
          filename: data.filename,
        }
      );
      
      if (processing.data.status !== 200) {
        throw new Error("❌ Error processing video");
      }

      await handleVideoProcessing(data.userId, data.filename, processing.data.plan);
    } catch (error) {
      console.error("🔴 Error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("📞 Socket disconnected:", socket.id);
    // Cleanup write streams
    for (const [_, stream] of writeStreams) {
      stream.end();
    }
    writeStreams.clear();
  });
});

// Start server
server.listen(5000, () => {
  console.log("✅ Server listening on port 5000");
});