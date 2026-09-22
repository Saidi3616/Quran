const SURAH_LIST_URL = "https://api.alquran.cloud/v1/surah";
const DANISH_EDITIONS_URL = "https://api.alquran.cloud/v1/edition/language/da";
const FALLBACK_TRANSLATION = { identifier: "en.sahih", englishName: "Saheeh International (engelsk)" };
const AUDIO_EDITION = "ar.alafasy";

const select = document.getElementById("sura-select");
const suraNameAr = document.getElementById("sura-name-ar");
const suraNameEn = document.getElementById("sura-name-en");
const versesContainer = document.getElementById("verses");
const statusEl = document.getElementById("status");
const translationNoteEl = document.getElementById("translation-note");
const player = document.getElementById("audio-player");
const debugAudioLink = document.getElementById("debug-audio-link");
const masterPlayButton = document.getElementById("play-surah-btn");

let translationEdition = null;
let verseQueue = [];
let currentIndex = -1;
const preloadedAudio = new Map();

let displayMode = "both"; // "arabic" | "english" | "both"
let currentArabicAyahs = [];
let currentTranslationAyahs = [];
let currentAudioAyahs = [];

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
  return `https://api.alquran.cloud/v1/surah/${number}/editions/quran-uthmani,${translationEdition.identifier},${AUDIO_EDITION}`;
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

function stopAudio() {
  player.pause();
  if (currentIndex >= 0 && verseQueue[currentIndex]) {
    setPlayingState(verseQueue[currentIndex].button, false);
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
    setPlayingState(verseQueue[currentIndex].button, false);
  }

  currentIndex = index;
  player.src = entry.url;
  debugAudioLink.href = entry.url;
  setPlayingState(entry.button, true);
  setPlayingState(masterPlayButton, true);
  player.play().catch(() => {
    setStatus("Kunne ikke afspille lyden. Tjek din internetforbindelse.", true);
  });

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

async function resolveTranslationEdition() {
  try {
    const response = await fetch(DANISH_EDITIONS_URL);
    if (response.ok) {
      const json = await response.json();
      const translations = json.data.filter((edition) => edition.type === "translation");
      if (translations.length > 0) {
        translationEdition = translations[0];
        translationNoteEl.hidden = true;
        return;
      }
    }
  } catch (err) {
    // falder igennem til engelsk fallback herunder
  }

  translationEdition = FALLBACK_TRANSLATION;
  translationNoteEl.textContent = `Dansk oversættelse ikke tilgængelig hos denne kilde — viser ${FALLBACK_TRANSLATION.englishName} i stedet.`;
  translationNoteEl.hidden = false;
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
    verseQueue.push({ button: playButton, url: audioUrl });
    playButton.addEventListener("click", () => toggleAudio(index));

    side.appendChild(num);
    side.appendChild(playButton);

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
    para.appendChild(document.createTextNode(`${ayah.text} `));

    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "verse-flow-marker";
    marker.textContent = ayah.numberInSurah;
    marker.setAttribute("aria-label", `Afspil fra vers ${ayah.numberInSurah}`);

    const audioUrl = audioAyahs[index]?.audio;
    verseQueue.push({ button: marker, url: audioUrl });
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

async function loadSurah(number) {
  stopAudio();
  preloadedAudio.clear();
  select.disabled = true;
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

    renderCurrentView();
    setStatus("");
  } catch (err) {
    setStatus("Kunne ikke hente suraen. Tjek din internetforbindelse og prøv igen.", true);
  } finally {
    select.disabled = false;
  }
}

async function loadSurahList() {
  setStatus("Henter liste over suraer …");

  try {
    const response = await fetch(SURAH_LIST_URL);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const json = await response.json();

    json.data.forEach((surah) => {
      const option = document.createElement("option");
      option.value = surah.number;
      option.textContent = `${surah.number}. ${surah.englishName} — ${surah.name}`;
      select.appendChild(option);
    });

    setStatus("");
    select.value = "1";
    loadSurah(1);
  } catch (err) {
    setStatus("Kunne ikke hente listen over suraer. Tjek din internetforbindelse og genindlæs siden.", true);
  }
}

select.addEventListener("change", () => {
  clearSearchResults();
  loadSurah(select.value);
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
  select.value = String(surahNumber);
  await loadSurah(surahNumber);

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
    const url = `https://api.alquran.cloud/v1/search/${encodeURIComponent(keyword)}/all/${translationEdition.identifier}`;
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
  setStatus("Henter oversættelseskilde …");
  await resolveTranslationEdition();
  loadSurahList();
}

init();
