import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" })); // Allow base64 uploads/downloads if needed

// Lazy load Gemini Client to prevent crash on startup if API key is not set
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다. AI Studio의 Settings > Secrets 패널에서 설정해주세요.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API: Check health/availability of API key
app.get("/api/health", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    status: "ok",
    hasApiKey: hasKey,
    message: hasKey ? "API 키가 준비되었습니다." : "API 키가 누락되었습니다. 설정에서 등록해주세요."
  });
});

// API: Generate wallpapers
app.post("/api/generate", async (req, res) => {
  try {
    const { mood } = req.body;
    if (!mood || typeof mood !== "string" || mood.trim() === "") {
      return res.status(400).json({ error: "원하는 분위기나 키워드를 입력해주세요." });
    }

    const ai = getAi();

    // 1. Text Phase: Translate & Enhance to 4 distinct english prompts with different visual styles
    const systemInstruction = `You are an expert art director specializing in mobile wallpaper prompt engineering.
Your task is to take a user's mood description in Korean and generate 4 distinctly styled, detailed, high-quality image prompts in English.
Each prompt must be perfectly optimized for Imagen 3 (gemini-3.1-flash-lite-image) with a 9:16 aspect ratio in mind.

Style styles should be distinct. Ensure you use diverse aesthetic styles such as:
1. Cinematic Photography (웅장한 시네마틱 사진)
2. Cozy Watercolor / Digital Painting (따뜻한 수채화/일러스트)
3. 3D Render / Cyberpunk (3D 그래픽 / 사이버펑크)
4. Minimalist / Pastel Gradient / Line Art (미니멀 파스텔 / 라인아트)
5. Anime Aesthetic (감성적인 애니메이션 풍)

Return your response strictly as a JSON array containing exactly 4 objects.
Each object must have:
- 'prompt': Detailed English prompt (max 3-4 sentences. Include light, medium, composition, detailed elements).
- 'styleName': A short Korean style name (e.g., '시네마틱 사진', '따뜻한 일러스트', '미니멀 파스텔', '사이버펑크 네온').
- 'description': A single concise Korean sentence describing the visual concept (e.g., '비에 젖은 어두운 도심 속 네온사인의 깊은 푸른 반사광 연출').`;

    const textResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `사용자가 입력한 분위기: "${mood.trim()}"

이 분위기를 바탕으로 독창적이고 아름다운 9:16 모바일 배경화면용 영문 프롬프트 4종을 만들어줘.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              prompt: { type: Type.STRING },
              styleName: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["prompt", "styleName", "description"],
          },
        },
      },
    });

    const promptsData = JSON.parse(textResponse.text.trim());
    if (!Array.isArray(promptsData) || promptsData.length === 0) {
      throw new Error("프롬프트 생성 결과를 파싱하지 못했습니다.");
    }

    // 2. Image Generation Phase: Generate 4 images in parallel using the 4 prompts
    const imagePromises = promptsData.slice(0, 4).map(async (item: any, index: number) => {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [
              {
                text: item.prompt,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: "9:16"
            }
          }
        });

        let base64Image = "";
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData?.data) {
            base64Image = part.inlineData.data;
            break;
          }
        }

        if (!base64Image) {
          throw new Error(`이미지 데이터를 받지 못했습니다. (인덱스 ${index})`);
        }

        return {
          id: `wp-${Date.now()}-${index}`,
          imageUrl: `data:image/png;base64,${base64Image}`,
          styleName: item.styleName,
          description: item.description,
          englishPrompt: item.prompt,
          mood: mood.trim()
        };
      } catch (err: any) {
        console.error(`이미지 생성 에러 (인덱스 ${index}):`, err);
        // Fallback or rethrow. To keep Promise.all resilient, we return null and filter it out, or return an error indicator
        return {
          id: `wp-error-${index}`,
          imageUrl: null,
          styleName: item.styleName,
          description: item.description,
          englishPrompt: item.prompt,
          mood: mood.trim(),
          error: true
        };
      }
    });

    const results = await Promise.all(imagePromises);
    const successfulResults = results.filter(r => !r.error && r.imageUrl);

    if (successfulResults.length === 0) {
      throw new Error("이미지 생성에 실패했습니다. API 할당량 초과 또는 키 상태를 확인해주세요.");
    }

    res.json({
      success: true,
      wallpapers: results
    });

  } catch (error: any) {
    console.error("배경화면 생성 전체 에러:", error);
    res.status(500).json({
      error: error.message || "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
    });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
