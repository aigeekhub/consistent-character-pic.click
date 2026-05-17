import { ai } from "@/lib/gemini";
import { Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/scaffold/logger";
import { AppError } from "@/lib/scaffold/errors";
import { AppErrorCode } from "@/lib/scaffold/types";
import { getAppSetting } from "@/lib/scaffold/settings";

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  try {
    const body = await req.json();
    const { image, goal, limit } = body;

    const maxBatchSize = getAppSetting('MAX_BATCH_SIZE') || 10;
    const finalLimit = Math.min(limit || 4, maxBatchSize);

    logger.log('API_START', 'PROMPT_GEN', `Processing prompt generation request ${requestId}`, 'info', { goal, limit: finalLimit });

    if (!image) {
      throw new AppError(AppErrorCode.API_001, "Reference image is required", "PROMPT_GEN", "warn");
    }

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: image.split(",")[1] || image,
                mimeType: "image/png",
              },
            },
            {
              text: `Analyze this character image. Then, based on the goal: "${goal || "A day in the life"}", generate a sequence of ${finalLimit} detailed image generation prompts that depict this EXACT character in different scenes, poses, or activities. 
              
              Ensure each prompt explicitly mentions the key visual traits of the character to maintain consistency (e.g. hair color, specific clothing items, facial features). 
              
              Return the results as a JSON array of strings. Maximum ${finalLimit} items.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    const prompts = JSON.parse(response.text || "[]");
    
    logger.log('API_SUCCESS', 'PROMPT_GEN', `Generated ${prompts.length} prompts for request ${requestId}`, 'info');

    return NextResponse.json({ prompts });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.severity === 'error' ? 500 : 400 });
    }

    const structuredError = new AppError(
      AppErrorCode.SYS_001,
      error.message || "Unknown error during prompt generation",
      "PROMPT_GEN",
      "error",
      { originalError: error.message }
    );
    return NextResponse.json(structuredError.toJSON(), { status: 500 });
  }
}
