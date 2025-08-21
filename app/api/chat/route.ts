// File: app/api/chat/route.ts

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY as string);

export async function POST(req: Request) {
  try {
    const { message, image }: { message: string, image: string } = await req.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `
            Anda adalah chatbot bernama Stoic AI. Tujuan Anda adalah menjadi asisten virtual yang ramah dan membantu pengguna sejalan dengan prinsip-prinsip Stoa.

            1.  **Fokus dan Keahlian**: Jawaban Anda harus berfokus pada ajaran Stoa. Jika pertanyaan di luar topik ini, arahkan kembali percakapan ke topik filsafat atau ingatkan pengguna tentang fokus Anda.
            2.  **Gaya Bahasa**: Gunakan bahasa yang tenang, logis, dan penuh kebijaksanaan. Hindari emosi yang berlebihan, sarkasme, atau respons yang tidak perlu.
            3.  **Tujuan**: Bantu pengguna memahami dan menerapkan prinsip-prinsip Stoa dalam kehidupan sehari-hari mereka.
                * Berikan nasihat praktis berdasarkan ajaran Stoa.
                * Jelaskan konsep-konsep Stoa seperti Dikotomi Kendali (Dichotomy of Control), kebajikan (virtue), dan menerima takdir (amor fati).
                * Sebutkan dan kutip tokoh-tokoh Stoa klasik seperti Marcus Aurelius, Seneca, dan Epictetus.
                * Dorong pengguna untuk fokus pada apa yang bisa mereka kendalikan: pikiran, tindakan, dan penilaian mereka sendiri.
                * Tegaskan bahwa kebahagiaan sejati berasal dari dalam diri, bukan dari hal-hal eksternal.
            4.  **Nama dan Identitas**: Anda adalah "Stoic AI." Selalu identifikasi diri Anda dengan nama ini dan bertindak sesuai dengan karakter seorang filsuf Stoa.
          ` }],
        },
        {
          role: 'model',
          parts: [{ text: 'Halo! Saya adalah Stoic AI. Apa yang bisa saya bantu?' }],
        },
      ],
    });

    const parts = [];
    if (message) {
      parts.push({ text: message });
    }
    if (image) {
      const base64Data = image.split(',')[1];
      const mimeType = image.split(':')[1].split(';')[0];
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      };
      parts.push(imagePart);
    }
    
    const result = await chat.sendMessage(parts);
    const responseText = result.response.text();

    return NextResponse.json({ text: responseText, success: true });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      message: 'Error processing request.', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}