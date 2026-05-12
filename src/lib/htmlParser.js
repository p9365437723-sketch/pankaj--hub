// Robust HTML Parser - Handles varying AI output structures
// Extracts structured content from AI-generated HTML

export const parseHtmlContent = (html) => {
  const result = {
    notes: "",
    summary: "",
    media: "",
    timeline: [],
    q1m: [],
    q3m: [],
    q5m: [],
    keyTerms: [],
    keyPeople: [],
    quiz: [],
  };

  if (!html || typeof html !== "string" || !html.trim()) {
    return result;
  }

  try {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    console.log("🔍 Starting robust HTML parse...");

    // ============ HELPER FUNCTIONS ============

    const extractTextUntilHeading = (startElement) => {
      if (!startElement) return "";
      let text = "";
      let element = startElement;

      while (element && !element.tagName.match(/^H[1-6]$/)) {
        text += element.outerHTML || element.textContent;
        element = element.nextElementSibling;
      }

      return text.trim();
    };

    const findSectionByHeading = (keywords) => {
      const allHeadings = tempDiv.querySelectorAll("h1, h2, h3, h4, h5, h6");

      for (const heading of allHeadings) {
        const headingText = heading.textContent.toLowerCase();

        for (const keyword of (Array.isArray(keywords) ? keywords : [keywords])) {
          if (headingText.includes(keyword.toLowerCase())) {
            return extractTextUntilHeading(heading.nextElementSibling);
          }
        }
      }

      return "";
    };

    const getTextContent = (element) => {
      return element ? element.textContent.trim() : "";
    };

    // ============ PARSE SIMPLE TEXT SECTIONS ============

    const sectionMappings = [
      { field: "notes", keywords: ["notes", "introduction", "content", "overview", "explanation", "details"] },
      { field: "summary", keywords: ["summary", "brief", "abstract", "synopsis", "recap"] },
      { field: "media", keywords: ["media", "resources", "visual", "diagrams", "images", "figures"] },
    ];

    for (const { field, keywords } of sectionMappings) {
      result[field] = findSectionByHeading(keywords) || "";
    }

    // ============ PARSE TIMELINE ============
    result.timeline = parseTimeline(tempDiv);

    // ============ PARSE Q&A SECTIONS ============
    result.q1m = parseQASection(tempDiv, "q1m", "1 mark");
    result.q3m = parseQASection(tempDiv, "q3m", "3 mark");
    result.q5m = parseQASection(tempDiv, "q5m", "5 mark");

    // ============ PARSE KEY TERMS ============
    result.keyTerms = parseKeyTerms(tempDiv);

    // ============ PARSE KEY PEOPLE ============
    result.keyPeople = parseKeyPeople(tempDiv);

    // ============ PARSE QUIZ ============
    result.quiz = parseQuiz(tempDiv);

    // ============ FALLBACK: Try paragraph-based extraction ============
    if (result.q1m.length === 0 && result.q3m.length === 0) {
      const fallbackQA = parseFallbackQA(tempDiv);
      if (result.q1m.length === 0) result.q1m = fallbackQA.slice(0, 3);
      if (result.q3m.length === 0) result.q3m = fallbackQA.slice(3, 6);
    }

    // ============ LOG RESULTS ============
    const populatedCount = Object.entries(result).filter(([_, v]) =>
      (Array.isArray(v) && v.length > 0) ||
      (typeof v === "string" && v.trim().length > 0)
    ).length;

    console.log(`📊 Parse complete: ${populatedCount} fields populated`);

    return result;
  } catch (error) {
    console.error("❌ HTML Parse Error:", error);
    return result;
  }
};

// ============ PARSE TIMELINE ============
function parseTimeline(tempDiv) {
  const items = [];

  // Method 1: data attributes
  tempDiv.querySelectorAll("[data-timeline] .timeline-item, .timeline-item").forEach((item) => {
    const yearEl = item.querySelector("[data-year], .year, [class*='year'], strong:first-of-type");
    const eventEl = item.querySelector("[data-event], .event, [class*='event']");

    if (yearEl && eventEl) {
      const year = getTextContent(yearEl);
      const event = getTextContent(eventEl);
      if (year && event && year !== event) {
        items.push({ year, event });
      }
    }
  });

  // Method 2: table rows
  if (items.length === 0) {
    tempDiv.querySelectorAll("table tr, tbody tr").forEach((row) => {
      const cells = row.querySelectorAll("td, th");
      if (cells.length >= 2) {
        const year = getTextContent(cells[0]);
        const event = getTextContent(cells[1]);
        if (year && event && year !== event) {
          items.push({ year, event });
        }
      }
    });
  }

  // Method 3: list items with year pattern
  if (items.length === 0) {
    tempDiv.querySelectorAll("li, div").forEach((item) => {
      const text = getTextContent(item);
      const yearMatch = text.match(/\b(19|20)\d{2}\b/);
      if (yearMatch && text.length > yearMatch.index + 10) {
        const year = yearMatch[0];
        const event = text.replace(year, "").replace(/^[\s:–-]+/, "").trim();
        if (event && event.length > 5) {
          items.push({ year, event });
        }
      }
    });
  }

  return items.slice(0, 10);
}

// ============ PARSE Q&A SECTIONS ============
function parseQASection(tempDiv, dataAttr, label) {
  const items = [];

  // Try multiple selectors
  const selectors = [
    `[data-${dataAttr}] .${dataAttr}-item`,
    `.${dataAttr}-item`,
    `[class*='${dataAttr}']`,
    `li[class*='question']`,
  ];

  for (const selector of selectors) {
    tempDiv.querySelectorAll(selector).forEach((item) => {
      // Try to find question
      const qEl = item.querySelector(
        "[data-q], .question, [class*='question'], strong, h4, b, dt"
      );
      // Try to find answer
      const aEl = item.querySelector(
        "[data-a], .answer, [class*='answer'], p, dd"
      );

      const q = qEl ? getTextContent(qEl).replace(/^Q\d*[\.\)]?\s*/i, "") : "";
      const a = aEl ? getTextContent(aEl).replace(/^A\d*[\.\)]?\s*/i, "") : "";

      if (q && a && q !== a && q.length > 3 && a.length > 3) {
        items.push({ q, a });
      }
    });
  }

  // Fallback: parse text patterns
  if (items.length === 0) {
    const allText = tempDiv.textContent;
    const qaPattern = /(?:^|\n)(Q\d*[\.\):]\s*)(.+?)(?:\n|A\d*[\.\):]\s*)(.+?)(?=(?:Q\d*|\n|$))/gi;
    let match;
    while ((match = qaPattern.exec(allText)) !== null) {
      items.push({ q: match[2].trim(), a: match[4].trim() });
    }
  }

  return items.slice(0, 10);
}

// ============ PARSE KEY TERMS ============
function parseKeyTerms(tempDiv) {
  const items = [];

  // Try multiple selectors
  const selectors = [
    "[data-keyTerms] .keyTerms-item",
    ".keyTerms-item",
    ".term-item",
    "dl dt, dl dd",
    "[class*='term']",
  ];

  let terms = [];
  tempDiv.querySelectorAll(selectors.join(", ")).forEach((item) => {
    terms.push(getTextContent(item));
  });

  // Pair up terms and definitions
  for (let i = 0; i < terms.length - 1; i += 2) {
    const term = terms[i].split(":")[0].trim();
    let def = terms[i + 1] || terms[i].split(":")[1] || "";
    def = def.trim();

    if (term && def && term !== def && term.length > 1 && def.length > 3) {
      items.push({ term, def });
    }
  }

  // Fallback: definition list
  if (items.length === 0) {
    tempDiv.querySelectorAll("dt").forEach((dt) => {
      const term = getTextContent(dt).split(":")[0].trim();
      const dd = dt.nextElementSibling;
      const def = dd && dd.tagName === "DD" ? getTextContent(dd) : "";

      if (term && def) {
        items.push({ term, def });
      }
    });
  }

  return items.slice(0, 15);
}

// ============ PARSE KEY PEOPLE ============
function parseKeyPeople(tempDiv) {
  const items = [];

  tempDiv.querySelectorAll(
    "[data-keyPeople] .keyPeople-item, .keyPeople-item, [class*='people'] li"
  ).forEach((item) => {
    const nameEl = item.querySelector("[data-name], .name, strong:first-of-type, h4");
    const contribEl = item.querySelector("[data-contribution], .contribution, p");

    const term = nameEl ? getTextContent(nameEl) : "";
    const def = contribEl ? getTextContent(contribEl) : "";

    if (term && def) {
      items.push({ term, def });
    }
  });

  // Fallback: list items with names
  if (items.length === 0) {
    tempDiv.querySelectorAll("li").forEach((item) => {
      const text = getTextContent(item);
      // Skip if it looks like a date/place
      if (!text.match(/^\d{4}/) && text.length > 20) {
        items.push({ term: text.split(/[:–-]/)[0]?.trim() || text, def: text });
      }
    });
  }

  return items.slice(0, 10);
}

// ============ PARSE QUIZ ============
function parseQuiz(tempDiv) {
  const items = [];

  tempDiv.querySelectorAll(
    "[data-quiz] .quiz-item, .quiz-item, [class*='quiz'] li, [class*='question']"
  ).forEach((item) => {
    const qEl = item.querySelector("[data-question], .question-text, strong, h4, b");
    const optionsEls = item.querySelectorAll(
      "[data-option], .option, li, label, span"
    );

    const q = qEl ? getTextContent(qEl) : "";
    const options = Array.from(optionsEls)
      .map((o) => getTextContent(o))
      .filter((o) => o && o.length > 0 && o.length < 200)
      .slice(0, 4);

    if (q && options.length >= 2) {
      items.push({
        q: q.replace(/^Q\d*[\.\):]\s*/i, ""),
        options,
        correctIndex: 0,
      });
    }
  });

  return items.slice(0, 10);
}

// ============ FALLBACK Q&A PARSING ============
function parseFallbackQA(tempDiv) {
  const items = [];
  const paragraphs = tempDiv.querySelectorAll("p");

  paragraphs.forEach((p) => {
    const text = getTextContent(p);

    // Look for question patterns
    if (text.match(/^Q\d*[\.\):]/i) || text.match(/\?$/)) {
      let q = text.replace(/^Q\d*[\.\):]\s*/i, "").trim();
      const nextP = p.nextElementSibling;

      if (nextP && (nextP.textContent.match(/^A\d*[\.\):]/i) || items.length > 0)) {
        let a = getTextContent(nextP).replace(/^A\d*[\.\):]\s*/i, "").trim();
        if (q && a && q !== a) {
          items.push({ q, a });
        }
      }
    }
  });

  return items;
}

export default { parseHtmlContent };
