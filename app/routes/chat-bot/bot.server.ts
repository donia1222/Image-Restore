import Replicate from "replicate";
import { json } from "@remix-run/node";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const RESPONSE_TIMEOUT = 30000; // 30 segundos

export async function generateBotResponse(message: string, history: Array<{ role: string; content: string }>) {
  console.log("generateBotResponse llamado con mensaje:", message);
  console.log("Historial de conversación:", history);
  
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("REPLICATE_API_TOKEN no está configurado");
    return json({ error: "Token de API no configurado" }, { status: 500 });
  }

  try {
    console.log("Llamando a la API de Replicate con el modelo Llama");
    
    const conversationHistory = history.map(msg => `${msg.role}: ${msg.content}`).join("\n");
    const fullPrompt = `${conversationHistory}\nusuario: ${message}\nasistente:`;

    const input = {
      top_k: 0,
      top_p: 0.95,
      prompt: fullPrompt,
      max_tokens: 512,
      temperature: 0.7,
      system_prompt: "Eres un asistente útil. Mantén el contexto del historial de la conversación proporcionado. Responde en el mismo idioma que el usuario.",
      length_penalty: 1,
      max_new_tokens: 512,
      stop_sequences: "<|end_of_text|>,<|eot_id|>",
      prompt_template: "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
      presence_penalty: 0,
      log_performance_metrics: false
    };

    let fullResponse = "";
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Tiempo de respuesta agotado")), RESPONSE_TIMEOUT)
    );

    try {
      await Promise.race([
        (async () => {
          for await (const event of replicate.stream("meta/meta-llama-3-8b-instruct", { input })) {
            fullResponse += event.toString();
          }
        })(),
        timeoutPromise
      ]);
    } catch (error) {
      if (error instanceof Error && error.message === "Tiempo de respuesta agotado") {
        console.error("La respuesta de la API de Replicate se agotó");
        return json({ error: "El bot está tardando demasiado en responder. Por favor, inténtalo de nuevo." }, { status: 504 });
      }
      throw error;
    }

    console.log("Respuesta de la API de Replicate:", fullResponse);

    if (!fullResponse.trim()) {
      return json({ error: "El bot devolvió una respuesta vacía. Por favor, inténtalo de nuevo." }, { status: 500 });
    }

    return json({ response: fullResponse });
  } catch (error: unknown) {
    console.error("Error al generar la respuesta del bot:", error);
    
    if (error instanceof Error && 'response' in error) {
      const responseError = error.response as { status?: number, data?: { detail?: string } };
      if (responseError.status === 422) {
        console.error("Error de versión o permiso inválido:", responseError.data?.detail);
        return json({ error: "Versión del modelo o error de permiso inválido. Por favor, verifica tu token de API y la versión del modelo." }, { status: 422 });
      }
      if (responseError.status === 401) {
        return json({ error: "Token de API inválido" }, { status: 401 });
      }
    }
    
    return json({ error: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde." }, { status: 500 });
  }
}

