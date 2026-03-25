import {
  firstExistingAsset,
  getAudioCandidates,
  getImageCandidates,
  groupPagesBySection,
  linkifyText,
  loadExhibitData,
  makeRelativePageUrl,
  parsePageIdFromQuery,
} from "./shared.js";

const appState = {
  flatPages: [],
  sections: [],
  currentIndex: -1,
};

const elements = {
  loading: document.querySelector("#loadingView"),
  error: document.querySelector("#errorView"),
  errorMessage: document.querySelector("#errorMessage"),
  listView: document.querySelector("#listView"),
  pageView: document.querySelector("#pageView"),
  pageLinks: document.querySelector("#pageLinks"),
  pageBreadcrumb: document.querySelector("#pageBreadcrumb"),
  pageTitle: document.querySelector("#pageTitle"),
  pageBody: document.querySelector("#pageBody"),
  imageWrap: document.querySelector("#imageWrap"),
  pageImage: document.querySelector("#pageImage"),
  imageCaption: document.querySelector("#imageCaption"),
  audioPlayer: document.querySelector("#audioPlayer"),
  audioHint: document.querySelector("#audioHint"),
  prevButton: document.querySelector("#prevButton"),
  nextButton: document.querySelector("#nextButton"),
  listButton: document.querySelector("#listButton"),
  floatingPrev: document.querySelector("#floatingPrev"),
  floatingNext: document.querySelector("#floatingNext"),
};

function showOnly(viewName) {
  const names = ["loading", "error", "listView", "pageView"];
  for (const name of names) {
    const node = elements[name];
    if (!node) continue;
    node.hidden = name !== viewName;
  }
}

function setError(message) {
  elements.errorMessage.textContent = message;
  showOnly("error");
}

function updateNavigationButtons(index) {
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < appState.flatPages.length - 1;

  elements.prevButton.disabled = !hasPrev;
  elements.floatingPrev.disabled = !hasPrev;
  elements.nextButton.disabled = !hasNext;
  elements.floatingNext.disabled = !hasNext;
}

async function renderAudio(page) {
  const candidates = getAudioCandidates(page.sectionNumber, page.pageNumber);
  const audioPath = await firstExistingAsset(candidates);

  if (audioPath) {
    elements.audioPlayer.src = audioPath;
    elements.audioPlayer.hidden = false;
    elements.audioHint.hidden = true;
  } else {
    elements.audioPlayer.removeAttribute("src");
    elements.audioPlayer.load();
    elements.audioPlayer.hidden = true;
    elements.audioHint.hidden = false;
  }
}

async function renderImage(page) {
  const candidates = getImageCandidates(page.sectionNumber, page.pageNumber);
  const imagePath = await firstExistingAsset(candidates);

  if (imagePath) {
    elements.pageImage.src = imagePath;
    elements.pageImage.alt = `${page.sectionTitle} ${page.id} ${page.title}`;
    elements.imageCaption.textContent = `이미지 ${page.id}`;
    elements.imageWrap.hidden = false;
  } else {
    elements.pageImage.removeAttribute("src");
    elements.imageWrap.hidden = true;
  }
}

function renderBodyParagraphs(page) {
  if (!page.paragraphs.length) {
    elements.pageBody.innerHTML = "<p>설명이 준비 중입니다.</p>";
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
  link.href = makeRelativePageUrl(page.id);

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
  const grouped = groupPagesBySection(appState.flatPages);
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
  if (index < 0 || index >= appState.flatPages.length) {
    setError("요청한 페이지를 찾을 수 없습니다. 목록에서 다시 선택해 주세요.");
    return;
  }

  const page = appState.flatPages[index];
  appState.currentIndex = index;

  elements.pageBreadcrumb.textContent = `${page.sectionNumber}. ${page.sectionTitle} / ${page.id}`;
  elements.pageTitle.textContent = page.title;
  renderBodyParagraphs(page);
  updateNavigationButtons(index);

  const query = makeRelativePageUrl(page.id);
  if (pushHistory) {
    history.pushState({ pageId: page.id }, "", query);
  }

  showOnly("pageView");

  await Promise.all([renderImage(page), renderAudio(page)]);
}

function showList(pushHistory = true) {
  appState.currentIndex = -1;
  updateNavigationButtons(-1);
  showOnly("listView");
  if (pushHistory) {
    history.pushState({ list: true }, "", window.location.pathname);
  }
}

function connectEvents() {
  const move = (delta) => {
    if (appState.currentIndex < 0) return;
    const next = appState.currentIndex + delta;
    if (next < 0 || next >= appState.flatPages.length) return;
    void showPage(next);
  };

  elements.prevButton.addEventListener("click", () => move(-1));
  elements.floatingPrev.addEventListener("click", () => move(-1));
  elements.nextButton.addEventListener("click", () => move(1));
  elements.floatingNext.addEventListener("click", () => move(1));

  elements.listButton.addEventListener("click", () => showList());

  elements.pageLinks.addEventListener("click", (event) => {
    const anchor = event.target.closest("a.page-link");
    if (!anchor) return;
    event.preventDefault();

    const url = new URL(anchor.href);
    const id = url.searchParams.get("id");
    if (!id) return;

    const index = appState.flatPages.findIndex((page) => page.id === id);
    if (index === -1) return;
    void showPage(index);
  });

  window.addEventListener("popstate", () => {
    const targetId = parsePageIdFromQuery();
    if (!targetId) {
      showList(false);
      return;
    }
    const index = appState.flatPages.findIndex((page) => page.id === targetId);
    if (index === -1) {
      showList(false);
      return;
    }
    void showPage(index, false);
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
    showOnly("loading");
    const { flatPages } = await loadExhibitData("description.txt");

    if (!flatPages.length) {
      setError("전시 설명 데이터를 찾지 못했습니다.");
      return;
    }

    appState.flatPages = flatPages;
    renderListView();
    connectEvents();

    const requestedId = parsePageIdFromQuery();
    if (!requestedId) {
      showList(false);
      return;
    }

    const startIndex = flatPages.findIndex((page) => page.id === requestedId);
    if (startIndex === -1) {
      showList(false);
      return;
    }

    await showPage(startIndex, false);
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    setError(message);
  }
}

void initialize();
