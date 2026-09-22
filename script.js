const SURAH_LIST_URL = "https://api.alquran.cloud/v1/surah";
const surahTextUrl = (number) => `https://api.alquran.cloud/v1/surah/${number}`;

const select = document.getElementById("sura-select");
const suraNameAr = document.getElementById("sura-name-ar");
const suraNameEn = document.getElementById("sura-name-en");
const versesContainer = document.getElementById("verses");
const statusEl = document.getElementById("status");

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("status-error", isError);
  statusEl.hidden = !text;
}

function renderVerses(ayahs) {
  versesContainer.innerHTML = "";
  ayahs.forEach((ayah) => {
    const row = document.createElement("div");
    row.className = "verse";

    const num = document.createElement("span");
    num.className = "verse-num";
    num.textContent = ayah.numberInSurah;

    const text = document.createElement("p");
    text.className = "verse-text";
    text.dir = "rtl";
    text.lang = "ar";
    text.textContent = ayah.text;

    row.appendChild(num);
    row.appendChild(text);
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
    const surah = json.data;

    suraNameAr.textContent = surah.name;
    suraNameEn.textContent = `${surah.englishName} — ${surah.englishNameTranslation}`;

    renderVerses(surah.ayahs);
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

loadSurahList();
