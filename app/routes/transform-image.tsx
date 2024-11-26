// app/routes/transform-image.tsx

import { useState, useEffect } from "react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useNavigation, useActionData, Link } from "@remix-run/react";
import Replicate from "replicate";
import fs from "fs/promises";
import path from "path";
import os from "os";
import cuid from "cuid";
import fetch from "node-fetch";
import sharp from "sharp";
import { ArrowUpToLine, RotateCw, ArrowLeft } from 'lucide-react';

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
  const imageFile = formData.get("image") as File | null;
  const prompt = formData.get("prompt") as string | null;
  console.log("Archivo de imagen recibido:", imageFile);
  console.log("Prompt recibido:", prompt);

  if (!imageFile) {
    return json(
      { error: "No se proporcionó ninguna imagen." },
      { status: 400 }
    );
  }

  if (!prompt) {
    return json(
      { error: "No se proporcionó ningún prompt." },
      { status: 400 }
    );
  }

  // Guardar el archivo temporalmente
  const tempDir = os.tmpdir();
  const filename = `${cuid()}-${imageFile.name}`;
  const filepath = path.join(tempDir, filename);
  console.log(`Guardando archivo temporal en: ${filepath}`);

  try {
    const fileBuffer = Buffer.from(await imageFile.arrayBuffer());

    // Utilizar sharp para reducir el tamaño y convertir a WebP
    const resizedImageBuffer = await sharp(fileBuffer)
      .resize({ width: 800 }) // Redimensiona la imagen a un ancho máximo de 800px
      .webp({ quality: 80 })   // Convierte la imagen a WebP con calidad 80
      .toBuffer();
    console.log("Imagen redimensionada y convertida a WebP.");

    await fs.writeFile(filepath, resizedImageBuffer);
    console.log("Archivo temporal guardado.");

    // Convertir la imagen a base64
    const imageData = resizedImageBuffer.toString("base64");
    console.log(`Imagen convertida a base64, tamaño: ${imageData.length}`);

    const base64Image = `data:image/webp;base64,${imageData}`;

    console.log("Ejecutando el modelo de Replicate...");
    const output = await replicate.run(
      "timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f",
      {
        input: {
          image: base64Image,
          prompt: prompt, // Usar el prompt dinámico
          scheduler: "K_EULER_ANCESTRAL",
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 100,
          image_guidance_scale: 1.5
        }
      }
    );
    console.log("Salida del modelo de Replicate:", output);

    // Añadir registro detallado del output
    console.log("Tipo de output:", typeof output);
    console.log("Contenido completo del output:", JSON.stringify(output, null, 2));

    let webpImageOutput: string | null = null;

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
      // Convertir a WebP si no lo está
      const convertedBuffer = await sharp(Buffer.from(arrayBuffer))
        .webp({ quality: 80 })
        .toBuffer();
      webpImageOutput = `data:image/webp;base64,${convertedBuffer.toString("base64")}`;
      console.log("Imagen mejorada convertida a WebP desde URL.");
    } else if (Array.isArray(output)) {
      if (output.length > 0 && output[0] instanceof ReadableStream) {
        // Si el output es un array de ReadableStream, procesa el primero
        console.log("Procesando array de ReadableStreams...");
        const buffer = await streamToBuffer(output[0]);
        // Convertir a WebP si no lo está
        const convertedBuffer = await sharp(buffer)
          .webp({ quality: 80 })
          .toBuffer();
        webpImageOutput = `data:image/webp;base64,${convertedBuffer.toString("base64")}`;
        console.log("Imagen mejorada convertida a WebP desde ReadableStream.");
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
        // Convertir a WebP si no lo está
        const convertedBuffer = await sharp(Buffer.from(arrayBuffer))
          .webp({ quality: 80 })
          .toBuffer();
        webpImageOutput = `data:image/webp;base64,${convertedBuffer.toString("base64")}`;
        console.log("Imagen mejorada convertida a WebP desde URL.");
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
      // Convertir a WebP si no lo está
      const convertedBuffer = await sharp(Buffer.from(arrayBuffer))
        .webp({ quality: 80 })
        .toBuffer();
      webpImageOutput = `data:image/webp;base64,${convertedBuffer.toString("base64")}`;
      console.log("Imagen mejorada convertida a WebP desde URL.");
    } else if (output instanceof ReadableStream) {
      // Si el output es un único ReadableStream
      console.log("Procesando ReadableStream...");
      const buffer = await streamToBuffer(output);
      // Convertir a WebP si no lo está
      const convertedBuffer = await sharp(buffer)
        .webp({ quality: 80 })
        .toBuffer();
      webpImageOutput = `data:image/webp;base64,${convertedBuffer.toString("base64")}`;
      console.log("Imagen mejorada convertida a WebP desde ReadableStream.");
    } else {
      console.log("Output no es una cadena, array o objeto con 'image_url'.");
    }

    if (!webpImageOutput) {
      console.error("Estructura del output desconocida:", JSON.stringify(output, null, 2));
      throw new Error(
        "No se pudo obtener la imagen mejorada desde el output de Replicate."
      );
    }

    return json({ outputImage: webpImageOutput });
  } catch (error: any) {
    console.error("Error en el procesamiento de la imagen:", error);
    return json(
      { error: `Error al procesar la imagen: ${error.message || error}` },
      { status: 500 }
    );
  } finally {
    try {
      await fs.unlink(filepath);
      console.log(`Archivo temporal eliminado: ${filepath}`);
    } catch (unlinkError) {
      console.error(`Error al eliminar el archivo temporal: ${unlinkError}`);
    }
  }
};

export default function TransformImage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const navigation = useNavigation();
  const data = useActionData<{ error?: string; outputImage?: string }>();

  const isSubmitting = navigation.state === "submitting";

  // Restablecer la imagen mejorada cuando el formulario comienza a enviarse
  useEffect(() => {
    if (isSubmitting) {
      setEnhancedImage(null);
    }
  }, [isSubmitting]);

  // Actualizar la imagen mejorada cuando se recibe la respuesta del servidor
  useEffect(() => {
    if (data?.outputImage) {
      setEnhancedImage(data.outputImage);
    }
  }, [data]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setEnhancedImage(null); // Restablecer la imagen mejorada
    } else {
      setImagePreview(null);
      setEnhancedImage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImagePreview(URL.createObjectURL(file));
      setEnhancedImage(null); // Restablecer la imagen mejorada
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.files = dataTransfer.files;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 py-12 px-4 sm:px-6 lg:px-8 relative">
      <Link
        to="/"
        className="absolute top-4 left-4 p-2 bg-white bg-opacity-20 rounded-full text-white hover:bg-opacity-30 transition-all duration-300"
      >
        <ArrowLeft className="w-6 h-6" />
      </Link>
      <div className="max-w-3xl mx-auto bg-white bg-opacity-10 backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden mt-20">
        <div className="p-8">
          <h1 className="text-4xl font-extrabold text-white mb-8 text-center">Añade tu propio prompt a tu imagen</h1>
          <Form method="post" encType="multipart/form-data" className="space-y-6">
            <div className="flex justify-center items-center w-full">
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-white border-dashed rounded-lg cursor-pointer bg-white bg-opacity-10 hover:bg-opacity-20 transition duration-300 ease-in-out"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <ArrowUpToLine className="w-10 h-10 text-white mb-3" />
                  <p className="mb-2 text-sm text-white"><span className="font-semibold">Haz clic para subir</span> o arrastra y suelta</p>
                  <p className="text-xs text-white">PNG, JPG, GIF hasta 10MB</p>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  required
                  className="hidden"
                />
              </label>
            </div>
            {imagePreview && (
              <div className="mt-4 flex justify-center">
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="max-w-xs rounded-lg shadow-md"
                />
              </div>
            )}
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
                placeholder="Ejemplo: Turn him into cyborg"
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
                    Transformando...
                  </>
                ) : (
                  'Transformar Imagen'
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
          {enhancedImage && (
            <div className="mt-8 flex flex-col items-center space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Imagen:</h2>
              <img
                src={enhancedImage}
                alt="Imagen Mejorada"
                className="max-w-full rounded-lg shadow-md"
              />
              <div className="flex justify-center">
                <a
                  href={enhancedImage}
                  download={`imagen-mejorada-${Date.now()}.webp`}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-300 ease-in-out"
                >
                  Descargar Imagen Mejorada
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
