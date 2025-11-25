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
    const { topic, tone = "neutral", length = "medium" } = req.body || {};

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({ error: "Topic is required." });
    }

    // --- Helpers for length + tone instructions ---
    function getLengthInstruction(lengthValue) {
      switch (lengthValue) {
        case "short":
          return "Aim for around 600–800 words.";
        case "medium":
          return "Aim for around 1200–1500 words.";
        case "long":
          return "Aim for around 1800–2200 words.";
        default:
          return "Aim for around 800–1200 words.";
      }
    }

    function getToneInstruction(toneValue) {
      switch (toneValue) {
        case "academic":
          return "Use an academic, evidence-based tone with careful wording.";
        case "persuasive":
          return "Use a persuasive, confident tone while staying evidence-based.";
        case "neutral":
        default:
          return "Use a neutral, explanatory tone that is accessible to an educated general audience.";
      }
    }

    const lengthInstruction = getLengthInstruction(length);
    const toneInstruction = getToneInstruction(tone);

    // ==============================
    // STEP 1: Generate full article
    // ==============================

    const baseSystemPrompt =
      "You are an assistant that writes evidence-based, well-structured articles with inline citations and a reference list. Be transparent that references should be checked before use in real work.";

    const baseUserPrompt = `
Write a detailed article on the following topic:

Topic: ${topic.trim()}

${toneInstruction}
${lengthInstruction}

Requirements:
- Provide a clear introduction, body sections with headings, and a conclusion.
- Use inline citations in the text, e.g. (Author, Year) or [1], [2].
- After the conclusion, add a section titled "References" on its own line.
- Under "References", list each source on a new line in this format:
  [n] Title – Source / Organisation (Year). URL

Guidelines for references:
- Prefer official or reputable sources (.gov, .edu, .org, major journals, trusted news).
- Do NOT invent obviously fake URLs. Only use URLs you are reasonably confident about.
- If you are uncertain about exact titles or years, note that clearly (e.g. "approx. 2020").
- Do not use placeholder text like "example.com".
- Mention that references should be double-checked before using them in professional emails or documents.
    `.trim();

    const baseCompletion = await client.chat.completions.create({
      model: "gpt-4.1-mini", // or another chat-capable model on your account
      messages: [
        {
          role: "system",
          content: baseSystemPrompt,
        },
        {
          role: "user",
          content: baseUserPrompt,
        },
      ],
      temperature: 0.7,
    });

    const baseArticle =
      baseCompletion.choices[0]?.message?.content?.trim() || "";

    if (!baseArticle) {
      return res
        .status(500)
        .json({ error: "OpenAI returned an empty response for the base article." });
    }

    // ==============================================
    // STEP 2: Refine into shorter, clearer sentences
    // ==============================================

    const refineSystemPrompt = `
You are an editor that rewrites articles into clear, concise prose.

Goals:
- Keep all facts, structure, and citations (inline and in the reference list).
- Use mostly short, flowing sentences.
- Reduce unnecessary jargon and complexity.
- Keep the article suitable for professional use (e.g. internal emails, reports, briefs).
- Do not remove the "References" section; just make it cleaner and easy to scan.
    `.trim();

    const refineUserPrompt = `
Rewrite the following article according to the goals above:

${baseArticle}
    `.trim();

    const refineCompletion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: refineSystemPrompt,
        },
        {
          role: "user",
          content: refineUserPrompt,
        },
      ],
      temperature: 0.5,
    });

    const refinedArticle =
      refineCompletion.choices[0]?.message?.content?.trim() || "";

    if (!refinedArticle) {
      return res
        .status(500)
        .json({ error: "OpenAI returned an empty response for the refined article." });
    }

    // Send both versions back to the frontend
    res.json({
      article: refinedArticle, // refined, shorter/clearer version
      baseArticle,             // original long version
    });
  } catch (err) {
    console.error("OpenAI / server error:", err);

    let message = "Error generating article.";
    if (err && typeof err === "object" && "message" in err && err.message) {
      message = err.message;
    }

    res.status(500).json({ error: message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
