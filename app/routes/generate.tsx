// app/routes/generate-image.tsx

import { useState, useEffect } from "react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useNavigation, useActionData, Link } from "@remix-run/react";
import Replicate from "replicate";
import fetch from "node-fetch";
import { RotateCw, ArrowLeft } from 'lucide-react';

// Función auxiliar para convertir ReadableStream a Buffer
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks);
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN!,
  });

  const formData = await request.formData();
  const prompt = formData.get("prompt") as string | null;
  console.log("Prompt recibido:", prompt);

  if (!prompt) {
    return json(
      { error: "No se proporcionó ningún prompt." },
      { status: 400 }
    );
  }

  try {
    console.log("Ejecutando el modelo de Replicate con el prompt...");
    const output = await replicate.run(
      "bytedance/sdxl-lightning-4step:5599ed30703defd1d160a25a63321b4dec97101d98b4674bcc56e41f62f35637",
      {
        input: {
          width: 1024,
          height: 1024,
          prompt: prompt,
          scheduler: "K_EULER",
          num_outputs: 1,
          guidance_scale: 0,
          negative_prompt: "worst quality, low quality",
          num_inference_steps: 4
        }
      }
    );
    console.log("Salida del modelo de Replicate:", output);

    // Añadir registro detallado del output
    console.log("Tipo de output:", typeof output);
    console.log("Contenido completo del output:", JSON.stringify(output, null, 2));

    let base64ImageOutput: string | null = null;

    if (typeof output === "string") {
      // Si el output es una cadena, asume que es una URL
      const imageUrl = output;
      console.log("Output es una cadena:", imageUrl);

      const response = await fetch(imageUrl);
      console.log(`Respuesta de fetch: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        throw new Error(`Error al obtener la imagen: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      base64ImageOutput = `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
      console.log("Imagen generada convertida a base64 desde URL.");
    } else if (Array.isArray(output)) {
      if (output.length > 0 && output[0] instanceof ReadableStream) {
        // Si el output es un array de ReadableStream, procesa el primero
        console.log("Procesando array de ReadableStreams...");
        const buffer = await streamToBuffer(output[0]);
        base64ImageOutput = `data:image/png;base64,${buffer.toString("base64")}`;
        console.log("Imagen generada convertida a base64 desde ReadableStream.");
      } else if (output.length > 0 && typeof output[0] === "string") {
        // Si el output es un array de cadenas, asume que son URLs
        const imageUrl = output[0];
        console.log("Output es un array de cadenas, primer elemento:", imageUrl);

        const response = await fetch(imageUrl);
        console.log(`Respuesta de fetch: ${response.status} ${response.statusText}`);
        if (!response.ok) {
          throw new Error(`Error al obtener la imagen: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        base64ImageOutput = `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
        console.log("Imagen generada convertida a base64 desde URL.");
      } else {
        console.log("Output es un array pero no contiene cadenas ni ReadableStreams válidos.");
      }
    } else if (
      typeof output === "object" &&
      output !== null &&
      "image_url" in output
    ) {
      // Si el output es un objeto con 'image_url'
      const imageUrl = (output as any).image_url;
      console.log("Output es un objeto con 'image_url':", imageUrl);

      const response = await fetch(imageUrl);
      console.log(`Respuesta de fetch: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        throw new Error(`Error al obtener la imagen: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      base64ImageOutput = `data:image/png;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
      console.log("Imagen generada convertida a base64 desde URL.");
    } else if (output instanceof ReadableStream) {
      // Si el output es un único ReadableStream
      console.log("Procesando ReadableStream...");
      const buffer = await streamToBuffer(output);
      base64ImageOutput = `data:image/png;base64,${buffer.toString("base64")}`;
      console.log("Imagen generada convertida a base64 desde ReadableStream.");
    } else {
      console.log("Output no es una cadena, array o objeto con 'image_url'.");
    }

    if (!base64ImageOutput) {
      console.error("Estructura del output desconocida:", JSON.stringify(output, null, 2));
      throw new Error(
        "No se pudo obtener la imagen generada desde el output de Replicate."
      );
    }

    return json({ outputImage: base64ImageOutput });
  } catch (error: any) {
    console.error("Error en el procesamiento del prompt:", error);
    return json(
      { error: `Error al procesar el prompt: ${error.message || error}` },
      { status: 500 }
    );
  }
};

export default function GenerateImage() {
  const [prompt, setPrompt] = useState<string>("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const navigation = useNavigation();
  const data = useActionData<{ error?: string; outputImage?: string }>();

  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (isSubmitting) {
      setGeneratedImage(null);
    }
  }, [isSubmitting]);

  useEffect(() => {
    if (data?.outputImage) {
      setGeneratedImage(data.outputImage);
    }
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 py-12 px-4 sm:px-6 lg:px-8 relative">
      <Link
        to="/"
        className="absolute top-4 left-4 p-2 bg-white bg-opacity-20 rounded-full text-white hover:bg-opacity-30 transition-all duration-300"
      >
        <ArrowLeft className="w-6 h-6" />
      </Link>
      <div className="max-w-3xl mx-auto bg-white bg-opacity-10 backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden  mt-20">
        <div className="p-8">
          <h1 className="text-4xl font-extrabold text-white mb-8 text-center">Genera una Imagen</h1>
          <Form method="post" className="space-y-6">
            <div className="flex flex-col">
              <label htmlFor="prompt" className="text-white mb-2 font-semibold">
                Ingresa tu prompt:
              </label>
              <textarea
                id="prompt"
                name="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
                placeholder="Ejemplo: Self-portrait of a woman, lightning in the background"
                className="p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white bg-opacity-20 text-white placeholder-gray-300 resize-none"
                rows={4}
              ></textarea>
            </div>
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`
                  flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white
                  ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300 ease-in-out
                `}
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    Generando...
                  </>
                ) : (
                  'Generar Imagen'
                )}
              </button>
            </div>
          </Form>
          {data?.error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{data.error}</span>
            </div>
          )}
          {generatedImage && (
            <div className="mt-8 flex flex-col items-center space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Imagen Generada:</h2>
              <img
                src={generatedImage}
                alt="Imagen Generada"
                className="max-w-full rounded-lg shadow-md"
              />
              <div className="flex justify-center">
                <a
                  href={generatedImage}
                  download={`imagen-generada-${Date.now()}.png`}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-300 ease-in-out"
                >
                  Descargar Imagen Generada
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
