const API_BASE = "https://api.quranhub.com";
const SURAH_LIST_URL = `${API_BASE}/v1/surah`;
const EDITION_LIST_URL = `${API_BASE}/v1/edition`;
const BOOKMARKS_KEY = "quran-app-bookmarks";
const LAST_SURAH_KEY = "quran-app-last-surah";
const LAST_TRANSLATION_KEY = "quran-app-last-translation";
const LAST_RECITER_KEY = "quran-app-last-reciter";
const PREFERRED_RECITER_IDENTIFIER = "ar.alafasy.hafs";

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    // ignore - fx privat browsing hvor lagring er blokeret
  }
}

function loadBookmarks() {
  const raw = safeGetItem(BOOKMARKS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function persistBookmarks() {
  safeSetItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

function getLastSurah() {
  const raw = safeGetItem(LAST_SURAH_KEY);
  if (!raw) return null;
  const number = parseInt(raw, 10);
  return number >= 1 && number <= 114 ? number : null;
}

// --- DOM referencer ---
const searchToggleBtn = document.getElementById("search-toggle-btn");
const searchPanelEl = document.getElementById("search-panel");
const tabBarEl = document.getElementById("tab-bar");
const bookmarksTabBtn = document.getElementById("bookmarks-tab-btn");
const listViewEl = document.getElementById("list-view");
const surahListEl = document.getElementById("surah-list");
const bookmarksListEl = document.getElementById("bookmarks-list");
const readingViewEl = document.getElementById("reading-view");
const backBtn = document.getElementById("back-btn");

const translationSelect = document.getElementById("translation-select");
const reciterSelect = document.getElementById("reciter-select");
const suraNameAr = document.getElementById("sura-name-ar");
const suraNameEn = document.getElementById("sura-name-en");
const versesContainer = document.getElementById("verses");
const statusEl = document.getElementById("status");
const player = document.getElementById("audio-player");
const masterPlayButton = document.getElementById("play-surah-btn");

let translationEditions = [];
let reciterEditions = [];
let selectedTranslation = null; // hele edition-objektet
let selectedReciter = null;

let verseQueue = [];
let currentIndex = -1;
const preloadedAudio = new Map();

let displayMode = "both"; // "arabic" | "english" | "both"
let currentArabicAyahs = [];
let currentTranslationAyahs = [];
let currentAudioAyahs = [];
let currentSurahNumber = null;
let currentSurahEnglishName = "";

let allSurahs = [];
let currentView = "list"; // "list" | "reading"
let currentTab = "surahs"; // "surahs" | "bookmarks"

let bookmarks = loadBookmarks();

function preloadAudio(url) {
  if (!url || preloadedAudio.has(url)) return;
  const audio = new Audio();
  audio.preload = "auto";
  audio.src = url;
  preloadedAudio.set(url, audio);
}

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("status-error", isError);
  statusEl.hidden = !text;
}

function surahTextUrl(number) {
  return `${API_BASE}/v1/surah/${number}/editions/quran-uthmani,${selectedTranslation.identifier},${selectedReciter.identifier}`;
}

function setPlayingState(el, playing) {
  el.classList.toggle("is-playing", playing);
  const playIcon = el.querySelector(".icon-play");
  const pauseIcon = el.querySelector(".icon-pause");
  if (playIcon && pauseIcon) {
    playIcon.classList.toggle("is-hidden", playing);
    pauseIcon.classList.toggle("is-hidden", !playing);
  }
}

function setEntryPlaying(entry, playing) {
  setPlayingState(entry.button, playing);
  if (entry.highlight) {
    entry.highlight.classList.toggle("is-reading", playing);
  }
}

function stopAudio() {
  player.pause();
  if (currentIndex >= 0 && verseQueue[currentIndex]) {
    setEntryPlaying(verseQueue[currentIndex], false);
  }
  currentIndex = -1;
  setPlayingState(masterPlayButton, false);
}

function playAtIndex(index) {
  if (index < 0 || index >= verseQueue.length) {
    stopAudio();
    return;
  }

  const entry = verseQueue[index];
  if (!entry.url) {
    playAtIndex(index + 1); // spring vers uden lyd over
    return;
  }

  if (currentIndex >= 0 && currentIndex !== index && verseQueue[currentIndex]) {
    setEntryPlaying(verseQueue[currentIndex], false);
  }

  currentIndex = index;
  player.src = entry.url;
  setEntryPlaying(entry, true);
  setPlayingState(masterPlayButton, true);
  player.play().catch(() => {
    setStatus("Kunne ikke afspille lyden. Tjek din internetforbindelse.", true);
  });
  entry.highlight?.scrollIntoView({ behavior: "smooth", block: "center" });

  preloadAudio(verseQueue[index + 1]?.url);
}

function toggleAudio(index) {
  if (currentIndex === index) {
    stopAudio();
    return;
  }
  playAtIndex(index);
}

player.addEventListener("ended", () => {
  playAtIndex(currentIndex + 1);
});
player.addEventListener("error", () => {
  if (currentIndex >= 0) {
    setStatus("Kunne ikke afspille lyden for dette vers.", true);
  }
  stopAudio();
});

function dedupeByIdentifier(editions) {
  const seen = new Set();
  return editions.filter((edition) => {
    if (seen.has(edition.identifier)) return false;
    seen.add(edition.identifier);
    return true;
  });
}

function editionLabel(edition) {
  const name = edition.englishName || edition.name || edition.identifier;
  return edition.language ? `${name} (${edition.language})` : name;
}

function populateSelectWithUniqueLabels(selectEl, editions) {
  const counts = new Map();
  editions.forEach((edition) => {
    const label = editionLabel(edition);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  selectEl.innerHTML = "";
  editions.forEach((edition) => {
    const label = editionLabel(edition);
    const isDuplicate = counts.get(label) > 1;

    const option = document.createElement("option");
    option.value = edition.identifier;
    option.textContent = isDuplicate ? `${label} — ${edition.identifier}` : label;
    selectEl.appendChild(option);
  });
}

async function loadEditionCatalog() {
  setStatus("Henter oversættelser og recitere …");

  const response = await fetch(EDITION_LIST_URL);
  if (!response.ok) throw new Error(`Status ${response.status}`);
  const json = await response.json();
  const editions = dedupeByIdentifier(json.data);

  translationEditions = editions
    .filter((edition) => edition.format === "text" && edition.type === "translation")
    .sort((a, b) => editionLabel(a).localeCompare(editionLabel(b)));

  reciterEditions = editions
    .filter((edition) => edition.format === "audio")
    .sort((a, b) => editionLabel(a).localeCompare(editionLabel(b)));

  populateSelectWithUniqueLabels(translationSelect, translationEditions);
  populateSelectWithUniqueLabels(reciterSelect, reciterEditions);

  const lastTranslation = safeGetItem(LAST_TRANSLATION_KEY);
  const danishTranslation = translationEditions.find((e) => e.language === "da");
  selectedTranslation =
    translationEditions.find((e) => e.identifier === lastTranslation) ||
    danishTranslation ||
    translationEditions.find((e) => e.language === "en") ||
    translationEditions[0];

  const lastReciter = safeGetItem(LAST_RECITER_KEY);
  selectedReciter =
    reciterEditions.find((e) => e.identifier === lastReciter) ||
    reciterEditions.find((e) => e.identifier === PREFERRED_RECITER_IDENTIFIER) ||
    reciterEditions[0];

  translationSelect.value = selectedTranslation.identifier;
  reciterSelect.value = selectedReciter.identifier;
  updateSearchPlaceholder();
}

function updateSearchPlaceholder() {
  searchInput.placeholder = `Søg i oversættelsen (${editionLabel(selectedTranslation)}) …`;
}

function renderVerses(arabicAyahs, translationAyahs, audioAyahs) {
  versesContainer.innerHTML = "";
  verseQueue = [];

  arabicAyahs.forEach((ayah, index) => {
    const row = document.createElement("div");
    row.className = "verse";
    row.id = `verse-${ayah.numberInSurah}`;

    const side = document.createElement("div");
    side.className = "verse-side";

    const num = document.createElement("span");
    num.className = "verse-num";
    num.textContent = ayah.numberInSurah;

    const playButton = document.createElement("button");
    playButton.className = "verse-play";
    playButton.type = "button";
    playButton.setAttribute("aria-label", `Afspil fra vers ${ayah.numberInSurah}`);
    playButton.innerHTML = `
      <svg class="icon-play" viewBox="0 0 24 24" width="14" height="14"><path d="M8 5v14l11-7z"/></svg>
      <svg class="icon-pause is-hidden" viewBox="0 0 24 24" width="14" height="14"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
    `;
    const audioUrl = audioAyahs[index]?.audio;
    verseQueue.push({ button: playButton, url: audioUrl, highlight: row });
    playButton.addEventListener("click", () => toggleAudio(index));

    const bookmarkButton = document.createElement("button");
    bookmarkButton.className = "verse-bookmark";
    bookmarkButton.type = "button";
    bookmarkButton.setAttribute("aria-label", `Gem vers ${ayah.numberInSurah} som bogmærke`);
    bookmarkButton.innerHTML = `
      <svg class="icon-outline" viewBox="0 0 24 24" width="14" height="14"><path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z" fill="none"/></svg>
      <svg class="icon-filled is-hidden" viewBox="0 0 24 24" width="14" height="14"><path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z"/></svg>
    `;
    setBookmarkButtonState(bookmarkButton, isBookmarked(currentSurahNumber, ayah.numberInSurah));
    const snippetText = (translationAyahs[index]?.text ?? "").slice(0, 90);
    bookmarkButton.addEventListener("click", () => {
      toggleBookmark(
        {
          surah: currentSurahNumber,
          surahName: currentSurahEnglishName,
          ayah: ayah.numberInSurah,
          snippet: snippetText,
        },
        bookmarkButton
      );
    });

    side.appendChild(num);
    side.appendChild(playButton);
    side.appendChild(bookmarkButton);

    const content = document.createElement("div");
    content.className = "verse-content";

    const arabicText = document.createElement("p");
    arabicText.className = "verse-text";
    arabicText.dir = "rtl";
    arabicText.lang = "ar";
    arabicText.textContent = ayah.text;

    const translationText = document.createElement("p");
    translationText.className = "verse-translation";
    translationText.textContent = translationAyahs[index]?.text ?? "";

    content.appendChild(arabicText);
    content.appendChild(translationText);

    row.appendChild(side);
    row.appendChild(content);
    versesContainer.appendChild(row);
  });
}

function renderFlowing(ayahs, audioAyahs, variant) {
  versesContainer.innerHTML = "";
  verseQueue = [];

  const card = document.createElement("div");
  card.className = "flow-card";

  const para = document.createElement("p");
  para.className = `verse-flow verse-flow-${variant}`;
  if (variant === "arabic") {
    para.dir = "rtl";
    para.lang = "ar";
  } else {
    para.dir = "ltr";
  }

  ayahs.forEach((ayah, index) => {
    const segment = document.createElement("span");
    segment.className = "flow-segment";
    segment.textContent = ayah.text;
    para.appendChild(segment);
    para.appendChild(document.createTextNode(" "));

    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "verse-flow-marker";
    marker.textContent = ayah.numberInSurah;
    marker.setAttribute("aria-label", `Afspil fra vers ${ayah.numberInSurah}`);

    const audioUrl = audioAyahs[index]?.audio;
    verseQueue.push({ button: marker, url: audioUrl, highlight: segment });
    marker.addEventListener("click", () => toggleAudio(index));

    para.appendChild(marker);
    para.appendChild(document.createTextNode(" "));
  });

  card.appendChild(para);
  versesContainer.appendChild(card);
}

function renderCurrentView() {
  if (displayMode === "arabic") {
    renderFlowing(currentArabicAyahs, currentAudioAyahs, "arabic");
  } else if (displayMode === "english") {
    renderFlowing(currentTranslationAyahs, currentAudioAyahs, "english");
  } else {
    renderVerses(currentArabicAyahs, currentTranslationAyahs, currentAudioAyahs);
  }
}

function setMode(mode) {
  displayMode = mode;
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.mode === mode);
  });
}

document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.mode === displayMode) return;
    stopAudio();
    setMode(btn.dataset.mode);
    renderCurrentView();
  });
});

masterPlayButton.addEventListener("click", () => {
  if (currentIndex >= 0) {
    stopAudio();
  } else {
    playAtIndex(0);
  }
});

function isBookmarked(surah, ayah) {
  return bookmarks.some((b) => b.surah === surah && b.ayah === ayah);
}

function setBookmarkButtonState(button, active) {
  button.classList.toggle("is-bookmarked", active);
  button.querySelector(".icon-outline").classList.toggle("is-hidden", active);
  button.querySelector(".icon-filled").classList.toggle("is-hidden", !active);
}

function toggleBookmark(entry, button) {
  const idx = bookmarks.findIndex((b) => b.surah === entry.surah && b.ayah === entry.ayah);
  const nowBookmarked = idx < 0;

  if (nowBookmarked) {
    bookmarks.push(entry);
  } else {
    bookmarks.splice(idx, 1);
  }

  persistBookmarks();
  setBookmarkButtonState(button, nowBookmarked);
  updateBookmarksTabLabel();
  if (currentTab === "bookmarks") renderBookmarksList();
}

function updateBookmarksTabLabel() {
  bookmarksTabBtn.textContent = `Bogmærker (${bookmarks.length})`;
}

function renderBookmarksList() {
  bookmarksListEl.innerHTML = "";

  if (bookmarks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "search-empty";
    empty.textContent = "Du har ingen bogmærker endnu. Tryk på bogmærke-ikonet ved et vers for at gemme det.";
    bookmarksListEl.appendChild(empty);
    return;
  }

  bookmarks.forEach((bookmark) => {
    const item = document.createElement("div");
    item.className = "search-result bookmark-item";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "bookmark-open";

    const meta = document.createElement("span");
    meta.className = "search-result-meta";
    meta.textContent = `${bookmark.surahName} ${bookmark.surah}:${bookmark.ayah}`;

    const snippet = document.createElement("span");
    snippet.className = "search-result-snippet";
    snippet.textContent = bookmark.snippet;

    openBtn.appendChild(meta);
    openBtn.appendChild(snippet);
    openBtn.addEventListener("click", () => goToVerse(bookmark.surah, bookmark.ayah));

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "bookmark-remove";
    removeBtn.setAttribute("aria-label", "Fjern bogmærke");
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      bookmarks = bookmarks.filter((b) => !(b.surah === bookmark.surah && b.ayah === bookmark.ayah));
      persistBookmarks();
      updateBookmarksTabLabel();
      renderBookmarksList();
      if (currentSurahNumber === bookmark.surah) {
        stopAudio();
        renderCurrentView();
      }
    });

    item.appendChild(openBtn);
    item.appendChild(removeBtn);
    bookmarksListEl.appendChild(item);
  });
}

// --- Visninger: liste vs. læsning ---
function showListView() {
  currentView = "list";
  stopAudio();
  listViewEl.hidden = false;
  tabBarEl.hidden = false;
  readingViewEl.hidden = true;
}

function showReadingView() {
  currentView = "reading";
  listViewEl.hidden = true;
  tabBarEl.hidden = true;
  readingViewEl.hidden = false;
}

backBtn.addEventListener("click", showListView);

function setTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", String(active));
  });
  surahListEl.hidden = tab !== "surahs";
  bookmarksListEl.hidden = tab !== "bookmarks";
  if (tab === "bookmarks") renderBookmarksList();
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => setTab(btn.dataset.tab));
});

async function openSurah(number) {
  hideSearchPanel();
  showReadingView();
  await loadSurah(number);
}

async function loadSurah(number) {
  stopAudio();
  preloadedAudio.clear();
  versesContainer.innerHTML = "";
  setStatus("Henter vers …");

  try {
    const response = await fetch(surahTextUrl(number));
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const json = await response.json();
    const [arabicEdition, translationEditionData, audioEditionData] = json.data;

    suraNameAr.textContent = arabicEdition.name;
    suraNameEn.textContent = `${arabicEdition.englishName} — ${arabicEdition.englishNameTranslation}`;

    currentArabicAyahs = arabicEdition.ayahs;
    currentTranslationAyahs = translationEditionData.ayahs;
    currentAudioAyahs = audioEditionData.ayahs;
    currentSurahNumber = arabicEdition.number;
    currentSurahEnglishName = arabicEdition.englishName;
    safeSetItem(LAST_SURAH_KEY, String(currentSurahNumber));

    renderCurrentView();
    setStatus("");
  } catch (err) {
    setStatus("Kunne ikke hente suraen. Tjek din internetforbindelse og prøv igen.", true);
  }
}

function renderSurahList() {
  surahListEl.innerHTML = "";
  const lastSurah = getLastSurah();

  allSurahs.forEach((surah) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "surah-row";
    if (surah.number === lastSurah) {
      row.classList.add("is-last-read");
    }

    const number = document.createElement("span");
    number.className = "surah-row-number";
    number.textContent = surah.number;

    const info = document.createElement("span");
    info.className = "surah-row-info";

    const name = document.createElement("span");
    name.className = "surah-row-name";
    name.textContent = surah.englishName;
    const nameAr = document.createElement("span");
    nameAr.className = "surah-row-name-ar";
    nameAr.dir = "rtl";
    nameAr.textContent = surah.name;
    name.appendChild(nameAr);

    const meta = document.createElement("span");
    meta.className = "surah-row-meta";
    const revelation = surah.revelationType || "";
    const ayahCount = surah.numberOfAyahs != null ? `${surah.numberOfAyahs} vers` : "";
    meta.textContent = [revelation, ayahCount].filter(Boolean).join(" · ");

    info.appendChild(name);
    info.appendChild(meta);

    row.appendChild(number);
    row.appendChild(info);
    row.addEventListener("click", () => openSurah(surah.number));

    surahListEl.appendChild(row);
  });

  const lastRow = surahListEl.querySelector(".is-last-read");
  if (lastRow) lastRow.scrollIntoView({ block: "center" });
}

async function loadSurahList() {
  setStatus("Henter liste over suraer …");

  try {
    const response = await fetch(SURAH_LIST_URL);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const json = await response.json();

    allSurahs = json.data;
    renderSurahList();
    setStatus("");
  } catch (err) {
    setStatus("Kunne ikke hente listen over suraer. Tjek din internetforbindelse og genindlæs siden.", true);
  }
}

translationSelect.addEventListener("change", () => {
  selectedTranslation = translationEditions.find((e) => e.identifier === translationSelect.value);
  safeSetItem(LAST_TRANSLATION_KEY, selectedTranslation.identifier);
  updateSearchPlaceholder();
  clearSearchResults();
  if (currentSurahNumber) loadSurah(currentSurahNumber);
});

reciterSelect.addEventListener("change", () => {
  selectedReciter = reciterEditions.find((e) => e.identifier === reciterSelect.value);
  safeSetItem(LAST_RECITER_KEY, selectedReciter.identifier);
  if (currentSurahNumber) loadSurah(currentSurahNumber);
});

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchResultsEl = document.getElementById("search-results");

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(text, keyword) {
  const pattern = new RegExp(`(${escapeRegExp(keyword)})`, "ig");
  return text.replace(pattern, "<mark>$1</mark>");
}

function clearSearchResults() {
  searchResultsEl.innerHTML = "";
  searchResultsEl.hidden = true;
}

function hideSearchPanel() {
  searchPanelEl.hidden = true;
}

searchToggleBtn.addEventListener("click", () => {
  searchPanelEl.hidden = !searchPanelEl.hidden;
  if (!searchPanelEl.hidden) searchInput.focus();
});

function renderSearchResults(matches, keyword) {
  searchResultsEl.innerHTML = "";
  searchResultsEl.hidden = false;

  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "search-empty";
    empty.textContent = `Ingen vers matcher "${keyword}".`;
    searchResultsEl.appendChild(empty);
    return;
  }

  const count = document.createElement("p");
  count.className = "search-count";
  count.textContent = `${matches.length} vers matcher "${keyword}"`;
  searchResultsEl.appendChild(count);

  matches.forEach((match) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "search-result";

    const meta = document.createElement("span");
    meta.className = "search-result-meta";
    meta.textContent = `${match.surah.englishName} ${match.surah.number}:${match.numberInSurah}`;

    const snippet = document.createElement("span");
    snippet.className = "search-result-snippet";
    snippet.innerHTML = highlightMatch(match.text, keyword);

    item.appendChild(meta);
    item.appendChild(snippet);
    item.addEventListener("click", () => goToVerse(match.surah.number, match.numberInSurah));

    searchResultsEl.appendChild(item);
  });
}

async function goToVerse(surahNumber, numberInSurah) {
  clearSearchResults();
  setMode("both");
  await openSurah(surahNumber);

  const target = document.getElementById(`verse-${numberInSurah}`);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("verse-highlight");
    setTimeout(() => target.classList.remove("verse-highlight"), 2000);
  }
}

async function runSearch(keyword) {
  setStatus(`Søger efter "${keyword}" …`);

  try {
    const url = `${API_BASE}/v1/search/${encodeURIComponent(keyword)}?language=${selectedTranslation.language}`;
    const response = await fetch(url);

    if (response.status === 404) {
      renderSearchResults([], keyword);
      setStatus("");
      return;
    }
    if (!response.ok) throw new Error(`Status ${response.status}`);

    const json = await response.json();
    renderSearchResults(json.data.matches, keyword);
    setStatus("");
  } catch (err) {
    setStatus("Kunne ikke gennemføre søgningen. Tjek din internetforbindelse og prøv igen.", true);
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const keyword = searchInput.value.trim();
  if (!keyword) {
    clearSearchResults();
    return;
  }
  runSearch(keyword);
});

async function init() {
  updateBookmarksTabLabel();
  try {
    await loadEditionCatalog();
    await loadSurahList();
    showListView();
  } catch (err) {
    setStatus("Kunne ikke hente listen over oversættelser og recitere. Tjek din internetforbindelse og genindlæs siden.", true);
  }
}

init();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // stille fejl - appen virker stadig, bare uden offline-understøttelse
    });
  });
}
