// server.ts
import * as path from "path";
import { createRequestHandler } from "@remix-run/express";
import { installGlobals } from "@remix-run/node";
import express from "express";
import * as dotenv from "dotenv";
import fs from "fs/promises";

// Cargar variables de entorno desde .env
dotenv.config();

// Instalar globals para que Remix pueda usar APIs globales como `fetch`
installGlobals();

const app = express();

// Deshabilitar el encabezado "X-Powered-By" para mejorar la seguridad
app.disable("x-powered-by");

// Middleware para parsear `multipart/form-data` si necesitas manejar formularios
// (Opcional: Solo si no lo estás manejando en Remix)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir los activos estáticos de Remix con caché a largo plazo
app.use(
  "/build",
  express.static("public/build", { immutable: true, maxAge: "1y" })
);

// Servir otros activos estáticos con caché de 1 hora
app.use(express.static("public", { maxAge: "1h" }));

// **Nuevo: Servir la carpeta `uploads` como estática**
const uploadsPath = path.join(__dirname, "..", "uploads");

// Asegurarse de que la carpeta `uploads` existe
fs.mkdir(uploadsPath, { recursive: true })
  .then(() => {
    console.log(`Carpeta 'uploads' asegurada en: ${uploadsPath}`);
  })
  .catch((err) => {
    console.error("Error al crear la carpeta 'uploads':", err);
  });

// Servir la carpeta `uploads` en la ruta `/uploads`
app.use("/uploads", express.static(uploadsPath, { maxAge: "1d" }));

// Manejar todas las demás rutas con Remix
app.all(
  "*",
  process.env.NODE_ENV === "development"
    ? (req, res, next) => {
        purgeRequireCache();

        return createRequestHandler({
          build: require(path.resolve("./.cache/build/index.js")),
          mode: process.env.NODE_ENV,
        })(req, res, next);
      }
    : createRequestHandler({
        build: require(path.resolve("./.cache/build/index.js")),
        mode: process.env.NODE_ENV,
      })
);

// Iniciar el servidor en el puerto especificado
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Servidor Express escuchando en el puerto ${port}`);
});

/**
 * Función para purgar la caché de `require` durante el desarrollo.
 * Esto permite que los cambios en el código se reflejen sin reiniciar el servidor.
 */
function purgeRequireCache() {
  // Purgar la caché de `require` para archivos en `.cache/build`
  for (const key in require.cache) {
    if (key.startsWith(path.resolve("./.cache/build"))) {
      delete require.cache[key];
    }
  }
}
