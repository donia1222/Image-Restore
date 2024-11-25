import { useState, useEffect } from "react";
import type { ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useNavigation, useActionData } from "@remix-run/react";
import Replicate from "replicate";
import fs from "fs/promises";
import path from "path";
import os from "os";
import cuid from "cuid";
import fetch from "node-fetch";
import sharp from "sharp";
import ImageComparison from "../components/image-comparison";
import { ArrowUpToLine, RotateCw } from 'lucide-react';

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
  console.log("Archivo de imagen recibido:", imageFile);

  if (!imageFile) {
    return json(
      { error: "No se proporcionó ninguna imagen." },
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

    // Utilizar sharp para reducir el tamaño y comprimir la imagen
    const resizedImageBuffer = await sharp(fileBuffer)
      .resize(800)
      .jpeg({ quality: 80 })
      .toBuffer();
    console.log("Imagen redimensionada y comprimida.");

    await fs.writeFile(filepath, resizedImageBuffer);
    console.log("Archivo temporal guardado.");

    const imageData = await fs.readFile(filepath, { encoding: "base64" });
    console.log(`Imagen convertida a base64, tamaño: ${imageData.length}`);

    const base64Image = `data:image/jpeg;base64,${imageData}`;

    console.log("Ejecutando el modelo de Replicate...");
    const output = await replicate.run(
      "tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c",
      {
        input: {
          img: base64Image,
          scale: 2,
          version: "v1.4"
        }
      }
    );
    console.log(output);
    console.log("Salida del modelo de Replicate:", output);

    let imageUrl: string | null = null;
    let base64ImageOutput: string | null = null;

    if (typeof output === "string") {
      imageUrl = output;
    } else if (Array.isArray(output) && typeof output[0] === "string") {
      imageUrl = output[0];
    } else if (
      typeof output === "object" &&
      output !== null &&
      "image_url" in output
    ) {
      imageUrl = (output as any).image_url;
    } else if (output instanceof ReadableStream) {
      console.log("Procesando ReadableStream...");
      const buffer = await streamToBuffer(output);
      base64ImageOutput = `data:image/png;base64,${buffer.toString("base64")}`;
      console.log("Imagen mejorada convertida a base64 desde ReadableStream.");
    } else {
      console.log("Output no es una cadena, array o objeto con 'image_url'.");
    }

    if (!imageUrl && !base64ImageOutput) {
      throw new Error(
        "No se pudo obtener la URL de la imagen mejorada desde el output de Replicate."
      );
    }

    if (imageUrl) {
      console.log(`URL de la imagen mejorada: ${imageUrl}`);

      const response = await fetch(imageUrl);
      console.log(`Respuesta de fetch: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        throw new Error(`Error al obtener la imagen: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      base64ImageOutput = `data:image/png;base64,${Buffer.from(
        arrayBuffer
      ).toString("base64")}`;
      console.log("Imagen mejorada convertida a base64 desde URL.");
    }

    return json({ outputImage: base64ImageOutput });
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

export default function Index() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const navigation = useNavigation();
  const data = useActionData<{ error?: string; outputImage?: string }>();

  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (data?.outputImage) {
      setEnhancedImage(data.outputImage);
      // Limpiar los parámetros de consulta si existen
      if (window.location.search.includes('index=')) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">Mejora tu imagen</h1>
          <Form method="post" encType="multipart/form-data" className="space-y-6">
            <div className="flex justify-center items-center w-full">
              <label
                htmlFor="image-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition duration-300 ease-in-out"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <ArrowUpToLine className="w-10 h-10 text-gray-400 mb-3" />
                  <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Haz clic para subir</span> o arrastra y suelta</p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
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
                    Mejorando...
                  </>
                ) : (
                  'Mejorar Imagen'
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
          {enhancedImage && imagePreview && (
            <div className="mt-8 space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Comparación de Imágenes:</h2>
              <ImageComparison originalImage={imagePreview} enhancedImage={enhancedImage} />
              <div className="flex justify-center">
                <a
                  href={enhancedImage}
                  download={`imagen-mejorada-${Date.now()}.png`}
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
