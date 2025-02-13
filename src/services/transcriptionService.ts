import { assemblyClient, genAI } from '../config/services';
import { extractAudioFromVideo } from '../utils/ffmpeg';
import * as fs from 'fs/promises';
import axios from 'axios';
import { env } from '../config/environment';

export const handleProFeatures = async (
  filePath: string,
  filename: string,
  userId: string
): Promise<void> => {
  try {
    const audioPath = await extractAudioFromVideo(filePath);
    console.log('🎧 Audio extracted from video');

    const transcript = await assemblyClient.transcripts.transcribe({
      audio: audioPath,
      language_code: 'en',
      punctuate: true,
      format_text: true,
    });

    console.log('🎙️ Transcript generated successfully');
    if (transcript) {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Generate a title and description from this transcription: ${transcript.text}. Return as JSON in this exact format: {"title": "title", "summary": "summary"}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      const parsedContent = JSON.parse(content);

      await axios.post(`${env.NEXT_API_HOST}/recording/${userId}/transcribe`, {
        filename,
        content: parsedContent,
        transcript: transcript.text,
      });
    }

    await fs.unlink(audioPath);
  } catch (error) {
    console.error('Error in pro features:', error);
    throw error;
  }
};
