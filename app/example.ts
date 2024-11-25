import { runCodeFormer } from "./codeformer";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  try {
    const result = await runCodeFormer({
      image: "https://replicate.delivery/mgxm/7534e8f1-ee01-4d66-ae40-36343e5eb44a/003.png",
      upscale: 2,
      face_upsample: true,
      background_enhance: true,
      codeformer_fidelity: 0.1
    });

    console.log("CodeFormer result:", result);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();

