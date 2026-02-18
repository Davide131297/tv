"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hallo! Ich bin der KI-Assistent für Polittalk-Watcher.\n\nWie kann ich dir helfen?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.info("API Error Response:", errorData);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Stream nicht verfügbar");
      }

      // Add empty assistant message that we'll update with streamed content
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
        },
      ]);

      // Hide loading animation once stream starts
      setIsLoading(false);

      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
                // Update the last message with accumulated content
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage.role === "assistant") {
                    lastMessage.content = assistantContent;
                  }
                  return newMessages;
                });
              }
            } catch {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat Fehler:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Entschuldigung, es gab einen Fehler. \n\nBitte versuche es später erneut.`,
        },
      ]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const initialMessage: Message = {
    role: "assistant",
    content:
      "Hallo! Ich bin der KI-Assistent für Polittalk-Watcher.\n\n&nbsp;\n\n**Deine Nachrichten werden nicht gespeichert**.\n\n&nbsp;\n\nWie kann ich dir helfen?",
  };

  function handleClose() {
    setIsOpen(false);
    setMessages([initialMessage]);
  }

  function clearChat() {
    setMessages([initialMessage]);
    setInput("");
  }

  return (
    <>
      {/* Chat Button - unten rechts */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center"
        aria-label="Chat öffnen"
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed z-50 bottom-0 right-0 left-0 top-0 md:bottom-24 md:right-6 md:left-auto md:top-auto w-full h-full md:w-96 md:h-[500px] bg-white dark:bg-gray-800 rounded-none md:rounded-lg shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between md:rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles size={20} />
              <h3 className="font-semibold">KI-Assistent</h3>
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={clearChat}
                title="Chat leeren"
                className="hover:bg-blue-700 rounded p-1"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Chat minimieren"
                className="hover:bg-blue-700 rounded p-1"
              >
                <Minus size={20} />
              </button>
              <button
                onClick={() => handleClose()}
                title="Chat schließen"
                className="hover:bg-blue-700 rounded p-1"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] min-w-0 overflow-hidden rounded-lg p-3 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  <div
                    className={`text-sm ${
                      message.role === "assistant"
                        ? "prose prose-sm dark:prose-invert max-w-none"
                        : ""
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          table: ({ children }) => (
                            <div className="overflow-x-auto">
                              <table>{children}</table>
                            </div>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Nachricht eingeben..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2"
              >
                <Send size={20} />
              </Button>
            </div>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
              Der KI-Assistent kann Fehler machen. Bitte überprüfe wichtige
              Informationen.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
