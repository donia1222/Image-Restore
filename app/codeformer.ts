import Replicate from "replicate";

interface CodeFormerOptions {
  image: string;
  upscale?: number;
  face_upsample?: boolean;
  background_enhance?: boolean;
  codeformer_fidelity?: number;
}

export async function runCodeFormer(options: CodeFormerOptions): Promise<string> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not set in the environment variables");
  }

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  try {
    const output = await replicate.run(
      "sczhou/codeformer:7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56",
      {
        input: {
          image: options.image,
          upscale: options.upscale ?? 2,
          face_upsample: options.face_upsample ?? true,
          background_enhance: options.background_enhance ?? true,
          codeformer_fidelity: options.codeformer_fidelity ?? 0.1
        }
      }
    );

    if (typeof output === 'string') {
      return output;
    } else {
      throw new Error("Unexpected output format from Replicate API");
    }
  } catch (error) {
    console.error("Error running CodeFormer:", error);
    throw error;
  }
}

