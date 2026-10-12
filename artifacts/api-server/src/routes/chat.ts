import { GoogleGenAI } from "@google/genai";
import { SendChatMessageBody, SendChatMessageResponse } from "@workspace/api-zod";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const apiKey = process.env["GOOGLEAISTUDIO"];
  if (!apiKey) {
    req.log.error("Google AI Studio secret is not configured");
    res.status(503).json({ error: "The AI service is not configured." });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: parsed.data.messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      config: {
        systemInstruction:
          "You are a helpful, thoughtful assistant. Answer clearly and directly, and ask a brief clarifying question when needed.",
        maxOutputTokens: 8192,
      },
    });

    const content = response.text?.trim();
    if (!content) {
      res.status(503).json({ error: "The AI service returned an empty response. Please try again." });
      return;
    }

    res.json(SendChatMessageResponse.parse({ content }));
  } catch (err) {
    req.log.error({ err }, "AI chat generation failed");
    res.status(503).json({ error: "The AI service is temporarily unavailable. Please try again." });
  }
});

export default router;
