'use client';

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Briefcase,
  Code2,
  GraduationCap,
  Heart,
  SendHorizontal,
  Paperclip,
  BrainCircuit,
  Moon,
  Sun,
} from 'lucide-react';
import { provideTechGuidance } from '@/ai/flows/provide-tech-guidance';
import { offerPersonalSupport } from '@/ai/flows/offer-personal-support';
import { explainConcept } from '@/ai/flows/explain-ai-flow';
import { type Message } from '@/lib/types';
import { ChatMessage } from '@/components/chat-message';
import { useToast } from '@/hooks/use-toast';

// Firebase imports
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { BotIcon } from './bot-icon';

type SupportTopic = 'tech' | 'career' | 'college' | 'personal growth' | 'explain';
type Theme = 'light' | 'dark';

export default function ChatInterface() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Dei Gugan! Naan un AI Macha. Enna venum, kelu macha! Tech doubt ah, personal advice ah, or just want me to explain something? Select a topic and just type pannu 💪',
      createdAt: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [topic, setTopic] = useState<SupportTopic>('tech');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(2));
  const [theme, setTheme] = useState<Theme>('dark');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [topic]);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    textarea.style.height = `${scrollHeight}px`;
  };
  
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!storage) {
      toast({
        variant: 'destructive',
        title: 'Firebase Not Configured',
        description: 'Image upload is disabled. Please add your Firebase keys to the environment variables.',
      });
      return;
    }

    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Dei, image mattum anupu da!" });
      return;
    }

    setIsLoading(true);
    setMessages((prev) => [
      ...prev,
      { id: 'uploading', role: 'assistant', content: 'Uploading image...', createdAt: new Date() },
    ]);

    try {
      const storageRef = ref(storage, `uploads/${sessionId}/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const imageMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: `Uploaded: ${file.name}`,
        imageUrl: downloadURL,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev.filter(m => m.id !== 'uploading'), imageMessage]);
      toast({ title: "Semma!", description: "Image anupiyachu, macha!" });
    } catch (error) {
      console.error("Image upload failed:", error);
      setMessages((prev) => prev.filter(m => m.id !== 'uploading'));
      toast({
        variant: "destructive",
        title: "Aiyayo, image pogala!",
        description: "Upload fail aagiduchu. Again try pannu.",
      });
    } finally {
      setIsLoading(false);
      if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    if (inputRef.current) {
        inputRef.current.style.height = 'auto';
    }
    
    setMessages((prev) => [
      ...prev,
      { id: 'typing', role: 'assistant', content: '...', createdAt: new Date() },
    ]);

    try {
      let responseContent: string;
      if (topic === 'tech') {
        const response = await provideTechGuidance({ query: input });
        responseContent = response.response;
      } else if (topic === 'explain') {
        const response = await explainConcept({ query: input });
        responseContent = response.explanation;
      } else {
        const response = await offerPersonalSupport({ topic, userBackground: input });
        responseContent = response.advice;
      }
      const assistantResponse: Message = {
        id: Date.now().toString() + 'a',
        role: 'assistant',
        content: responseContent,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev.filter(m => m.id !== 'typing'), assistantResponse]);
    } catch (error) {
      console.error('AI call failed:', error);
      const errorResponse: Message = {
        id: Date.now().toString() + 'e',
        role: 'assistant',
        content:
          'Macha, ennala ippo connect panna mudila. Network issue polirukku. Konjam neram kalichi try pannu da.',
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev.filter(m => m.id !== 'typing'), errorResponse]);
      toast({
        variant: "destructive",
        title: "Oh no! Something went wrong.",
        description: "There was a problem with the request to the AI.",
      })
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-4xl mx-auto bg-card shadow-2xl rounded-lg">
      <header className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <BotIcon className="text-3xl text-primary" />
          <h1 className="text-xl font-bold font-headline">Hi i'm Gugan's AI 💖</h1>
        </div>
        <div className="flex items-center gap-2">
           <Button asChild variant="outline" size="sm">
              <a href="https://www.buymeacoffee.com/gugan" target="_blank" rel="noopener noreferrer">
                  <Heart className="mr-2 h-4 w-4" />
                  Support Me
              </a>
            </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </header>
      <main className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b">
          <Tabs value={topic} onValueChange={(value) => setTopic(value as SupportTopic)}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-full">
              <TabsTrigger value="tech" className="flex-col sm:flex-row gap-2 h-12">
                <Code2 className="h-5 w-5" /> Tech
              </TabsTrigger>
              <TabsTrigger value="career" className="flex-col sm:flex-row gap-2 h-12">
                <Briefcase className="h-5 w-5" /> Career
              </TabsTrigger>
              <TabsTrigger value="college" className="flex-col sm:flex-row gap-2 h-12">
                <GraduationCap className="h-5 w-5" /> College
              </TabsTrigger>
              <TabsTrigger value="personal growth" className="flex-col sm:flex-row gap-2 h-12">
                <Heart className="h-5 w-5" /> Personal
              </TabsTrigger>
              <TabsTrigger value="explain" className="flex-col sm:flex-row gap-2 h-12">
                <BrainCircuit className="h-5 w-5" /> Explain
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        <div className="p-4 border-t shrink-0 bg-background/50">
          <form
            onSubmit={handleSendMessage}
            className="flex items-end gap-2"
          >
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => fileInput.current?.click()}
              disabled={isLoading || !storage}
              className="h-10 w-10 shrink-0"
              aria-label="Attach image"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder={`Ask about ${topic}...`}
              className="flex-1 resize-none max-h-48"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              disabled={isLoading}
              aria-label="Chat input"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="h-10 w-10 shrink-0"
              aria-label="Send message"
            >
              <SendHorizontal className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
