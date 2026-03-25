const SECTION_TITLE_VARIANTS = [
  ["전시물 소개", "Exhibition Highlights"],
  ["커피그라인더의 형태적 분류", "Types of Coffee Grinders"],
  ["개별 그라인더", "Individual Grinders"],
];

const SUPPORTED_LANGUAGES = new Set(["ko", "en"]);
const pageHeadingPattern = /^(\d{1,2})\.\s*(.+)$/;
const assetAvailabilityCache = new Map();
const sectionIndexByTitle = new Map(
  SECTION_TITLE_VARIANTS.flatMap((titles, index) =>
    titles.map((title) => [title, index + 1])
  )
);

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function normalizeLanguage(value) {
  return SUPPORTED_LANGUAGES.has(value) ? value : "ko";
}

export function parseLanguageFromQuery(search = window.location.search) {
  const params = new URLSearchParams(search);
  return normalizeLanguage(params.get("lang"));
}

export function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function linkifyText(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noreferrer noopener">$1</a>'
  );
}

function finalizePage(page) {
  const normalized = normalizeNewlines(page.rawBody.join("\n")).trim();
  const paragraphs = normalized
    ? normalized
        .split(/\n\s*\n/g)
        .map((block) => block.replace(/\n+/g, " ").trim())
        .filter(Boolean)
    : [];

  return {
    sectionNumber: page.sectionNumber,
    sectionTitle: page.sectionTitle,
    pageNumber: page.pageNumber,
    title: page.title,
    id: `${page.sectionNumber}-${page.pageNumber}`,
    paragraphs,
  };
}

export function parseDescriptionText(rawText) {
  const lines = normalizeNewlines(rawText).split("\n");
  const sections = [];
  let currentSection = null;
  let currentPage = null;

  const flushPage = () => {
    if (!currentPage || !currentSection) {
      return;
    }
    currentSection.pages.push(finalizePage(currentPage));
    currentPage = null;
  };

  const flushSection = () => {
    flushPage();
    if (!currentSection) {
      return;
    }
    sections.push(currentSection);
    currentSection = null;
  };

  for (const originalLine of lines) {
    const line = originalLine.trim();

    if (!line) {
      if (currentPage) {
        currentPage.rawBody.push("");
      }
      continue;
    }

    const sectionNumber = sectionIndexByTitle.get(line);
    if (sectionNumber) {
      flushSection();
      currentSection = {
        title: line,
        number: sectionNumber,
        pages: [],
      };
      continue;
    }

    const matchedPage = line.match(pageHeadingPattern);
    if (matchedPage && currentSection) {
      flushPage();
      currentPage = {
        sectionNumber: currentSection.number,
        sectionTitle: currentSection.title,
        pageNumber: Number.parseInt(matchedPage[1], 10),
        title: matchedPage[2].trim(),
        rawBody: [],
      };
      continue;
    }

    if (currentPage) {
      currentPage.rawBody.push(line);
    }
  }

  flushSection();

  const flatPages = sections
    .flatMap((section) => section.pages)
    .sort((a, b) => {
      if (a.sectionNumber !== b.sectionNumber) {
        return a.sectionNumber - b.sectionNumber;
      }
      return a.pageNumber - b.pageNumber;
    });

  return { sections, flatPages };
}

export async function loadDescription(path = "description.txt") {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.text();
}

export async function loadExhibitData(path = "description.txt") {
  const rawText = await loadDescription(path);
  return parseDescriptionText(rawText);
}

function normalizeAssetPath(path) {
  if (path.startsWith("/")) {
    return path;
  }
  return `./${path}`;
}

async function existsAsset(path) {
  const normalized = normalizeAssetPath(path);
  if (assetAvailabilityCache.has(normalized)) {
    return assetAvailabilityCache.get(normalized);
  }

  try {
    const response = await fetch(normalized, { method: "HEAD", cache: "no-store" });
    const available = response.ok;
    assetAvailabilityCache.set(normalized, available);
    return available;
  } catch {
    assetAvailabilityCache.set(normalized, false);
    return false;
  }
}

export async function firstExistingAsset(paths) {
  for (const path of paths) {
    if (await existsAsset(path)) {
      return normalizeAssetPath(path);
    }
  }
  return null;
}

export function getImageCandidates(sectionNumber, pageNumber) {
  const candidates = [];

  if (sectionNumber === 1) {
    candidates.push(`images/image${String(pageNumber).padStart(2, "0")}.png`);
    candidates.push(`images/image1-${pageNumber}.png`);
  } else {
    candidates.push(`images/image${sectionNumber}-${pageNumber}.png`);
  }

  candidates.push(`images/image${sectionNumber}${String(pageNumber).padStart(2, "0")}.png`);
  return candidates;
}

export function getAudioCandidates(sectionNumber, pageNumber) {
  return [
    `audio/${sectionNumber}-${pageNumber}.wav`,
    `audio/${sectionNumber}-${pageNumber}.mp3`,
    `audio/${sectionNumber}-${pageNumber}.m4a`,
    `audio/${sectionNumber}-${pageNumber}.ogg`,
  ];
}

export function parsePageIdFromQuery(search = window.location.search) {
  const params = new URLSearchParams(search);

  const directId = params.get("id");
  if (directId && /^\d+-\d+$/.test(directId)) {
    const [sectionRaw, pageRaw] = directId.split("-");
    return `${Number.parseInt(sectionRaw, 10)}-${Number.parseInt(pageRaw, 10)}`;
  }

  const sectionRaw = params.get("s");
  const pageRaw = params.get("p");
  if (sectionRaw && pageRaw && /^\d+$/.test(sectionRaw) && /^\d+$/.test(pageRaw)) {
    return `${Number.parseInt(sectionRaw, 10)}-${Number.parseInt(pageRaw, 10)}`;
  }

  return null;
}

function makeQueryString({ id = null, language = "ko" } = {}) {
  const params = new URLSearchParams();
  const normalizedLanguage = normalizeLanguage(language);

  if (normalizedLanguage === "en") {
    params.set("lang", "en");
  }
  if (id) {
    params.set("id", id);
  }

  return params.toString();
}

export function makeRelativePageUrl(id, language = "ko") {
  const query = makeQueryString({ id, language });
  return query ? `?${query}` : "?";
}

export function makeRelativeListUrl(language = "ko", path = window.location.pathname) {
  const query = makeQueryString({ language });
  return query ? `${path}?${query}` : path;
}

export function makeAbsolutePageUrl(id, language = "ko") {
  const indexPath = window.location.pathname.replace(/\/[^/]*$/, "/index.html");
  const url = new URL(indexPath, window.location.origin);

  if (normalizeLanguage(language) === "en") {
    url.searchParams.set("lang", "en");
  }
  url.searchParams.set("id", id);

  return url.toString();
}

export function groupPagesBySection(flatPages) {
  const grouped = new Map();
  for (const page of flatPages) {
    if (!grouped.has(page.sectionNumber)) {
      grouped.set(page.sectionNumber, {
        number: page.sectionNumber,
        title: page.sectionTitle,
        pages: [],
      });
    }
    grouped.get(page.sectionNumber).pages.push(page);
  }
  return [...grouped.values()].sort((a, b) => a.number - b.number);
}
