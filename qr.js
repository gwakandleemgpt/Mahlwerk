import { loadExhibitData, makeAbsolutePageUrl } from "./shared.js";

const DATA_FILE = "description.txt";

const UI_TEXT = {
  documentTitle: "Mahlwerk 관리자용 QR 코드 인쇄",
  metaDescription: "Mahlwerk 관리자용 QR 코드 인쇄 페이지",
  headerTitle: "관리자용 전시 QR 코드 인쇄",
  headerDesc:
    "관리자용 페이지입니다. QR 상단 번호(예: 3-1)를 기준으로 전시물 하단 라벨과 맞춰 붙이면 됩니다.",
  count: (count) => `총 ${count}개`,
  print: "인쇄",
  backLink: "목차 페이지로 이동",
  loading: "QR 목록을 준비 중입니다...",
  openPage: "설명 페이지 열기",
  errorPrefix: "오류",
  imageAlt: (id) => `${id} QR 코드`,
  gridLabel: "QR 코드 목록",
  unknownError: "알 수 없는 오류가 발생했습니다.",
};

const elements = {
  headerTitle: document.querySelector("#headerTitle"),
  headerDesc: document.querySelector("#headerDesc"),
  countLine: document.querySelector("#countLine"),
  status: document.querySelector("#status"),
  grid: document.querySelector("#qrGrid"),
  printButton: document.querySelector("#printButton"),
  backLink: document.querySelector("#backLink"),
  metaDescription: document.querySelector('meta[name="description"]'),
};

function renderStaticText() {
  document.documentElement.lang = "ko";
  document.title = UI_TEXT.documentTitle;

  if (elements.metaDescription) {
    elements.metaDescription.content = UI_TEXT.metaDescription;
  }

  elements.headerTitle.textContent = UI_TEXT.headerTitle;
  elements.headerDesc.textContent = UI_TEXT.headerDesc;
  elements.countLine.textContent = UI_TEXT.count(0);
  elements.printButton.textContent = UI_TEXT.print;
  elements.backLink.textContent = UI_TEXT.backLink;
  elements.backLink.href = "./index.html";
  elements.status.textContent = UI_TEXT.loading;
  elements.grid.setAttribute("aria-label", UI_TEXT.gridLabel);
}

function createCard(page) {
  const card = document.createElement("article");
  card.className = "qr-card";

  const label = document.createElement("h2");
  label.className = "qr-label";
  label.textContent = page.id;

  const targetUrl = makeAbsolutePageUrl(page.id);
  const image = document.createElement("img");
  image.className = "qr-image";
  image.alt = UI_TEXT.imageAlt(page.id);
  image.loading = "lazy";
  image.src = `https://api.qrserver.com/v1/create-qr-code/?size=540x540&margin=12&data=${encodeURIComponent(targetUrl)}`;

  const title = document.createElement("p");
  title.className = "qr-title";
  title.textContent = page.title;

  const link = document.createElement("a");
  link.className = "qr-link";
  link.href = targetUrl;
  link.target = "_blank";
  link.rel = "noreferrer noopener";
  link.textContent = UI_TEXT.openPage;

  card.append(label, image, title, link);
  return card;
}

async function initialize() {
  try {
    renderStaticText();
    elements.printButton.addEventListener("click", () => window.print());

    const { flatPages } = await loadExhibitData(DATA_FILE);
    elements.status.hidden = true;

    const fragment = document.createDocumentFragment();
    flatPages.forEach((page) => fragment.appendChild(createCard(page)));
    elements.grid.appendChild(fragment);
    elements.countLine.textContent = UI_TEXT.count(flatPages.length);
  } catch (error) {
    const message = error instanceof Error ? error.message : UI_TEXT.unknownError;
    elements.status.hidden = false;
    elements.status.textContent = `${UI_TEXT.errorPrefix}: ${message}`;
  }
}

void initialize();
