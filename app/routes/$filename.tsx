// app/routes/uploads/$filename.tsx
import type { LoaderFunction } from "@remix-run/node";
import { join } from "path";
import { promises as fs } from "fs";
import { json } from "@remix-run/node";

export const loader: LoaderFunction = async ({ params }) => {
  const { filename } = params;
  const filePath = join(process.cwd(), "uploads", filename!);

  try {
    const file = await fs.readFile(filePath);
    const contentType = filename!.endsWith(".png") ? "image/png" : "image/jpeg";
    return new Response(file, {
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    return json({ error: "Archivo no encontrado" }, { status: 404 });
  }
};

export default function UploadFile() {
  // Esta ruta no necesita renderizar nada
  return null;
}
