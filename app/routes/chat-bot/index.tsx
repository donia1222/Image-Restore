import { useState, useEffect, useRef } from "react";
import { Form, useActionData, useNavigation, useSubmit, Link  } from "@remix-run/react";
import { ActionFunction, json, LoaderFunction } from "@remix-run/node";
import { generateBotResponse } from "../chat-bot/bot.server";
import {  ArrowLeft } from 'lucide-react';
export const loader: LoaderFunction = async () => {
  return json({ initialMessage: "¡Bienvenido! ¿En qué puedo ayudarte hoy?" });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const message = formData.get("message");
  const history = JSON.parse(formData.get("history") as string);
  
  if (typeof message !== "string" || message.length === 0) {
    return json({ error: "El mensaje es obligatorio" }, { status: 400 });
  }

  try {
    const response = await generateBotResponse(message, history);
    return response;
  } catch (error) {
    console.error("Error en la acción:", error);
    return json({ error: "No se pudo generar una respuesta. Por favor, inténtalo de nuevo." }, { status: 500 });
  }
};

export default function ResponseBot() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>(() => {
    if (typeof window !== "undefined") {
      const savedMessages = localStorage.getItem("chatMessages");
      return savedMessages ? JSON.parse(savedMessages) : [{ role: "bot", content: "¡Bienvenido! ¿En qué puedo ayudarte hoy?" }];
    }
    return [{ role: "bot", content: "¡Bienvenido! ¿En qué puedo ayudarte hoy?" }];
  });

  const [isChatVisible, setIsChatVisible] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const savedVisibility = localStorage.getItem("isChatVisible");
      return savedVisibility ? JSON.parse(savedVisibility) : true;
    }
    return true;
  });

  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("isChatVisible", JSON.stringify(isChatVisible));
    }
  }, [isChatVisible]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "chatMessages") {
        setMessages(event.newValue ? JSON.parse(event.newValue) : []);
      }
      if (event.key === "isChatVisible") {
        setIsChatVisible(event.newValue ? JSON.parse(event.newValue) : true);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (actionData?.response) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: actionData.response as string },
      ]);
    } else if (actionData?.error) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: `Error: ${actionData.error}` },
      ]);
    }
  }, [actionData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const message = formData.get("message") as string;
    if (message.trim()) {
      const newMessage = { role: "user", content: message };
      setMessages((prev) => [...prev, newMessage]);
      
      const history = [...messages.slice(-4), newMessage].slice(-5);
      
      formData.append("history", JSON.stringify(history));
      submit(formData, { method: "post" });
      event.currentTarget.reset();
      inputRef.current?.focus();
    }
  };

  const toggleChatVisibility = () => {
    setIsChatVisible((prev) => !prev);
  };

  const handleClearConversation = () => {
    const confirmClear = window.confirm("¿Estás seguro de que deseas eliminar la conversación?");
    if (confirmClear) {
      setMessages([{ role: "bot", content: "¡Bienvenido! ¿En qué puedo ayudarte hoy?" }]);
      setIsChatVisible(true);
      localStorage.removeItem("chatMessages");
      localStorage.removeItem("isChatVisible");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4">
            <Link
        to="/"
        className="absolute top-4 left-4 p-2 bg-white bg-opacity-20 rounded-full text-white hover:bg-opacity-30 transition-all duration-300"
      >
        <ArrowLeft className="w-6 h-6" />
      </Link>
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6 text-center text-white">Chatea con Llama Bot</h1>
          {isChatVisible && (
            <>
              <div className="mb-4 h-96 overflow-y-auto rounded-lg bg-white bg-opacity-20 p-4">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-3 ${
                      msg.role === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    <span
                      className={`inline-block p-3 rounded-lg ${
                        msg.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-800"
                      } shadow-md transition-all duration-300 ease-in-out hover:shadow-lg`}
                    >
                      {msg.content}
                    </span>
                  </div>
                ))}
                {navigation.state === "submitting" && (
                  <div className="text-center text-white animate-pulse">El bot está pensando...</div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <Form method="post" onSubmit={handleSubmit} className="mb-4">
                <div className="flex">
                  <input
                    ref={inputRef}
                    type="text"
                    name="message"
                    className="flex-grow border-0 rounded-l-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white bg-opacity-20 text-white placeholder-gray-300"
                    placeholder="Escribe tu mensaje..."
                    required
                  />
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-6 py-3 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-300 ease-in-out"
                    disabled={navigation.state === "submitting"}
                  >
                    {navigation.state === "submitting" ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      "Enviar"
                    )}
                  </button>
                </div>
              </Form>
            </>
          )}
          <div className="flex justify-between">
            <button
              onClick={toggleChatVisibility}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-colors duration-300 ease-in-out"
            >
              {isChatVisible ? "Ocultar Chat" : "Mostrar Chat"}
            </button>
            <button
              onClick={handleClearConversation}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors duration-300 ease-in-out"
            >
              Eliminar Conversación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

