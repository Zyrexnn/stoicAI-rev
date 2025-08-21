// File: app/page.tsx
'use client';

import React, { useState, useRef, useEffect, FormEvent, ChangeEvent, useCallback } from 'react';
import Image from 'next/image';
import styles from './styles/Home.module.css';

interface Message {
  role: 'user' | 'model';
  text?: string;
  image?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

const Home = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [longCooldownTime, setLongCooldownTime] = useState(0);
  const [promptCount, setPromptCount] = useState(0);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Pindahkan saveCurrentChat ke atas newChat dan bungkus dengan useCallback
  const saveCurrentChat = useCallback(() => {
    if (messages.length === 0 || !currentChatId) {
      return;
    }

    const chatTitle = messages[0]?.text?.substring(0, 30) || 'Obrolan Baru';
    const existingChatIndex = chatHistory.findIndex(chat => chat.id === currentChatId);

    const newSession: ChatSession = {
      id: currentChatId,
      title: chatTitle,
      messages,
    };

    if (existingChatIndex !== -1) {
      const updatedHistory = [...chatHistory];
      updatedHistory[existingChatIndex] = newSession;
      setChatHistory(updatedHistory);
    } else {
      setChatHistory([newSession, ...chatHistory]);
    }
  }, [messages, currentChatId, chatHistory]);

  const newChat = useCallback((isInitialLoad = false) => {
    if (!isInitialLoad) {
      saveCurrentChat();
    }
    const newId = `chat-${Date.now()}`;
    setMessages([]);
    setCurrentChatId(newId);
    setInput('');
    setImage(null);
    setIsHistoryOpen(false);
  }, [saveCurrentChat]);

  useEffect(() => {
    setIsClient(true);
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory);
      setChatHistory(parsedHistory);
      if (parsedHistory.length > 0) {
        setMessages(parsedHistory[0].messages);
        setCurrentChatId(parsedHistory[0].id);
      } else {
        newChat(true);
      }
    } else {
      newChat(true);
    }

    const hasShownGuide = localStorage.getItem('hasShownGuide');
    if (!hasShownGuide) {
      setShowGuide(true);
      localStorage.setItem('hasShownGuide', 'true');
    }
  }, [newChat]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
  }, [chatHistory, isClient]);

  const loadChat = (chat: ChatSession) => {
    saveCurrentChat();
    setMessages(chat.messages);
    setCurrentChatId(chat.id);
    setIsHistoryOpen(false);
    setInput('');
    setImage(null);
  };

  const deleteChat = (id: string) => {
    const updatedHistory = chatHistory.filter(chat => chat.id !== id);
    setChatHistory(updatedHistory);
    if (id === currentChatId) {
      newChat();
    }
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() === '' && !image) return;
    if (cooldownTime > 0 || longCooldownTime > 0) return;

    const newUserMessage: Message = { role: 'user', text: input, image: image || undefined };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setImage(null);
    setIsLoading(true);
    setPromptCount(prev => prev + 1);

    setCooldownTime(5);
    if ((promptCount + 1) % 10 === 0) {
      setLongCooldownTime(60);
      setPromptCount(0);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input, image }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const botMessage: Message = { role: 'model', text: data.text };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const botErrorMessage: Message = { role: 'model', text: 'Maaf, terjadi kesalahan. Silakan coba lagi.' };
      setMessages(prev => [...prev, botErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => setCooldownTime(cooldownTime - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTime]);

  useEffect(() => {
    if (longCooldownTime > 0) {
      const timer = setTimeout(() => setLongCooldownTime(longCooldownTime - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [longCooldownTime]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleImageButtonClick = () => {
    imageInputRef.current?.click();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isButtonDisabled = isLoading || cooldownTime > 0 || longCooldownTime > 0;
  const buttonText = isLoading ? 'Mengirim...' : (cooldownTime > 0 ? `Tunggu ${cooldownTime}s` : 'Kirim');
  const longCooldownMessage = longCooldownTime > 0 ? `Silakan tunggu 1 menit. Sisa waktu: ${longCooldownTime} detik` : '';

  return (
    <div className={styles.main}>
      {isClient && showGuide && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button className={styles.closeModalButton} onClick={() => setShowGuide(false)}>×</button>
            <div className={styles.modalHeader}>
              <h2>Panduan Penggunaan StoicAI</h2>
            </div>
            <div className={styles.modalBody}>
              <p>Selamat datang di <b>StoicAI</b>, asisten AI yang dirancang khusus untuk membantu Anda memahami dan menerapkan filosofi Stoa.</p>
              <h3>Fitur Utama:</h3>
              <ul>
                <li>
                  **Riwayat Obrolan**: Semua percakapan Anda akan disimpan secara otomatis. Anda dapat melihat, memuat ulang, atau menghapus sesi obrolan lama melalui panel Riwayat Obrolan di sisi kiri (desktop) atau tombol menu (mobile).
                </li>
                <li>
                  **Analisis Gambar**: Anda bisa mengunggah gambar dengan mengklik ikon kamera. AI akan menganalisis gambar dan mengaitkannya dengan topik filsafat Stoa.
                </li>
                <li>
                  **Sistem Cooldown**: Untuk menjaga performa, terdapat batasan penggunaan. Anda dapat mengirim prompt setiap 5 detik. Setelah 10 prompt, akan ada jeda 1 menit.
                </li>
              </ul>
              <h3>Tips Berinteraksi:</h3>
              <p>Ajukan pertanyaan seputar ajaran Stoa untuk mendapatkan jawaban yang paling relevan. Contoh:</p>
              <ul>
                <li>"Bagaimana cara menerapkan dikotomi kendali dalam pekerjaan?"</li>
                <li>"Jelaskan ajaran Marcus Aurelius tentang kematian."</li>
                <li>"Apa yang dimaksud dengan kebajikan dalam Stoa?"</li>
              </ul>
              <p>Ingat, StoicAI berfokus pada filsafat Stoa. Pertanyaan di luar topik mungkin tidak akan mendapatkan jawaban yang Anda harapkan.</p>
            </div>
          </div>
        </div>
      )}
      
      {isClient && (
        <>
          <div className={`${styles.historySidebar} ${isHistoryOpen ? styles.open : ''}`}>
            <button className={styles.closeHistoryButton} onClick={() => setIsHistoryOpen(false)}>×</button>
            <div className={styles.historyHeader}>
              <h2>Riwayat Obrolan</h2>
              <button className={styles.newChatButton} onClick={() => newChat()}>+ Obrolan Baru</button>
            </div>
            <ul className={styles.historyList}>
              {chatHistory.map(chat => (
                <li key={chat.id} className={`${styles.historyItem} ${chat.id === currentChatId ? styles.active : ''}`}>
                  <span onClick={() => loadChat(chat)}>{chat.title}</span>
                  <button className={styles.deleteChatButton} onClick={() => deleteChat(chat.id)}>🗑️</button>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.hamburgerButton} onClick={() => setIsHistoryOpen(!isHistoryOpen)}>
            ☰
          </div>
        </>
      )}

      <div className={styles.chatbotContainer}>
        <div className={styles.chatbotHeader}>
          <h1 className={styles.title}>StoicAI</h1>
          <p className={styles.description}>Asisten AI untuk membantu Anda memahami dan menerapkan filosofi Stoicisme.</p>
          {isClient && <button className={styles.guideButton} onClick={() => setShowGuide(true)}>Panduan Pengguna</button>}
        </div>
        
        <div className={styles.messages}>
          {messages.map((msg, index) => (
            <div key={index} className={`${styles.message} ${msg.role === 'user' ? styles.userMessageContainer : ''}`}>
              <div className={styles.avatar}>
                {msg.role === 'user' ? 'U' : 'S'}
              </div>
              <div className={msg.role === 'user' ? styles.userMessage : styles.botMessage}>
                {msg.text && <p>{msg.text}</p>}
                {msg.image && (
                  <Image
                    src={msg.image}
                    alt="User upload"
                    width={500}
                    height={300}
                    className={styles.uploadedImage} 
                  />
                )}
              </div>
            </div>
          ))}
          {isLoading && <div className={styles.botMessage}>...</div>}
          <div ref={messagesEndRef} />
        </div>
        <form className={styles.inputForm} onSubmit={sendMessage}>
          <input
            type="file"
            ref={imageInputRef}
            style={{ display: 'none' }}
            onChange={handleImageChange}
            accept="image/*"
          />
          <button
            type="button"
            className={styles.imageButton}
            onClick={handleImageButtonClick}
            disabled={isButtonDisabled}
          >
            📸
          </button>
          <input
            type="text"
            className={styles.input}
            placeholder="Tanyakan tentang filosofi Stoicisme..."
            value={input}
            onChange={handleChange}
            disabled={isButtonDisabled}
          />
          <button type="submit" className={styles.button} disabled={isButtonDisabled}>
            {buttonText}
          </button>
        </form>
        {image && (
          <div className={styles.imagePreview}>
            <Image
              src={image}
              alt="Preview"
              width={500}
              height={300}
            />
            <button onClick={() => setImage(null)} className={styles.removeImageButton}>x</button>
          </div>
        )}
        {longCooldownMessage && (
          <p className={styles.longCooldownMessage}>{longCooldownMessage}</p>
        )}
      </div>
    </div>
  );
};

export default Home;