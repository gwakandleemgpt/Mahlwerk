import {
  firstExistingAsset,
  getAudioCandidates,
  getImageCandidates,
  groupPagesBySection,
  linkifyText,
  loadExhibitData,
  makeRelativeListUrl,
  makeRelativePageUrl,
  normalizeLanguage,
  parseLanguageFromQuery,
  parsePageIdFromQuery,
} from "./shared.js";

const DATA_FILES = {
  ko: "description.txt",
  en: "description.en.txt",
};

const UI_TEXT = {
  ko: {
    documentTitle: "Mahlwerk 전시 해설",
    metaDescription: "Mahlwerk 전시 해설 페이지",
    heroTitle: "커피 그라인더 전시 설명",
    heroSubtitle: "QR을 스캔하면 각 전시물 설명 페이지로 바로 이동합니다.",
    loading: "설명 데이터를 불러오는 중입니다...",
    errorTitle: "불러오기 오류",
    homeLink: "처음으로 돌아가기",
    listHeading: "전체 설명 목록",
    audioHeading: "오디오 해설",
    audioUnavailable: "이 페이지의 오디오는 준비 중입니다.",
    audioKoreanOnly: "영어 모드에서는 한국어 오디오를 숨깁니다.",
    emptyBody: "설명이 준비 중입니다.",
    prev: "이전",
    next: "다음",
    list: "목록",
    floatingPrev: "이전 페이지",
    floatingNext: "다음 페이지",
    pageNavigation: "페이지 이동",
    audioLabel: "오디오 해설",
    languageSwitch: "언어 전환",
    pageNotFound: "요청한 페이지를 찾을 수 없습니다. 목록에서 다시 선택해 주세요.",
    noData: "전시 설명 데이터를 찾지 못했습니다.",
    unknownError: "알 수 없는 오류가 발생했습니다.",
    imageCaption: (page) => `이미지 ${page.id}`,
    imageAlt: (page) => `${page.sectionTitle} ${page.id} ${page.title}`,
  },
  en: {
    documentTitle: "Mahlwerk Exhibition Guide",
    metaDescription: "Mahlwerk exhibition guide page",
    heroTitle: "Coffee Grinder Exhibition Guide",
    heroSubtitle: "Scan a QR code to jump directly to each exhibit page.",
    loading: "Loading exhibit descriptions...",
    errorTitle: "Load Error",
    homeLink: "Back to home",
    listHeading: "All Exhibit Pages",
    audioHeading: "Audio Guide",
    audioUnavailable: "Audio for this page is not available.",
    audioKoreanOnly: "Audio is only available in Korean, so it is disabled in English mode.",
    emptyBody: "Description coming soon.",
    prev: "Previous",
    next: "Next",
    list: "List",
    floatingPrev: "Previous page",
    floatingNext: "Next page",
    pageNavigation: "Page navigation",
    audioLabel: "Audio guide",
    languageSwitch: "Language switch",
    pageNotFound: "The requested page could not be found. Please choose it again from the list.",
    noData: "No exhibit description data was found.",
    unknownError: "An unknown error occurred.",
    imageCaption: (page) => `Image ${page.id}`,
    imageAlt: (page) => `${page.sectionTitle} ${page.id} ${page.title}`,
  },
};

const NO_DATA_ERROR = "NO_DATA";

const appState = {
  language: normalizeLanguage(parseLanguageFromQuery()),
  dataByLanguage: {
    ko: null,
    en: null,
  },
  loadingByLanguage: {},
  currentPageId: null,
  viewRequestKey: 0,
};

const elements = {
  heroTitle: document.querySelector("#heroTitle"),
  heroSubtitle: document.querySelector("#heroSubtitle"),
  languageSwitch: document.querySelector("#languageSwitch"),
  langKoButton: document.querySelector("#langKoButton"),
  langEnButton: document.querySelector("#langEnButton"),
  loading: document.querySelector("#loadingView"),
  loadingMessage: document.querySelector("#loadingMessage"),
  error: document.querySelector("#errorView"),
  errorTitle: document.querySelector("#errorTitle"),
  errorMessage: document.querySelector("#errorMessage"),
  homeLink: document.querySelector("#homeLink"),
  listView: document.querySelector("#listView"),
  listHeading: document.querySelector("#listHeading"),
  pageView: document.querySelector("#pageView"),
  pageLinks: document.querySelector("#pageLinks"),
  pageBreadcrumb: document.querySelector("#pageBreadcrumb"),
  pageTitle: document.querySelector("#pageTitle"),
  pageBody: document.querySelector("#pageBody"),
  imageWrap: document.querySelector("#imageWrap"),
  pageImage: document.querySelector("#pageImage"),
  imageCaption: document.querySelector("#imageCaption"),
  audioArea: document.querySelector("#audioArea"),
  audioHeading: document.querySelector("#audioHeading"),
  audioPlayer: document.querySelector("#audioPlayer"),
  audioHint: document.querySelector("#audioHint"),
  prevButton: document.querySelector("#prevButton"),
  nextButton: document.querySelector("#nextButton"),
  listButton: document.querySelector("#listButton"),
  bottomNavigation: document.querySelector("#bottomNavigation"),
  floatingPrev: document.querySelector("#floatingPrev"),
  floatingNext: document.querySelector("#floatingNext"),
  metaDescription: document.querySelector('meta[name="description"]'),
};

function getText(language = appState.language) {
  return UI_TEXT[normalizeLanguage(language)];
}

function makeHomeHref(language = appState.language) {
  return normalizeLanguage(language) === "en" ? "./index.html?lang=en" : "./index.html";
}

function getCurrentPages() {
  return appState.dataByLanguage[appState.language]?.flatPages ?? [];
}

function getCurrentIndex() {
  if (!appState.currentPageId) {
    return -1;
  }
  return getCurrentPages().findIndex((page) => page.id === appState.currentPageId);
}

function showOnly(viewName) {
  const names = ["loading", "error", "listView", "pageView"];
  for (const name of names) {
    const node = elements[name];
    if (!node) continue;
    node.hidden = name !== viewName;
  }
}

function resetAudioPlayer() {
  elements.audioPlayer.pause();
  elements.audioPlayer.removeAttribute("src");
  elements.audioPlayer.load();
}

function renderStaticText() {
  const text = getText();

  document.documentElement.lang = appState.language;
  document.body.dataset.language = appState.language;
  document.title = text.documentTitle;

  if (elements.metaDescription) {
    elements.metaDescription.content = text.metaDescription;
  }

  elements.heroTitle.textContent = text.heroTitle;
  elements.heroSubtitle.textContent = text.heroSubtitle;
  elements.loadingMessage.textContent = text.loading;
  elements.errorTitle.textContent = text.errorTitle;
  elements.homeLink.textContent = text.homeLink;
  elements.homeLink.href = makeHomeHref(appState.language);
  elements.listHeading.textContent = text.listHeading;
  elements.audioHeading.textContent = text.audioHeading;
  elements.prevButton.textContent = text.prev;
  elements.nextButton.textContent = text.next;
  elements.listButton.textContent = text.list;
  elements.floatingPrev.setAttribute("aria-label", text.floatingPrev);
  elements.floatingNext.setAttribute("aria-label", text.floatingNext);
  elements.bottomNavigation.setAttribute("aria-label", text.pageNavigation);
  elements.audioArea.setAttribute("aria-label", text.audioLabel);
  elements.languageSwitch.setAttribute("aria-label", text.languageSwitch);

  const isKorean = appState.language === "ko";
  elements.langKoButton.classList.toggle("is-active", isKorean);
  elements.langEnButton.classList.toggle("is-active", !isKorean);
  elements.langKoButton.setAttribute("aria-pressed", String(isKorean));
  elements.langEnButton.setAttribute("aria-pressed", String(!isKorean));
}

function setError(message) {
  elements.errorMessage.textContent = message;
  elements.homeLink.href = makeHomeHref(appState.language);
  showOnly("error");
}

function updateNavigationButtons(index) {
  const pages = getCurrentPages();
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < pages.length - 1;

  elements.prevButton.disabled = !hasPrev;
  elements.floatingPrev.disabled = !hasPrev;
  elements.nextButton.disabled = !hasNext;
  elements.floatingNext.disabled = !hasNext;
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    if (error.message === NO_DATA_ERROR) {
      return getText().noData;
    }
    return error.message;
  }
  return getText().unknownError;
}

async function ensureLanguageData(language) {
  const normalizedLanguage = normalizeLanguage(language);
  if (appState.dataByLanguage[normalizedLanguage]) {
    return appState.dataByLanguage[normalizedLanguage];
  }

  if (!appState.loadingByLanguage[normalizedLanguage]) {
    appState.loadingByLanguage[normalizedLanguage] = loadExhibitData(
      DATA_FILES[normalizedLanguage]
    )
      .then((data) => {
        if (!data.flatPages.length) {
          throw new Error(NO_DATA_ERROR);
        }
        appState.dataByLanguage[normalizedLanguage] = data;
        return data;
      })
      .finally(() => {
        delete appState.loadingByLanguage[normalizedLanguage];
      });
  }

  return appState.loadingByLanguage[normalizedLanguage];
}

async function renderAudio(page, renderKey) {
  const text = getText();

  if (appState.language === "en") {
    if (renderKey !== appState.viewRequestKey) {
      return;
    }
    resetAudioPlayer();
    elements.audioArea.classList.add("is-disabled");
    elements.audioPlayer.hidden = true;
    elements.audioHint.textContent = text.audioKoreanOnly;
    elements.audioHint.hidden = false;
    return;
  }

  const candidates = getAudioCandidates(page.sectionNumber, page.pageNumber);
  const audioPath = await firstExistingAsset(candidates);

  if (renderKey !== appState.viewRequestKey) {
    return;
  }

  elements.audioArea.classList.remove("is-disabled");

  if (audioPath) {
    elements.audioPlayer.src = audioPath;
    elements.audioPlayer.hidden = false;
    elements.audioHint.hidden = true;
  } else {
    resetAudioPlayer();
    elements.audioPlayer.hidden = true;
    elements.audioHint.textContent = text.audioUnavailable;
    elements.audioHint.hidden = false;
  }
}

async function renderImage(page, renderKey) {
  const candidates = getImageCandidates(page.sectionNumber, page.pageNumber);
  const imagePath = await firstExistingAsset(candidates);

  if (renderKey !== appState.viewRequestKey) {
    return;
  }

  if (imagePath) {
    elements.pageImage.src = imagePath;
    elements.pageImage.alt = getText().imageAlt(page);
    elements.imageCaption.textContent = getText().imageCaption(page);
    elements.imageWrap.hidden = false;
  } else {
    elements.pageImage.removeAttribute("src");
    elements.imageWrap.hidden = true;
  }
}

function renderBodyParagraphs(page) {
  const text = getText();

  if (!page.paragraphs.length) {
    elements.pageBody.innerHTML = `<p>${text.emptyBody}</p>`;
    return;
  }

  const html = page.paragraphs
    .map((paragraph) => `<p>${linkifyText(paragraph)}</p>`)
    .join("");

  elements.pageBody.innerHTML = html;
}

function makePageCard(page) {
  const link = document.createElement("a");
  link.className = "page-link";
  link.href = makeRelativePageUrl(page.id, appState.language);

  const id = document.createElement("span");
  id.className = "page-id";
  id.textContent = page.id;

  const title = document.createElement("span");
  title.className = "page-link-title";
  title.textContent = page.title;

  link.append(id, title);
  return link;
}

function renderListView() {
  const grouped = groupPagesBySection(getCurrentPages());
  const fragment = document.createDocumentFragment();

  for (const section of grouped) {
    const box = document.createElement("section");
    box.className = "section-box";

    const header = document.createElement("h3");
    header.textContent = `${section.number}. ${section.title}`;

    const list = document.createElement("div");
    list.className = "section-pages";
    section.pages.forEach((page) => {
      list.appendChild(makePageCard(page));
    });

    box.append(header, list);
    fragment.appendChild(box);
  }

  elements.pageLinks.innerHTML = "";
  elements.pageLinks.appendChild(fragment);
}

async function showPage(index, pushHistory = true) {
  const pages = getCurrentPages();
  if (index < 0 || index >= pages.length) {
    setError(getText().pageNotFound);
    return;
  }

  const page = pages[index];
  appState.currentPageId = page.id;
  appState.viewRequestKey += 1;
  const renderKey = appState.viewRequestKey;

  elements.pageBreadcrumb.textContent = `${page.sectionNumber}. ${page.sectionTitle} / ${page.id}`;
  elements.pageTitle.textContent = page.title;
  renderBodyParagraphs(page);
  updateNavigationButtons(index);

  if (pushHistory) {
    history.pushState(
      { pageId: page.id, language: appState.language },
      "",
      makeRelativePageUrl(page.id, appState.language)
    );
  }

  showOnly("pageView");

  await Promise.all([renderImage(page, renderKey), renderAudio(page, renderKey)]);
}

function showList(pushHistory = true) {
  appState.currentPageId = null;
  appState.viewRequestKey += 1;
  resetAudioPlayer();
  renderListView();
  updateNavigationButtons(-1);
  showOnly("listView");

  if (pushHistory) {
    history.pushState(
      { list: true, language: appState.language },
      "",
      makeRelativeListUrl(appState.language)
    );
  }
}

async function routeFromUrl(pushHistory = false) {
  const requestedLanguage = normalizeLanguage(parseLanguageFromQuery());
  const isLanguageChange = requestedLanguage !== appState.language;

  if (isLanguageChange && !appState.dataByLanguage[requestedLanguage]) {
    appState.language = requestedLanguage;
    renderStaticText();
    showOnly("loading");
  }

  await ensureLanguageData(requestedLanguage);
  appState.language = requestedLanguage;
  renderStaticText();

  const requestedId = parsePageIdFromQuery();
  if (!requestedId) {
    showList(pushHistory);
    return;
  }

  renderListView();
  const startIndex = getCurrentPages().findIndex((page) => page.id === requestedId);
  if (startIndex === -1) {
    showList(pushHistory);
    return;
  }

  await showPage(startIndex, pushHistory);
}

async function switchLanguage(language) {
  const nextLanguage = normalizeLanguage(language);
  if (nextLanguage === appState.language) {
    return;
  }

  const targetPageId = appState.currentPageId;

  try {
    if (!appState.dataByLanguage[nextLanguage]) {
      appState.language = nextLanguage;
      renderStaticText();
      showOnly("loading");
      await ensureLanguageData(nextLanguage);
    }

    appState.language = nextLanguage;
    renderStaticText();
    renderListView();

    if (targetPageId) {
      const nextIndex = getCurrentPages().findIndex((page) => page.id === targetPageId);
      if (nextIndex !== -1) {
        await showPage(nextIndex, true);
        return;
      }
    }

    showList(true);
  } catch (error) {
    setError(getErrorMessage(error));
  }
}

function connectEvents() {
  const move = (delta) => {
    const currentIndex = getCurrentIndex();
    if (currentIndex < 0) return;

    const next = currentIndex + delta;
    if (next < 0 || next >= getCurrentPages().length) return;
    void showPage(next);
  };

  elements.prevButton.addEventListener("click", () => move(-1));
  elements.floatingPrev.addEventListener("click", () => move(-1));
  elements.nextButton.addEventListener("click", () => move(1));
  elements.floatingNext.addEventListener("click", () => move(1));
  elements.listButton.addEventListener("click", () => showList());

  elements.langKoButton.addEventListener("click", () => {
    void switchLanguage("ko");
  });
  elements.langEnButton.addEventListener("click", () => {
    void switchLanguage("en");
  });

  elements.pageLinks.addEventListener("click", (event) => {
    const anchor = event.target.closest("a.page-link");
    if (!anchor) return;
    event.preventDefault();

    const url = new URL(anchor.href);
    const id = url.searchParams.get("id");
    if (!id) return;

    const index = getCurrentPages().findIndex((page) => page.id === id);
    if (index === -1) return;
    void showPage(index);
  });

  window.addEventListener("popstate", () => {
    void routeFromUrl(false);
  });

  window.addEventListener("keydown", (event) => {
    if (elements.pageView.hidden) return;
    if (event.key === "ArrowLeft") {
      move(-1);
    }
    if (event.key === "ArrowRight") {
      move(1);
    }
  });
}

async function initialize() {
  try {
    renderStaticText();
    showOnly("loading");
    await ensureLanguageData(appState.language);
    connectEvents();
    await routeFromUrl(false);

    const backgroundLanguage = appState.language === "ko" ? "en" : "ko";
    void ensureLanguageData(backgroundLanguage);
  } catch (error) {
    renderStaticText();
    setError(getErrorMessage(error));
  }
}

void initialize();
