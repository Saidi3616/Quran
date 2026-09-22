const verses = [
  { number: 1, arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
  { number: 2, arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
  { number: 3, arabic: "الرَّحْمَٰنِ الرَّحِيمِ" },
  { number: 4, arabic: "مَالِكِ يَوْمِ الدِّينِ" },
  { number: 5, arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
  { number: 6, arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ" },
  { number: 7, arabic: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ" },
];

const versesContainer = document.getElementById("verses");

verses.forEach((verse) => {
  const row = document.createElement("div");
  row.className = "verse";

  const num = document.createElement("span");
  num.className = "verse-num";
  num.textContent = verse.number;

  const text = document.createElement("p");
  text.className = "verse-text";
  text.dir = "rtl";
  text.lang = "ar";
  text.textContent = verse.arabic;

  row.appendChild(num);
  row.appendChild(text);
  versesContainer.appendChild(row);
});
