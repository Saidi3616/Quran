const SURAH_LIST_URL = "https://api.alquran.cloud/v1/surah";
const DANISH_EDITIONS_URL = "https://api.alquran.cloud/v1/edition/language/da";
const FALLBACK_TRANSLATION = { identifier: "en.sahih", englishName: "Saheeh International (engelsk)" };

const select = document.getElementById("sura-select");
const suraNameAr = document.getElementById("sura-name-ar");
const suraNameEn = document.getElementById("sura-name-en");
const versesContainer = document.getElementById("verses");
const statusEl = document.getElementById("status");
const translationNoteEl = document.getElementById("translation-note");

let translationEdition = null;

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("status-error", isError);
  statusEl.hidden = !text;
}

function surahTextUrl(number) {
  return `https://api.alquran.cloud/v1/surah/${number}/editions/quran-uthmani,${translationEdition.identifier}`;
}

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

function renderVerses(arabicAyahs, translationAyahs) {
  versesContainer.innerHTML = "";
  arabicAyahs.forEach((ayah, index) => {
    const row = document.createElement("div");
    row.className = "verse";

    const num = document.createElement("span");
    num.className = "verse-num";
    num.textContent = ayah.numberInSurah;

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

    row.appendChild(num);
    row.appendChild(content);
    versesContainer.appendChild(row);
  });
}

async function loadSurah(number) {
  select.disabled = true;
  versesContainer.innerHTML = "";
  setStatus("Henter vers …");

  try {
    const response = await fetch(surahTextUrl(number));
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const json = await response.json();
    const [arabicEdition, translationEditionData] = json.data;

    suraNameAr.textContent = arabicEdition.name;
    suraNameEn.textContent = `${arabicEdition.englishName} — ${arabicEdition.englishNameTranslation}`;

    renderVerses(arabicEdition.ayahs, translationEditionData.ayahs);
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
