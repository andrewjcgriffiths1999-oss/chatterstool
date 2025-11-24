const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("AI article backend is running on Render!");
});

app.post("/api/generate-article", async (req, res) => {
  try {
    const { topic, tone, length } = req.body;

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({ error: "Topic is required." });
    }

    let lengthInstruction;
    switch (length) {
      case "short":
        lengthInstruction = "600–800 words";
        break;
      case "medium":
        lengthInstruction = "1200–1500 words";
        break;
      case "long":
        lengthInstruction = "2000 words";
        break;
      default:
        lengthInstruction = "800–1200 words";
    }

    const toneInstruction =
      tone === "academic"
        ? "academic and evidence-based"
        : tone === "persuasive"
        ? "persuasive but factual"
        : "neutral and explanatory";

    const prompt = `
Write an article on the topic: "${topic}".

Tone: ${tone_instruction}.
Length: ${lengthInstruction}.

Include:
- Intro
- 3–6 sections with headings
- Inline citations like [1], [2]
- A “References” list with real URLs (no placeholders)
    `;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
    });

    res.json({ article: response.output_text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generating article" });
  }
});

// Render provides process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
