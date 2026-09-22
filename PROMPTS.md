# Prompt-guide — Koran App

Iterative prompts til hvert af de 13 byggetrin. Kopiér ét ad gangen, i den
rækkefølge vi bygger. "Kontekst" refererer altid til det forrige trin.

Se den fulde visuelle byggeplan her:
https://claude.ai/artifact/3idHVxSCE4oTjqfQG6U5ux

## Prompt-teknik

- **Ét trin ad gangen** — aldrig flere trin i samme prompt.
- **Beskriv resultatet, ikke løsningen** — hvad du vil se/kunne gøre, ikke
  hvordan koden skal skrives.
- **Konkret frem for vagt** — nævn hvad du ser og hvad der skal ske.
- **Referér til det der allerede findes** i stedet for at starte forfra.

Skabelon:

```
Kontekst: [hvad findes allerede, som er relevant]
Ønske: [hvad skal ske / hvad skal jeg kunne]
Ikke: [noget der ikke må ændres, hvis relevant]
Test: [hvordan du vil afprøve at det virker]
```

---

## Fase 1 — Byg fundamentet

### Trin 1 — Vis én sura
> Kontekst: intet er bygget endnu, det er første trin.
> Ønske: en side der viser sura Al-Fatiha med alle vers, hvert vers med sit
> versnummer ved siden af.
> Test: jeg vil kunne læse alle vers tydeligt uden at noget klipper eller
> overlapper.

### Trin 2 — Naviger mellem suraer
> Kontekst: vi har en side der viser én sura.
> Ønske: en liste eller menu med alle 114 suraer, så jeg kan vælge hvilken
> jeg vil læse, og teksten hentes automatisk.
> Test: jeg vil kunne skifte mellem mindst tre forskellige suraer og se
> rigtig tekst hver gang.

### Trin 3 — Dansk oversættelse
> Kontekst: vi kan navigere mellem suraer og se arabisk tekst.
> Ønske: hvert vers skal også vise en dansk oversættelse, tydeligt adskilt
> fra den arabiske tekst.
> Test: jeg vil kunne læse begge sprog uden at være i tvivl om hvilket vers
> de hører til.

### Trin 4 — Lyd
> Kontekst: vi kan læse vers på arabisk og dansk.
> Ønske: en afspilningsknap ved hvert vers, så jeg kan høre recitationen af
> det specifikke vers.
> Test: jeg trykker på ét vers og hører kun det vers, ikke hele suraen.

### Trin 5 — Søgning
> Kontekst: vi kan læse og lytte til vers.
> Ønske: et søgefelt hvor jeg skriver et ord og får vist alle vers der
> indeholder det.
> Test: jeg søger på et ord jeg ved findes, og får relevante vers tilbage —
> og en tydelig besked hvis intet matcher.

### Trin 6 — Bogmærker
> Kontekst: vi kan søge og navigere frit.
> Ønske: en knap ved hvert vers til at gemme det som favorit, og en
> oversigt over mine gemte vers.
> Test: jeg gemmer et vers, lukker browseren, åbner appen igen — og
> bogmærket er der stadig.

## Fase 2 — Gør den klar til andre

### Trin 7 — Design-finish
> Kontekst: alle kernefunktioner virker nu.
> Ønske: gennemgå udseendet — typografi, farver, mellemrum, og at det ser
> lige så godt ud på mobil som computer.
> Test: jeg åbner appen på min telefon og alt er letlæseligt og let at
> trykke på.

### Trin 8 — Gør den installerbar
> Kontekst: appen er visuelt færdig.
> Ønske: jeg vil kunne "installere" appen på min telefons hjemmeskærm og
> have adgang til det jeg allerede har åbnet, selv uden internet.
> Test: jeg installerer den, slår wifi/data fra, og kan stadig åbne suraer
> jeg har besøgt før.

### Trin 9 — Host den online
> Kontekst: appen er installerbar lokalt.
> Ønske: en rigtig webadresse jeg kan dele med andre, så den ikke kun
> findes på min egen computer.
> Test: jeg sender linket til nogen andre, og de kan åbne appen selv.

## Fase 3 — Udgiv i Play Store

### Trin 10 — Pak til Android-app
> Kontekst: appen kører på sin egen webadresse.
> Ønske: hjælp mig med at pakke den til en installerbar Android-app-fil.
> Test: jeg har en .aab-fil klar til upload.

### Trin 11 — Play-konto & info
> Kontekst: app-filen er klar.
> Ønske: guide mig gennem oprettelse af udvikler-konto, og hvad jeg skal
> skrive/udfylde (beskrivelse, privatlivspolitik, ikon, skærmbilleder).
> Test: alle påkrævede felter i Play Console er udfyldt uden fejlmarkeringer.

### Trin 12 — Indsend & publicér
> Kontekst: alt er udfyldt og klar.
> Ønske: hjælp mig med at sende appen til review, og forklar hvad jeg skal
> holde øje med undervejs.
> Test: appen er synlig og downloadbar i Play Store.

## Fase 4 — Efter lancering

### Trin 13 — Vedligehold
> Kontekst: appen er live.
> Ønske: [indsæt konkret fejl/feedback du har modtaget eller opdaget].
> Test: [beskriv hvordan du vil vide at det er rettet].
