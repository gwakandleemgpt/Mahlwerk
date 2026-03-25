import { loadExhibitData, makeAbsolutePageUrl } from "./shared.js";

const elements = {
  status: document.querySelector("#status"),
  grid: document.querySelector("#qrGrid"),
  printButton: document.querySelector("#printButton"),
  totalCount: document.querySelector("#totalCount"),
};

function createCard(page) {
  const card = document.createElement("article");
  card.className = "qr-card";

  const label = document.createElement("h2");
  label.className = "qr-label";
  label.textContent = page.id;

  const targetUrl = makeAbsolutePageUrl(page.id);
  const image = document.createElement("img");
  image.className = "qr-image";
  image.alt = `${page.id} QR 코드`;
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
  link.textContent = "페이지 열기";

  card.append(label, image, title, link);
  return card;
}

async function initialize() {
  try {
    elements.printButton.addEventListener("click", () => window.print());

    const { flatPages } = await loadExhibitData("description.txt");
    elements.status.hidden = true;

    const fragment = document.createDocumentFragment();
    flatPages.forEach((page) => fragment.appendChild(createCard(page)));
    elements.grid.appendChild(fragment);
    elements.totalCount.textContent = `${flatPages.length}개`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    elements.status.hidden = false;
    elements.status.textContent = `오류: ${message}`;
  }
}

void initialize();
