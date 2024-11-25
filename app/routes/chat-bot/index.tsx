import { useState, useEffect, useRef } from "react";
import { Form, useActionData, useNavigation, useSubmit } from "@remix-run/react";
import { ActionFunction, json, LoaderFunction } from "@remix-run/node";
import { generateBotResponse } from "../chat-bot/bot.server";

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
  // Inicializar mensajes desde localStorage
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>(() => {
    if (typeof window !== "undefined") {
      const savedMessages = localStorage.getItem("chatMessages");
      return savedMessages ? JSON.parse(savedMessages) : [{ role: "bot", content: "¡Bienvenido! ¿En qué puedo ayudarte hoy?" }];
    }
    return [{ role: "bot", content: "¡Bienvenido! ¿En qué puedo ayudarte hoy?" }];
  });

  // Inicializar visibilidad desde localStorage
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Guardar mensajes en localStorage cada vez que cambian
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    }
  }, [messages]);

  // Guardar la visibilidad del chat en localStorage cada vez que cambia
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("isChatVisible", JSON.stringify(isChatVisible));
    }
  }, [isChatVisible]);

  // Sincronizar cambios entre pestañas
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

  // Manejar la respuesta del bot o errores
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

  // Scroll al fondo cada vez que se actualizan los mensajes
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
    }
  };

  const toggleChatVisibility = () => {
    setIsChatVisible((prev) => !prev);
  };

  const handleClearConversation = () => {
    const confirmClear = window.confirm("¿Estás seguro de que deseas eliminar la conversación?");
    if (confirmClear) {
      // Limpiar el estado de mensajes y la visibilidad
      setMessages([{ role: "bot", content: "¡Bienvenido! ¿En qué puedo ayudarte hoy?" }]);
      setIsChatVisible(true);
      
      // Eliminar los datos de localStorage
      localStorage.removeItem("chatMessages");
      localStorage.removeItem("isChatVisible");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">

      {isChatVisible && (
        <>
          <h1 className="text-3xl font-bold mb-6 text-center">Chatea con Llama Bot</h1>
          <div className="mb-4 h-96 overflow-y-auto border border-gray-300 p-4 rounded-lg bg-gray-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-3 ${
                  msg.role === "user" ? "text-right" : "text-left"
                }`}
              >
                <span
                  className={`inline-block p-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-800 border border-gray-300"
                  }`}
                >
                  {msg.content}
                </span>
              </div>
            ))}
            {navigation.state === "submitting" && (
              <div className="text-center text-gray-500">El bot está pensando...</div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <Form method="post" onSubmit={handleSubmit}>
            <div className="flex">
              <input
                type="text"
                name="message"
                className="flex-grow border border-gray-300 rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Escribe tu mensaje..."
                required
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-6 py-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={navigation.state === "submitting"}
              >
                {navigation.state === "submitting" ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </Form>
          <div className="flex justify-between mb-4">

<button
  onClick={handleClearConversation}
  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 mt-10"
>
  Eliminar Conversación
</button>
</div>

        </>
      )}
    </div>
  );
}
