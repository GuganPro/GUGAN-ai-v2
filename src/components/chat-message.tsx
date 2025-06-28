'use client';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Loader2, Volume2 } from 'lucide-react';
import { type Message } from '@/lib/types';
import Image from 'next/image';
import { BotIcon } from './bot-icon';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef } from 'react';
import { textToSpeech } from '@/ai/flows/text-to-speech-flow';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { toast } = useToast();
  const isAssistant = message.role === 'assistant';
  const [isFetchingAudio, setIsFetchingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);


  const handleSpeak = async (text: string) => {
    if (isFetchingAudio) return;

    if (audioRef.current && audioRef.current.src && audioRef.current.readyState >= 2) {
      audioRef.current.play();
      return;
    }

    setIsFetchingAudio(true);
    try {
      const { audioDataUri } = await textToSpeech({ text });
      if (audioDataUri && audioRef.current) {
        audioRef.current.src = audioDataUri;
        audioRef.current.load();
        await audioRef.current.play();
      }
    } catch (error: any) {
      console.error('Text-to-speech failed:', error);
      toast({
        variant: 'destructive',
        title: 'Macha, ennala pesa mudila.',
        description: error?.message || 'Could not generate the voice. Please try again.',
      });
    } finally {
      setIsFetchingAudio(false);
    }
  };


  if (message.id === 'typing' || message.id === 'uploading') {
    return (
      <div className="flex items-end gap-2 animate-in fade-in">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-muted">
            <BotIcon className="text-xl" />
          </AvatarFallback>
        </Avatar>
        <div className="rounded-lg p-3 bg-muted text-muted-foreground flex items-center gap-2">
          {message.id === 'typing' ? (
            <div className="flex gap-1.5 items-center justify-center h-5">
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
              <span className="h-2 w-2 rounded-full bg-primary animate-bounce"></span>
            </div>
          ) : (
             <>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Uploading...</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full animate-in fade-in-0 slide-in-from-bottom-4 duration-500',
        isAssistant ? 'justify-start' : 'justify-end'
      )}
    >
      {isAssistant && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-muted text-muted-foreground">
            <BotIcon className="text-xl" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'rounded-lg p-3 text-sm max-w-[80%]',
          isAssistant
            ? 'bg-muted text-muted-foreground rounded-tl-none'
            : 'bg-primary text-primary-foreground rounded-tr-none'
        )}
      >
        {message.imageUrl && (
          <div className="mb-2">
            <Image
              src={message.imageUrl}
              alt="Uploaded image"
              width={300}
              height={300}
              className="rounded-md object-cover"
            />
          </div>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
      <audio ref={audioRef} className="hidden" />
      {isAssistant && message.content && (
         <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => handleSpeak(message.content)}
            disabled={isFetchingAudio}
            aria-label="Speak message"
          >
            {isFetchingAudio ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
      )}
      {!isAssistant && (
         <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className='bg-primary text-primary-foreground'>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
