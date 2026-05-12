// app/api/generate-content/route.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { chapterDetails } = await req.json();

    if (!chapterDetails || typeof chapterDetails !== "string") {
      return new Response(
        JSON.stringify({ error: "Chapter details are required" }),
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      console.error("❌ Gemini API key not configured");
      return new Response(
        JSON.stringify({
          error: "API configuration error",
          details: "Gemini API key not found",
        }),
        { status: 500 }
      );
    }

    console.log("🚀 Starting content generation...");

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are an expert educational content creator. Generate comprehensive study material for:

${chapterDetails}

Create a JSON response with EXACTLY these fields (all required):

{
  "notes": "3-4 paragraphs of detailed notes explaining the topic thoroughly. Make it comprehensive and student-friendly.",
  "summary": "A brief 1-2 paragraph summary capturing the essence.",
  "media": "List 3-5 types of visual aids that would help (e.g., diagrams, charts, videos)",
  "timeline": [
    {"year": "YYYY", "event": "Historical or significant event"},
    {"year": "YYYY", "event": "Another important event"},
    {"year": "YYYY", "event": "Latest development"}
  ],
  "q1m": [
    {"q": "Short question (1-2 lines)?", "a": "Concise 1-line answer"},
    {"q": "What is another concept?", "a": "Direct short answer"},
    {"q": "Define this term?", "a": "One line definition"}
  ],
  "q3m": [
    {"q": "Explain [concept] with example and significance?", "a": "Detailed answer in 3-4 sentences with explanation"},
    {"q": "How does [process] work?", "a": "Step-by-step explanation in 3-4 sentences"}
  ],
  "q5m": [
    {"q": "Discuss [topic] comprehensively with multiple aspects?", "a": "Detailed answer in 4-6 sentences covering: definition, process, examples, significance, conclusion"},
    {"q": "Analyze [concept] with detailed explanation?", "a": "Long answer with multiple paragraphs covering all aspects"}
  ],
  "keyTerms": [
    {"term": "Important Term 1", "def": "Clear definition in 1-2 lines"},
    {"term": "Important Term 2", "def": "Definition with context"},
    {"term": "Important Term 3", "def": "Another key term definition"}
  ],
  "keyPeople": [
    {"term": "Scientist/Scholar Name", "def": "Their major contribution or discovery"},
    {"term": "Another Important Person", "def": "Why they are significant to this topic"}
  ],
  "quiz": [
    {"q": "Multiple choice question here?", "options": ["Wrong answer A", "Correct answer B", "Wrong answer C", "Wrong answer D"], "correctIndex": 1},
    {"q": "Another MCQ?", "options": ["A", "B (correct)", "C", "D"], "correctIndex": 1},
    {"q": "Third question?", "options": ["Option 1", "Option 2 (correct)", "Option 3", "Option 4"], "correctIndex": 1}
  ]
}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON (no markdown, no code blocks, no extra text)
- Every array field must have AT LEAST 2-3 items
- All string fields must be non-empty
- Quiz must have exactly 4 options per question
- correctIndex must be 0-3 (integer)
- No null or undefined values
- Make content appropriate for Indian board exams (CBSE/ICSE)
- Ensure all content is accurate and educationally sound`;

    const result = await model.generateContent(prompt);

    if (!result || !result.response) {
      throw new Error("Invalid response from Gemini API");
    }

    const responseText = result.response.text();
    console.log("📝 Raw response received, parsing...");

    // Parse JSON response
    let content = {};
    try {
      // Remove markdown code blocks
      const cleanedText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      content = JSON.parse(cleanedText);
      console.log("✅ JSON parsed successfully");
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError);
      console.error("Response text:", responseText);

      return new Response(
        JSON.stringify({
          error: "Failed to parse AI response",
          details: "The AI response was not in valid JSON format",
          raw: responseText.substring(0, 200),
        }),
        { status: 500 }
      );
    }

    // Validate required fields
    const requiredFields = [
      "notes",
      "summary",
      "timeline",
      "q1m",
      "q3m",
      "q5m",
      "keyTerms",
      "keyPeople",
      "quiz",
    ];

    const missingFields = [];
    for (const field of requiredFields) {
      if (!content[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields in response",
          missingFields,
        }),
        { status: 500 }
      );
    }

    console.log("✅ Content validation passed");

    return new Response(
      JSON.stringify({
        success: true,
        content,
        message: "Content generated successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ API Error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to generate content",
        details: error.message,
      }),
      { status: 500 }
    );
  }
}
