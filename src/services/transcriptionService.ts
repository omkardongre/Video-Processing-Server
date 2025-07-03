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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Generate a title and description from this transcription: ${transcript.text}. Return as JSON in this exact format: {"title": "title", "summary": "summary"}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let content = response.text().trim();
      // Remove Markdown code block if present
      if (content.startsWith('```')) {
        content = content.replace(/```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
      }
      const parsedContent = JSON.parse(content);

      await axios.post(`${env.NEXT_API_HOST}/recording/${userId}/transcribe`, {
        filename,
        content: parsedContent,
        transcript: transcript.text,
      });
    }

    await fs.unlink(audioPath);
  } catch (error: any) {
    if (error?.message?.includes('API key not valid')) {
      console.error(`[PRO FEATURES ERROR] [API_KEY_INVALID] userId=${userId} filename=${filename} msg="${error.message}" stack=${error.stack}`);
    } else if (error?.response?.status === 400 && error?.response?.data?.error) {
      console.error(`[PRO FEATURES ERROR] [API_RESPONSE] userId=${userId} filename=${filename} msg="${error.response.data.error}" stack=${error.stack}`);
    } else {
      console.error(`[PRO FEATURES ERROR] [UNEXPECTED] userId=${userId} filename=${filename} msg="${error.message}" stack=${error.stack}`);
    }
    throw error;
  }
};
