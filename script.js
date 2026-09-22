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

let translationEdition = null;
let currentPlayButton = null;

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("status-error", isError);
  statusEl.hidden = !text;
}

function surahTextUrl(number) {
  return `https://api.alquran.cloud/v1/surah/${number}/editions/quran-uthmani,${translationEdition.identifier},${AUDIO_EDITION}`;
}

function setButtonPlaying(button, playing) {
  button.querySelector(".icon-play").classList.toggle("is-hidden", playing);
  button.querySelector(".icon-pause").classList.toggle("is-hidden", !playing);
  button.classList.toggle("is-playing", playing);
}

function stopAudio() {
  player.pause();
  if (currentPlayButton) {
    setButtonPlaying(currentPlayButton, false);
    currentPlayButton = null;
  }
}

function toggleAudio(button, url) {
  if (currentPlayButton === button) {
    stopAudio();
    return;
  }
  stopAudio();
  if (!url) {
    setStatus("Ingen lyd tilgængelig for dette vers.", true);
    return;
  }
  player.src = url;
  debugAudioLink.href = url;
  player.play().catch(() => {
    setStatus("Kunne ikke afspille lyden. Tjek din internetforbindelse.", true);
  });
  currentPlayButton = button;
  setButtonPlaying(button, true);
}

player.addEventListener("ended", stopAudio);
player.addEventListener("error", () => {
  if (currentPlayButton) {
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
  arabicAyahs.forEach((ayah, index) => {
    const row = document.createElement("div");
    row.className = "verse";

    const side = document.createElement("div");
    side.className = "verse-side";

    const num = document.createElement("span");
    num.className = "verse-num";
    num.textContent = ayah.numberInSurah;

    const playButton = document.createElement("button");
    playButton.className = "verse-play";
    playButton.type = "button";
    playButton.setAttribute("aria-label", `Afspil vers ${ayah.numberInSurah}`);
    playButton.innerHTML = `
      <svg class="icon-play" viewBox="0 0 24 24" width="14" height="14"><path d="M8 5v14l11-7z"/></svg>
      <svg class="icon-pause is-hidden" viewBox="0 0 24 24" width="14" height="14"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
    `;
    const audioUrl = audioAyahs[index]?.audio;
    playButton.addEventListener("click", () => toggleAudio(playButton, audioUrl));

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

async function loadSurah(number) {
  stopAudio();
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

    renderVerses(arabicEdition.ayahs, translationEditionData.ayahs, audioEditionData.ayahs);
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
  loadSurah(select.value);
});

async function init() {
  setStatus("Henter oversættelseskilde …");
  await resolveTranslationEdition();
  loadSurahList();
}

init();
