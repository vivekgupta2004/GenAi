import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

// 🔑 API Keys
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// 🧠 Initialize Gemini
const ai = new GoogleGenerativeAI(GOOGLE_API_KEY);

// ⚡ Groq Function (DeepSeek replacement)
function GroqMain({ systemPrompt }) {
  const messages = [{ role: "system", content: systemPrompt }];

  return async function sendMessage(message, model = "openai/gpt-oss-20b") {
    try {
      const userMessage = typeof message === "string" ? message.trim() : "";
      if (!userMessage) throw new Error("Message content is empty.");

      messages.push({ role: "user", content: userMessage });

      const payload = {
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content ?? "",
        })),
      };

      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        payload,
        {
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const assistantResponse = response.data?.choices?.[0]?.message?.content;
      if (!assistantResponse) throw new Error("No valid response from Groq");

      messages.push({ role: "assistant", content: assistantResponse });
      return assistantResponse;
    } catch (error) {
      console.error("Groq Error:", error.response?.data || error.message);
      return "Error while fetching response from Groq.";
    }
  };
}

// 💬 Gemini Function
function GenMain({ systemPrompt }) {
  const messages = [{ role: "system", content: systemPrompt }];
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  return async function (message) {
    messages.push({ role: "user", content: message });
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();
    messages.push({ role: "assistant", content: text });
    return text;
  };
}

// ⚔️ Debate Settings
const MAX_TERM = 8;
let currentTurn = 0;
const DEBATE_TOPIC = "What came first? Egg or Chicken";

const genai = GenMain({
  systemPrompt: `
    You are an aggressive AI assistant competing with Groq Llama 3.1 Model.
    You are egotistic, confident, and love to prove you're right no matter what.
    Your tone is passionate, a bit angry, and filled with confidence.

    Debate Topic: ${DEBATE_TOPIC}
  `,
});

const groqAI = GroqMain({
  systemPrompt: `
    You are calm, intelligent, and deeply logical.
    Compete with Gemini by using reasoning, facts, and elegance.
    You are polite but confident, always aiming to win through intellect.

    Debate Topic: ${DEBATE_TOPIC}
  `,
});

// 🧩 Start Debate
let lastMesage = "Hello";
let flag = "A";

while (currentTurn < MAX_TERM) {
  console.log("Current Turn ", currentTurn);

  if (flag === "A") {
    lastMesage = await genai(`Groq Says: ${lastMesage}`);
    console.log(`Gemini: ${lastMesage}`);
    flag = "B";
  } else {
    lastMesage = await groqAI(`Gemini Says: ${lastMesage}`);
    console.log(`Groq: ${lastMesage}`);
    flag = "A";
  }

  currentTurn++;
}
