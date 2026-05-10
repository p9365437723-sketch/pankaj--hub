// lib/htmlParser.js - Parse HTML content into structured data
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

  try {
    // Create a temporary container
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;

    console.log("🔍 Starting HTML parse...");

    // ============ HELPER FUNCTIONS ============

    const extractTextUntilHeading = (startElement) => {
      let text = "";
      let element = startElement;

      while (element && !element.tagName.match(/^H[1-6]$/)) {
        text += element.outerHTML || element.textContent;
        element = element.nextElementSibling;
      }

      return text.trim();
    };

    const findSectionByHeading = (keywords) => {
      const allHeadings = tempDiv.querySelectorAll("h2, h3, h4, h5, h6");

      for (let heading of allHeadings) {
        const headingText = heading.textContent.toLowerCase();

        // Check if any keyword matches
        for (let keyword of (Array.isArray(keywords) ? keywords : [keywords])) {
          if (headingText.includes(keyword.toLowerCase())) {
            console.log(`✅ Found section: "${keyword}"`);
            return extractTextUntilHeading(heading.nextElementSibling);
          }
        }
      }

      return "";
    };

    // ============ PARSE SIMPLE TEXT SECTIONS ============

    // Notes
    result.notes =
      findSectionByHeading([
        "notes",
        "introduction",
        "content",
        "overview",
        "explanation",
        "details",
      ]) || "";

    // Summary
    result.summary =
      findSectionByHeading([
        "summary",
        "brief",
        "abstract",
        "synopsis",
        "overview",
      ]) || "";

    // Media
    result.media =
      findSectionByHeading([
        "media",
        "resources",
        "visual",
        "diagrams",
        "images",
      ]) || "";

    // ============ PARSE TIMELINE ============
    const timelineItems = [];

    // Try data attributes first
    tempDiv.querySelectorAll("[data-timeline] .timeline-item, .timeline-item").forEach((item) => {
      const yearEl = item.querySelector("[data-year], .year");
      const eventEl = item.querySelector("[data-event], .event");

      if (yearEl && eventEl) {
        const year = yearEl.textContent.trim();
        const event = eventEl.textContent.trim();

        if (year && event) {
          timelineItems.push({ year, event });
          console.log(`✅ Timeline: ${year} - ${event}`);
        }
      }
    });

    // If not found, try tables
    if (timelineItems.length === 0) {
      tempDiv.querySelectorAll("table tr").forEach((row) => {
        const cells = row.querySelectorAll("td, th");
        if (cells.length >= 2) {
          const year = cells[0].textContent.trim();
          const event = cells[1].textContent.trim();

          if (year && event && year !== event) {
            timelineItems.push({ year, event });
          }
        }
      });
    }

    result.timeline = timelineItems;

    // ============ PARSE Q&A SECTIONS ============

    const parseQASection = (dataAttr, className) => {
      const items = [];

      // Try with data attributes
      tempDiv.querySelectorAll(`[data-${dataAttr}] .${dataAttr}-item, .${dataAttr}-item`).forEach((item) => {
        const qEl = item.querySelector("[data-q], .question, strong");
        const aEl = item.querySelector("[data-a], .answer");

        if (qEl && aEl) {
          const q = qEl.textContent.trim();
          const a = aEl.textContent.trim();

          if (q && a && q !== a) {
            items.push({ q, a });
            console.log(
              `✅ ${dataAttr}: Q - "${q.substring(0, 30)}..."`
            );
          }
        }
      });

      return items;
    };

    result.q1m = parseQASection("q1m", "q1m");
    result.q3m = parseQASection("q3m", "q3m");
    result.q5m = parseQASection("q5m", "q5m");

    // ============ PARSE KEY TERMS ============

    const keyTermsItems = [];

    tempDiv.querySelectorAll("[data-keyTerms] .keyTerms-item, .term-item, dt").forEach((item) => {
      const termEl = item.querySelector("[data-term], .term, strong");
      const defEl = item.querySelector("[data-def], .definition, em");

      if (termEl && defEl) {
        const term = termEl.textContent.trim();
        const def = defEl.textContent.trim();

        if (term && def) {
          keyTermsItems.push({ term, def });
          console.log(`✅ Key Term: "${term}"`);
        }
      }
    });

    result.keyTerms = keyTermsItems;

    // ============ PARSE KEY PEOPLE ============

    const keyPeopleItems = [];

    tempDiv.querySelectorAll("[data-keyPeople] .keyPeople-item").forEach((item) => {
      const nameEl = item.querySelector("[data-term], .name, strong");
      const contribEl = item.querySelector(
        "[data-def], .contribution"
      );

      if (nameEl && contribEl) {
        const term = nameEl.textContent.trim();
        const def = contribEl.textContent.trim();

        if (term && def) {
          keyPeopleItems.push({ term, def });
          console.log(`✅ Key Person: "${term}"`);
        }
      }
    });

    result.keyPeople = keyPeopleItems;

    // ============ PARSE QUIZ ============

    const quizItems = [];

    tempDiv.querySelectorAll("[data-quiz] .quiz-item, .quiz-item").forEach((item) => {
      const qEl = item.querySelector(
        "[data-question], .question-text, strong, h4"
      );
      const optionsEls = item.querySelectorAll(
        "[data-option], .option, li, label"
      );

      if (qEl && optionsEls.length >= 2) {
        const q = qEl.textContent.trim();
        const options = Array.from(optionsEls)
          .map((o) => o.textContent.trim())
          .filter((o) => o && o.length > 0)
          .slice(0, 4);

        if (q && options.length >= 2) {
          quizItems.push({
            q,
            options,
            correctIndex: 0, // Default to first option
          });

          console.log(`✅ Quiz: "${q.substring(0, 30)}..."`);
        }
      }
    });

    result.quiz = quizItems;

    // ============ LOG RESULTS ============

    const populatedCount = Object.values(result).filter(
      (v) =>
        (Array.isArray(v) && v.length > 0) ||
        (typeof v === "string" && v.trim().length > 0)
    ).length;

    console.log(`📊 Parse complete: ${populatedCount} fields populated`);

    return result;
  } catch (error) {
    console.error("❌ HTML Parse Error:", error);
    throw error;
  }
};

export default { parseHtmlContent };
