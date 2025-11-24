const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simple check for the root URL
app.get("/", (req, res) => {
  res.send("AI article backend is running on Render!");
});

app.post("/api/generate-article", async (req, res) => {
  try {
    const { topic, tone, length } = req.body;

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({ error: "Topic is required." });
    }

    // Map length
    let lengthInstruction;
    switch (length) {
      case "short":
        lengthInstruction = "around 600–800 words";
        break;
      case "medium":
        lengthInstruction = "around 1200–1500 words";
        break;
      case "long":
        lengthInstruction = "around 2000 words";
        break;
      default:
        lengthInstruction = "around 800–1200 words";
    }

    // Map tone
    let toneInstruction;
    if (tone === "academic") {
      toneInstruction = "academic and evidence-based";
    } else if (tone === "persuasive") {
      toneInstruction = "persuasive but still factual";
    } else {
      toneInstruction = "neutral and explanatory";
    }

    const prompt = `
Write an article on the topic: "${topic}".

Tone: ${toneInstruction}.
Target length: ${lengthInstruction}.

Requirements:
- Use an intro, 3–6 clear sections with headings, and a short conclusion.
- For each important factual claim that depends on external sources, add an inline citation like [1], [2], etc.
- After the conclusion, add a section titled "References" on its own line.
- Under "References", list each source on a new line in this format:
  [n] Title – Source / Organisation (Year). URL

Guidelines for references:
- Prefer official or reputable sources (.gov, .edu, .org, major journals, trusted news).
- Do NOT invent obviously fake URLs. Only use URLs you are reasonably confident about.
- If you are uncertain about exact titles or years, note that clearly (e.g. "approx. 2020").
- Do not use placeholder text like "example.com".
    `.trim();

    // Use the Chat Completions API (works with openai v4)
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini", // or another chat-capable model on your account
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that writes well-structured, well-referenced articles.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const article = completion.choices[0]?.message?.content || "";

    if (!article) {
      return res
        .status(500)
        .json({ error: "OpenAI returned an empty response." });
    }

    res.json({ article });
  } catch (err) {
    console.error("OpenAI / server error:", err);

    let message = "Error generating article.";
    if (err && typeof err === "object" && "message" in err && err.message) {
      message = err.message;
    }

    // Send the real error message back so you can see it in CodePen
    res.status(500).json({ error: message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
