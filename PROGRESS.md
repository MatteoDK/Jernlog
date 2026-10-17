# Matteos Jernlog — status

Sidst opdateret: 2026-08-11

## Opdatering 2026-10-17 (26. runde — programmer med træninger i, to faneniveauer)

**Hvad:** Øvelser/Mit program har nu to niveauer. Øverst vælger man PROGRAM (egne navne, fx "Push Pull Legs", "Upper/Lower") eller "Øvrige". Under det vælger man TRÆNING i det program (fx Push, Pull, Ben, Push 2…). Hver træning har sin egen øvelsesliste (på tværs af muskelgrupper), "Rediger" med flueben, træk-for-rækkefølge og swipe-for-fjern som før. "Administrer programmer" kan tilføje/omdøbe/slette både programmer og træninger. Op til 62 træninger i alt.

**Teknisk:** `profiles.programs` (jsonb) har nu formen `[{id:"p1",name:"PPL",workouts:[{id:"a",name:"Push"},...]}]`. Standard (ingen data) = ét program "Program 1" med træningerne a "Træning 1" og b "Træning 2" (så eksisterende `exercises.variant`-værdier a/b virker uændret). Det flade format fra 24. runde læses stadig (bliver til ét program "Mit program"). `exercises.variant` er en tekst af træning-tegn (a-z, A-Z, 0-9), unikke på tværs af programmer. Nye hjælpere: `getPrograms()`, `getWorkouts()`, `workoutName()`, `normalizeVariant()`. `state.exercisesProgram` + `state.exercisesTab`. Ingen databaseændring ud over kolonnen fra 24. runde. Tests: 45 tjek, alle bestået; visuelt tjekket i mobilvisning.

**Bemærk:** Eksisterende øvelser, der lå i Program 1/2 (a/b), ligger nu i "Træning 1/2" i det ene standardprogram — Matteo skal selv fordele dem på de nye træninger via Rediger.

**Skal uploades til GitHub:** `app-core.js`, `app-exercises.js`, `app-log.js`, `styles.css`, `tests.js`, `PROGRESS.md`.

## Opdatering 2026-10-17 (25. runde — programmer som faner, muskelgruppe-faner fjernet)

**Hvad:** På Øvelser/Mit program er fanerne Ryg/Bryst/Ben (og "Gruppe 1/2/3" + knappen "Rediger grupperinger") fjernet. I stedet er der én fane pr. program (dine egne navne, fx Upper/Lower) + en fane "Øvrige". Hver fane viser programmets øvelser i én liste på tværs af muskelgrupper. "Rediger" på et program viser alle øvelser (sorteret efter muskelgruppe) med flueben. Onboarding-punktet om egne muskelgrupper er fjernet. `openGroupLayoutModal()` er slettet; `getEffectiveGroups()`/`profiles.group_layout` bruges stadig internt til "Foreslået i dag" og muskelgruppe-valg, men kan ikke længere ændres i UI'et. `state.exercisesTab` er nu et program-bogstav eller "other" (før et tal). Tests: 44 tjek, alle bestået.

**Skal uploades til GitHub:** `app-core.js`, `app-exercises.js`, `styles.css`, `tests.js`, `PROGRESS.md`. Ingen databaseændring.

## Opdatering 2026-10-17 (24. runde — så mange programmer man vil på Øvelser/Mit program)

**Hvad:** Før var der fast Program 1 og Program 2. Nu kan man under "Øvelser/Mit program" trykke **Administrer programmer** og selv tilføje, omdøbe og slette programmer (op til 26), fx ét pr. træningsdag. Alle programmer vises som egne lister under hver muskelgruppe-fane, og en øvelse kan være med i flere programmer. Slettes et program, flyttes dets øvelser til Øvrige øvelser (eller bliver i de andre programmer de også er med i). Add/rediger-øvelse-vinduet har nu et valg pr. program (flere kan vælges samtidig, i stedet for Program 1 / Program 2 / Begge).

**Teknisk:** Programmerne gemmes i ny kolonne `profiles.programs` (jsonb: `[{id:"a",name:"Push"},...]`, NULL = standard Program 1+2, så ingen eksisterende bruger ændres). `exercises.variant` er uændret: en tekst af program-bogstaver (fx "ab"). Nye hjælpere i `app-core.js`: `getPrograms()`, `programName()`, `normalizeVariant()`. Nyt `openProgramsModal()` i `app-exercises.js`. 11 nye tests i `tests.js` (41 tjek i alt, alle bestået).

**Skal køres i Supabase FØR upload:** `supabase-migration-programs.sql` (`alter table profiles add column if not exists programs jsonb;`).
**Skal uploades til GitHub:** `app-core.js`, `app-exercises.js`, `app-log.js`, `tests.js`, `supabase-migration-programs.sql`, `PROGRESS.md`.

## Opdatering 2026-08-11 (23. runde — komplet nyt visuelt look, "resultattavle"-designet)
Matteo bad om et helt nyt, "high-end App Store"-look — samme funktioner, samme steder, kun det visuelle. Retning: i stedet for endnu en generisk mørk fitness-app, er inspirationen konkurrence-vægtløftnings resultattavlen ("jern"-navnet taget bogstaveligt) — store selvsikre tal, maskinerede "plader" i stedet for bløde kort, ægte tegnede ikoner i stedet for emoji. Vist som en klikbar mockup først og godkendt af Matteo (med to justeringsrunder: fjernet en falsk forhåndsvisning på onboarding-skærm 2 + tilføjet "Øvrige øvelser"-forklaring, og rettet konfetti til at falde fra toppen af skærmen i stedet for bunden), derefter bygget ind i den rigtige app.

**Ny `PRODUCT.md`** — produktets brugere/formål/begrænsninger dokumenteret (bruges af fremtidige redesign-runder, skrives ikke løbende om).

**Det visuelle system:**
- Ny farvepalet: køligere stål-sort/grå-toner, og selve `--yellow`-variablen (bruges alle steder i koden) er ændret fra fladt gult til en varmere "rav/aflæsnings"-amber
- Rigtig skrifttype: **Oswald** (kondenseret, fed), indlejret direkte i `styles.css` som en `@font-face` (ingen ekstern hentning — virker uden internet til selve skrifttypen) — bruges til alle overskrifter, tal, knapper og labels; almindelig brødtekst er stadig telefonens systemskrift
- Kort/"plader" har nu en let "maskineret" kant (en tynd lys stribe øverst) i stedet for en blød skygge, og er en anelse mindre runde i hjørnerne (10px i stedet for 14px)
- Bundnavigationen har fået en lille aflæsnings-streg over den aktive fane, som en resultattavle
- **Alle system-ikoner er nu håndtegnede SVG'er i stedet for emoji** — bundnav (Feed/Kalender/Log øvelse/Historik/Dig), dropdown-menuen (Kommentarer/Øvelser/Venner/Godkend brugere/Log ud), PR-badges, "Størst/Mindst fremgang"-overskrifter, login-logo, onboarding-ikoner. Historik-ikonet er bevidst et ur (Matteos eget forslag), ikke en graf-linje. Almindelige tekst-emoji i selve indholdet (fx "💪 Ben", "🎉" i toast-beskeder) er bevidst IKKE ændret — kun ikoner der optræder gentagne gange som systemelementer

**Ikke ændret:** navnet "Jernlog"/"Matteos Jernlog", app-ikonet, at appen er udelukkende i mørkt tema, og al funktionalitet/struktur — kun udseendet.

**Testet:** Alle 30 automatiske tjek i `tests.js` består fortsat (ingen adfærdsændring). Desuden gennemgået visuelt i browseren med den rigtige app-kode (Feed, Log øvelse, Historik/graf, Kalender, menu) — alt renderer korrekt.

**Skal uploades til GitHub:** `index.html`, `styles.css`, `app-core.js`, `app-feed.js`, `app-calendar-dig.js`, `app-history.js`, `manifest.json`, samt den nye `PRODUCT.md`.

## Opdatering 2026-08-10 (22. runde — PR-konfetti + onboarding for nye brugere, bygget efter godkendte mockups)
Efter code review-runden (21. runde) blev to nye funktioner først vist som klikbare Artifact-mockups til godkendelse, justeret efter feedback (konfetti skulle falde fra toppen og vare længere; onboarding-øvelsesvalget blev droppet til fordel for ren tekst + en ny "tilføj venner"-skærm), og er nu bygget ind i den rigtige app.

**1. PR-fejre-animation (FÆRDIG, testet)**
`showToast()` i `app-core.js` kalder nu `burstConfetti()` når `type==="pr"` — et lille konfetti-regn (46 stykker, appens egne farver) der falder fra toppen af skærmen og længere ned end først forsøgt, over ca. 2,3-3,4 sekunder. Ny `<div id="confettiLayer">` i `index.html` + tilhørende CSS i `styles.css`. Ingen database-ændring.

**2. Onboarding for nye brugere (FÆRDIG, testet)**
4 sprinbare skærme, vist automatisk første gang en NY, netop godkendt bruger logger ind (lige efter godkendelsesvæggen fra 20. runde):
1. Velkommen — kort forklaring af de 5 bundnav-faner
2. Byg dit eget program — ren tekst om "Øvelser/Mit program": tilføj øvelser, Program 1/2, Øvrige øvelser (den tredje liste til lejlighedsvise øvelser), og egne muskelgruppe-grupperinger
3. Tilføj dem du kender — henter ALLE brugere direkte (ikke kun venner) så man kan sende venneanmodning med det samme, uden at skulle vide at "Venner"-siden findes
4. Du er klar! → ind i appen som normalt

**Database-migration nødvendig:** `supabase-migration-onboarding.sql` (ny fil, samme mønster som de tidligere) — tilføjer `profiles.has_onboarded` (default `false`), og markerer alle NUVÆRENDE konti som allerede onboardet, så kun fremtidige nye brugere ser flowet. **Kør denne i Supabase SQL Editor** — indtil den er kørt, findes kolonnen ikke, og koden springer bare onboardingen over for alle (helt harmløst, ingen fejl), så rækkefølgen er ikke kritisk denne gang, men gør det gerne snart så nye brugere får glæde af det.

**Testet:** `tests.js` udvidet med 12 nye automatiske tjek (konfetti udløses ved PR, hele onboarding-flowet klikket igennem inkl. vennelisten, samt at man havner korrekt i appen bagefter med bundnav synlig). Fangede undervejs en rigtig fejl (bundnav'en forblev skjult efter afsluttet onboarding) — rettet før upload. Alle 30 tjek i alt består nu.

**Skal uploades til GitHub:** `index.html`, `styles.css`, `app-core.js`, `tests.js`, samt den nye `supabase-migration-onboarding.sql` (som du selv kører i Supabase).

## Opdatering 2026-08-10 (21. runde — kode-oprydning: fil-split + permanente tests)
Efter en "senior code review"-gennemgang af hele appen kom to rene oprydningspunkter, som Matteo godkendte uden forbehold (ingen adfærdsændring for brugerne):

**1. `index.html` splittet op (FÆRDIG, verificeret)**
Den ene 3500-linjers fil er splittet mekanisk (kun flyttet, ingen kode omskrevet) til:
- `styles.css` — al CSS
- `app-core.js` — Supabase-opsætning, delt state, cloud-sync, router (`goto`/`render`), login/opret konto, boot-flow
- `app-log.js` — Log øvelse-siden
- `app-history.js` — Historik-liste + øvelseshistorik-detalje/graf
- `app-exercises.js` — Øvelser/Mit program-siden, rækkefølge, startkatalog
- `app-calendar-dig.js` — Kalender + Dig/Wins & Plateaus + fælles hjælpefunktioner
- `app-feed.js` — Feed-siden
- `app-admin-friends.js` — Godkend brugere, Venner, Venneprofil, Kommentarer, app-init

Ingen ES-moduler (bevidst, for slet ikke at skulle røre kodens indhold) — filerne deler stadig samme globale scope, ligesom da alt lå i én fil. Én lille, usynlig teknisk detalje: koden lå før inde i en lukket "boks" (IIFE) som ikke kunne ses udefra; nu ligger de delte variable (`state`, `session` osv.) direkte i browserens globale scope for at kunne deles på tværs af filerne uden en build-proces. Betyder intet for hvordan appen ser ud eller virker — kun synligt hvis man selv åbner browserens udviklerkonsol og leder efter dem.
Verificeret byte-for-byte at ingen kodelinjer er tabt eller ændret undervejs (automatisk diff mod originalen), samt `node --check`-syntakstjek af hver fil og en fuld jsdom-gennemklikning (alle sider/funktioner) — alt identisk med før splittet.

**2. Permanent testfil tilføjet (FÆRDIG)**
Ny `tests.js` (kør med `npm install && npm test`) — indeholder nu 18 automatiske tjek: at alle sider/filer indlæses korrekt sammen, at Øvelse 1-2/3-4-fjernelsen (se nedenfor) holder, og at godkendelsesvæg-fejlen fra tidligere i dag forbliver rettet. `package.json` tilføjet (kun til at hente jsdom til testene — påvirker ikke selve appen, som stadig er rene statiske filer uden build-trin). `.gitignore` tilføjet så `node_modules` ikke skal uploades til GitHub.

**Skal uploades til GitHub:** `index.html`, `styles.css`, alle 7 `app-*.js`-filer, `tests.js`, `package.json`, `.gitignore`. `package-lock.json` kan uploades med, men er ikke strengt nødvendig.

## Opdatering 2026-08-10 (20. runde — godkendelses-bug fundet og rettet, "Øvelse 1-2/3-4" fjernet)
Matteo bad om to ting i denne runde:

**1. Fejl: nye brugere kunne komme forbi godkendelsesvæggen (FÆRDIG, root cause fundet og rettet)**
Matteo havde oplevet at nogle nye brugere kunne bruge appen med det samme efter oprettelse, selvom han stadig havde dem stående som "Afventer" på "Godkend brugere"-siden. Root cause: `tryInsertProfile()` byggede efter oprettelse selv et lille profil-objekt i hukommelsen (`{id, username, email}`) i stedet for at bruge den rigtige række fra databasen — og glemte dermed `approved`-feltet helt. Godkendelses-tjekket i `bootAfterLogin()` (`myProfile.approved===false`) fejlede derfor stille (`undefined===false` er falsk), og den nye bruger sprang direkte ind i appen i det allerførste øjeblik efter oprettelse. Ramte kun helt nye konti — logger man ud og ind igen, henter koden den rigtige række fra databasen og virker korrekt, hvilket er derfor det virkede tilfældigt.
**Rettelse:** `tryInsertProfile()` henter nu den indsatte række tilbage fra databasen (`.select().single()`) i stedet for at gætte selv, så `myProfile.approved` altid matcher det faktiske databaseindhold. Ingen database-ændring nødvendig — bekræftet direkte i Supabase at `profiles_select`-reglen (`using (true)`) tillader dette. Testet med jsdom (simuleret helt ny bruger uden eksisterende profil-række): ser nu korrekt "Venter på godkendelse"-skærmen og IKKE bundnavigationen/appen.

**2. Fjernet "Øvelse 1-2 / Øvelse 3-4"-valget ved logning (FÆRDIG, testet)**
Matteo vurderede at valget var irrelevant — man skal bare vælge øvelse, vægt og reps. Fjernet fra både Log-skærmen og "Rediger sæt"-boksen. Alle nye/redigerede sæt gemmes fortsat teknisk med værdien "1-2" (ingen database-ændring), men brugeren kan ikke længere vælge/se det.
På Matteos ønske er øvelseshistorik-siden også forenklet: de to separate grafer ("Udvikling — øvelse 1-2 for muskel" og "øvelse 3-4 for muskel") er slået sammen til én samlet graf ("Udvikling", al historik). "· Øvelse 1-2/3-4"-mærkatet ved hvert enkelt sæt i historik-listen er også fjernet, da det ikke længere giver mening. Testet med jsdom (søg+vælg øvelse, log-formular, øvelseshistorik, rediger-sæt-modal) — alle 18 automatiske tjek bestået, ingen JS-fejl.

**Skal uploades til GitHub:** kun `index.html`.

## Opdatering 2026-07-22 (19. runde — "Dig"-siden viser kun 2 seneste træninger + "Se tidligere")
Matteo ville ikke skulle scrolle forbi alle sine træninger for at nå frem til "Størst fremgang"/"Mindst fremgang"-statistikkerne nederst på "Dig"-siden, hvis man har mange loggede træninger.

**Rettelse:** "Dig"-siden viser nu kun de 2 seneste træningskort som udgangspunkt. Lige under det andet kort er der en knap "Se tidligere" — trykker man på den, udvides listen til at vise alle (op til den eksisterende grænse på 15 nyeste). Ny state `state.digShowAll` styrer dette (samme mønster som det eksisterende `digExpanded` for enkelt-kort). Kommentar-indlæsningen (`loadDigComments`) er rettet til kun at hente kommentarer til de faktisk viste kort, så indekseringen matcher korrekt både før og efter udvidelse.

Testet med jsdom (4 træningsdage langt fra hinanden i tid): kun 2 kort vises i starten, "Se tidligere"-knappen findes, klik udvider til alle 4 kort og knappen forsvinder, kommentarfelter findes korrekt for alle 4 kort efter udvidelse. Ingen JS-fejl. Selve "Størst fremgang"/"Mindst fremgang"-beregningen er upåvirket (den bruger al log-data uafhængigt af hvor mange kort der vises).

**Tilføjelse samme runde:** Matteo bad om at listen skal nulstilles til kun 2 kort igen, hvis man forlader "Dig" og går tilbage (fx via "Historik"-knappen), i stedet for at forblive udvidet resten af sessionen. Rettet i den centrale `goto(view)`-funktion (bruges af AL navigation i appen — både bundmenuen OG dropdown-menuen øverst): forlader man "Dig" til en anden side, nulstilles `state.digShowAll` automatisk. Testet med jsdom: Dig → udvid → Historik (bundmenu) → Dig viser igen kun 2 kort. Matteo spurgte specifikt om dropdown-menuen også resetter — testet separat (Dig → udvid → dropdown-menu "Øvelser/Mit program" → Dig): virker allerede korrekt, ingen ekstra kodeændring nødvendig, da dropdown-menuens klik også går igennem samme `goto()`-funktion.

**Skal uploades til GitHub:** kun `index.html`.

## Opdatering 2026-07-22 (18. runde — Program 1/2-navne, nulstilling af andres lister, swipe-fjern, brugerstyrede grupperinger)
Matteo bad om fire ting i denne runde:

**1. Omdøbning: "Liste A/B/C" → "Program 1"/"Program 2"/"Øvrige øvelser" (FÆRDIG)**
Alle brugervendte tekster er ændret: toggle ved oprettelse/omdøbning af øvelser, overskrifter på Øvelser/Mit program-siden, "Rediger liste"-modalens titel/tekst/toast. De interne kode-værdier for variant ("a"/"b"/null) er IKKE ændret — kun det brugeren ser er nyt. Kun kommentarer i koden (ikke synlige for brugeren) nævner stadig de gamle navne enkelte steder.

**2. Nulstilling af alle andre brugeres programmer (FÆRDIG, kørt direkte i Supabase)**
Kørt en engangs-SQL der sætter `variant = null` for alle `exercises`-rækker hvor brugeren IKKE er Matteo. Verificeret bagefter: alle 8 andre brugere har nu 0 øvelser med et program (alt ligger i Øvrige øvelser), mens Matteos egen konto er urørt (50 øvelser med program, som før). De andre brugere kan nu selv bygge deres Program 1/2 fra bunden.

**3. Swipe-venstre for at fjerne en øvelse fra Program 1/2 (FÆRDIG, testet)**
Ny gestus på Øvelser/Mit program-siden: swiper man en øvelse i Program 1 eller Program 2 til venstre (mindst ca. 90px), ryger den ned i Øvrige øvelser (variant-bogstavet fjernes). Kun aktiv i Program 1/2 — ikke i Øvrige øvelser, da der ikke er noget "længere ned" at flytte til der. Den eksisterende lang-tryk-og-træk-rækkefølge-gestus er bevaret uændret og fungerer stadig i alle tre lister (kodemæssigt er lodret træk og vandret swipe nu to grene af samme trykhåndtering, så de ikke kan forveksle hinanden — testet med jsdom: swipe fjerner korrekt, efterfølgende lodret træk virker stadig uden fejl).

**4. Mulighed for at ændre muskelgruppe-grupperinger (FÆRDIG, testet)**
Ny knap "Rediger grupperinger" øverst på Øvelser/Mit program-siden. Her kan man for hver af de 9 muskelgrupper vælge hvilken af de 3 faner den skal ligge under (fx flytte Tricep over til Bryst-gruppen). Gemmes kun på ens egen konto (ny kolonne `profiles.group_layout`, en jsonb med 3 lister af muskelgruppe-navne) og påvirker ingen andre brugere. Så længe man ikke selv har ændret noget, ser man præcis samme Ryg/Bryst/Ben-opdeling som altid. Har man lavet sin egen gruppering, hedder fanerne i stedet "Gruppe 1/2/3" (da de faste navne "Ryg"/"Bryst"/"Ben" ikke nødvendigvis passer længere), og der er en "Nulstil til standard"-knap. "Foreslået i dag"-funktionen (som foreslår øvelser ud fra hvad man har logget i dag) bruger nu automatisk ens egen gruppering i stedet for den faste standard. Testet med jsdom: standard-visning uændret, tilpasning gemmes og bruges korrekt, nulstilling virker.

**Database-migration kørt:** `alter table profiles add column if not exists group_layout jsonb;` — additiv, ingen eksisterende data påvirket.

**Skal uploades til GitHub:** kun `index.html`. De to database-ændringer (nulstilling af andres programmer + ny kolonne) er allerede kørt direkte i Supabase.

## Opdatering 2026-07-22 (17. runde — 3 ændringer: faner i Øvelser, rækkefølge-bug, delt øvelseskatalog)
Matteo bad om tre ting i én omgang:

**1. "Øvelser" → "Øvelser/Mit program" + 3 faner (FÆRDIG, testet)**
Menupunktet i dropdown-menuen hedder nu "Øvelser/Mit program". Siden har fået 3 faner øverst (Ryg / Bryst / Ben) så man med det samme kan hoppe til den ønskede muskelgruppe uden at scrolle forbi de andre. Fanerne styres af nyt state-felt `exercisesTab`. "Ikke kategoriseret"-sektionen vises fortsat altid øverst, uanset hvilken fane der er valgt. Testet med jsdom: korrekt menutekst, korrekte fane-labels, fane-skift viser rette øvelser (Ryg viser ikke Ben-øvelser og omvendt). Ingen JS-fejl.

**2. Rækkefølge blev nogle gange byttet om i Ben-programmet (FÆRDIG, root cause fundet og rettet)**
Matteos svar på opklarende spørgsmål ("mest nye/nyligt flyttede" + "sker også uden at lukke appen") pegede væk fra netværks-timing og hen på en ren kode-fejl. Fundet: `openEditExerciseModal` (bruges både til at omdøbe en øvelse OG til at kategorisere "Ikke kategoriseret"-øvelser) genopbyggede øvelsesobjektet fra bunden ved gem, og glemte at kopiere `position`-feltet med — så `position` blev nulstillet (slettet) hver gang man omdøbte/kategoriserede en øvelse. Det ramte netop "nye/nyligt flyttede" øvelser, fordi det er dem der oftest går igennem den dialog. Rettet med `Object.assign({}, e, {...})` så alle eksisterende felter bevares. `openAddExerciseModal` fik desuden tilføjet en rigtig startposition ved oprettelse (manglede før). Testet med jsdom: position uændret (1) før og efter simuleret omdøbning.

**3. Del Matteos øvelseskatalog med alle brugere (Liste C) — DELVIST FÆRDIG**
Mål: alle andre nuværende brugere OG alle fremtidige nye brugere skal have Matteos fulde liste af 60 øvelser liggende i Liste C under deres muskelgruppe, så de selv kan bygge deres Liste A/B.

- **Fremtidige brugere (FÆRDIG):** `STARTER_CATALOG`-arrayet i `index.html` er erstattet med Matteos komplette 60-øvelses-liste (hentet direkte fra `exercises`-tabellen i Supabase via SQL). Alle `variant`-felter er sat til `null`, så nye brugere får det hele i Liste C i stedet for allerede sorteret i A/B. Verificeret: 60 unikke id'er, ingen dubletter, gyldig JS-syntaks (`node --check`).
- **Nuværende brugere (FÆRDIG):** Engangs-SQL'en herunder er kørt direkte i Supabase SQL Editor. Bemærk: `ON CONFLICT (id)` fejlede først (42P10 — exercises' rigtige primærnøgle er `(user_id, id)`, ikke bare `id`), rettet til `ON CONFLICT (user_id, id)`, hvorefter den kørte igennem uden fejl. Verificeret bagefter: alle 8 andre brugere er gået fra deres tidligere antal til 66 øvelser hver (Matteos 60 minus dem de allerede havde med samme navn, plus deres egne oprindelige øvelser). Alle nye øvelser er sat med `variant: null`, så de ligger i Liste C og skal ikke ændre noget i deres eksisterende Liste A/B.

```sql
with mine as (
  select id from profiles where email = 'matteoverdiani.dk@gmail.com'
),
my_exercises as (
  select e.id, e.name, e.bodyweight, e.muscle
  from exercises e
  where e.user_id = (select id from mine)
),
target_users as (
  select id as user_id from profiles where id <> (select id from mine)
)
insert into exercises (user_id, id, name, bodyweight, muscle, variant, position)
select
  tu.user_id,
  me.id || '__' || substr(tu.user_id::text, 1, 8),
  me.name,
  me.bodyweight,
  me.muscle,
  null,
  null
from target_users tu
cross join my_exercises me
where not exists (
  select 1 from exercises e2
  where e2.user_id = tu.user_id
    and lower(e2.name) = lower(me.name)
)
on conflict (id) do nothing;
```

Denne SQL indsætter kun øvelser brugeren IKKE allerede har (matchet på navn, uanset store/små bogstaver) — ingen dubletter, ingen overskrivning af eksisterende data. `variant` og `position` sættes til `null`, så de lander i Liste C.

**Skal uploades til GitHub:** kun `index.html` (den opdaterede `STARTER_CATALOG`, samt de to andre rettelser fra denne runde). Database-delen (backfill til eksisterende brugere) er allerede kørt direkte i Supabase, så det kræver ikke noget upload.

**Alle tre punkter fra Matteos ønskeliste denne runde er nu færdige og testede.**

## Opdatering 2026-07-15 (16. runde — 404 efter email-verificering, undersøgt)
Matteo spurgte om punkt 1 (404 efter email-bekræftelse) er løst. Tjekkede Supabases Auth → URL Configuration direkte via browser-styring:
- **Site URL:** `https://matteodk.github.io/Matteos-Jernlog/` — bekræftet at denne rent faktisk virker (hentet direkte, viser den kørende app, version 15.7-C, ingen 404).
- **Redirect URLs:** tom liste — sandsynligvis ikke problemet, appen falder bare tilbage til Site URL.

Kan ikke finde noget forkert i selve konfigurationen lige nu. Punktet er stadig markeret som "ikke bekræftet løst" i vores interne opgaveliste, indtil Matteo laver en rigtig test (opret testkonto, bekræft via mail, se om 404 stadig sker). Ingen kodeændringer denne runde.

## Opdatering 2026-07-15 (15. runde — søg på muskelgruppe i Log øvelse)
Matteo ønskede at man i søgefeltet under "Log øvelse" kan skrive en muskelgruppes navn (fx "bryst", "ryg", "ben") og få vist ALLE øvelser for den gruppe, ikke kun søgning på selve øvelsesnavnet.

**Rettelse:** `doSearch()` i `renderLog()` tjekker nu først om søgeteksten matcher starten af en muskelgruppes danske navn (fra `MUSCLE_LABELS`). Hvis den gør, vises alle øvelser for den muskelgruppe (uden den normale 8-styks-grænse). Ellers søges som før i øvelsesnavne (stadig maks. 8 resultater).

Testet med jsdom: søgning på "bryst" viser korrekt alle bryst-øvelser, almindelig navnesøgning (fx "squ" → Squat) er uændret. Ingen JS-fejl.

**Skal uploades til GitHub:** kun `index.html`.

⚠️ **Bemærk:** Matteo har omdøbt sin lokale mappe fra "CLAUDE" til "Matteos CLAUDE" — stien er nu `Matteos CLAUDE/Jernlog App/` i stedet for `CLAUDE/Jernlog App/`. Husk dette hvis en fremtidig chat leder efter filerne og ikke kan finde den gamle sti.

## Opdatering 2026-07-15 (14. runde — "Fjern adgang" fejlede, database-rettelse kørt)
Matteo kunne ikke fjerne Thors adgang — fik fejlen "permission denied for table users". Årsag: sikkerhedsreglerne (`profiles_admin_update`, `profiles_admin_delete`) og triggeren `prevent_self_approve()` fra den oprindelige migration tjekkede admin-status ved at slå direkte op i Supabases interne `auth.users`-tabel — men almindelige indloggede brugere (også Matteos egen konto, når den bruges via appen) har ikke lov til at læse den tabel direkte. Sandsynligvis har denne fejl ligget der siden starten; tidligere godkendelser blev kørt direkte i SQL Editor (som ikke har denne begrænsning), så det er først nu, med Thor, at "Godkend/Fjern adgang"-knapperne reelt er blevet testet i selve appen.

**Rettelse:** Ny fil `supabase-fix-admin-permission.sql` — omskriver triggeren og de to admin-regler til at bruge `auth.jwt() ->> 'email'` (læser emailen direkte fra den indloggede brugers egen session) i stedet for at slå op i `auth.users`. Kørt direkte i Supabase SQL Editor via browser-styring — **"Success. No rows returned"**, altså udført korrekt.

Dette er en ren database-rettelse — **ingen app-filer er ændret**, og der skal derfor ikke uploades noget til GitHub for denne runde. Matteo bør prøve "Fjern adgang" på Thor igen i appen for at bekræfte at fejlen er væk.

## Opdatering 2026-07-15 (13. runde — login-knap hoppede til mail-felt, rigtig fix)
Matteo fandt en ny fejl: på login-siden, hvis man stod i adgangskode-feltet og trykkede "Log ind", hoppede fokus bare op i mail-feltet i stedet for at logge ind — krævede at man først trykkede flueben på tastaturet, så "Log ind" separat.

**Årsag:** Dette var højst sandsynligt en BIVIRKNING af forrige runde's globale touchstart-fix (runde 12, punkt 2). Den fjernede fokus fra inputfeltet med det samme et tryk startede ("touchstart") — men det satte tastaturets luk-animation i gang FØR selve trykket var færdigt, så layoutet nåede at flytte sig under fingeren, og telefonen troede man trykkede på et andet element (mail-feltet) end det man rent faktisk rørte ved (Log ind-knappen).

**Rigtig fix:** Erstattet det globale touchstart-lag med en ny `bindTapAction()`-funktion der bruges direkte PÅ hver relevante knap i stedet. Den lytter på knappens eget `touchend` (som — modsat "click" — altid rammer det oprindelige element man trykkede på, uanset om layoutet flytter sig undervejs), fjerner fokus fra evt. aktivt tekstfelt, og udfører knappens handling i samme tryk. Har et "click"-fallback for ikke-touch-enheder, med en flag der forhindrer dobbelt-udførelse.

Anvendt på alle knapper der sidder lige efter et tekstfelt: **Log ind/Opret konto, Log øvelse (gem sæt), Gem brugernavn, Opret ny øvelse, Omdøb øvelse, Gem redigeret sæt, Søg ven, Send kommentar (både feed og Dig).**

Testet med jsdom (klik-fallback simuleret for login — ingen fejl, `signInWithPassword` kaldt korrekt; kommentar-afsendelse i feed/Dig fortsat OK). **Ikke testet på en rigtig telefon endnu — det er her den ægte test er, da jsdom ikke kan simulere ægte touch-timing/keyboard-animation.**

**Skal uploades til GitHub:** kun `index.html`.

## Opdatering 2026-07-15 (12. runde — dato tydeligere, tastatur+knap-fix, kommentarer i Dig)
Sort bjælke-fixet (version 15.7-C) er bekræftet virkende på telefonen. Tre nye ting lavet:

1. **Tydeligere dato på aktiviteter (feed + Dig)** — datoen står nu som en lille tydelig badge/pille for sig selv (fx "I dag"/"I går"/"14. jul") frem for at være klemt ind i en lang, rodet linje sammen med klokkeslæt/varighed/øvelsesantal. Ny fælles funktion `renderWhenHtml()` bruges begge steder, så det er ens og konsistent.
2. **Knap-tryk mens tastatur er åbent** — kendt iOS-problem hvor første tryk uden for et aktivt inputfelt kun lukker tastaturet uden at aktivere knappen bagved. Løst med et globalt `touchstart`-lag der fjerner fokus fra inputfeltet med det samme (før selve trykket når at blive et "click"), så knappens funktion nu udløses i samme tryk.
3. **Kommentarer i Dig-siden** — man kan nu se og skrive kommentarer på sine egne aktiviteter under "Dig", ikke kun i feedet. Indlæses asynkront lige efter selve siden er tegnet (så resten af siden ikke skal vente på en netværkstur), viser samme kommentar-visning som feedet (forfatter, tekst, dato, "Kommentarer"-label).

Alt testet med jsdom (ingen JS-fejl; dato-badge bekræftet i både feed og Dig; kommentar fra ven vist korrekt i Dig; ny kommentar sendt fra Dig-siden virker og gemmes). **Ikke testet på en rigtig telefon endnu.**

**Skal uploades til GitHub:** kun `index.html` (ingen nye filer denne gang).

## Opdatering 2026-07-15 (11. runde — SORT BJÆLKE LØST, fix lagt ind i appen)
`bundtest2.html` (statusbar-stil `black` i stedet for `black-translucent`) beviste løsningen på telefonen: grøn safe-area-stribe helt nede ved skærmkanten, ingen bjælke, toppen stadig pæn. Fixet er nu overført til appen:
- `index.html`: `apple-mobile-web-app-status-bar-style` ændret til `black`; html/body-baggrund tilbage til `--bg` (matcher header ved evt. statusbar-underlap i toppen); forklarende kommentar opdateret; version hævet til **15.7-C**.
- **VIGTIGT ved udrulning:** statusbar-stilen læses KUN ved installation → alle (Matteo, Thor, mrbuuuzzz) skal **slette hjemmeskærms-genvejen og tilføje appen igen én gang** efter upload. Ellers ingen effekt.
- Verifikation: menu (☰) skal vise "version 15.7-C", og bundnav'en skal gå helt ned uden bjælke.
- Oprydning senere (valgfrit): `bundtest.html`/`bundtest2.html` kan slettes fra repoet når alt er bekræftet.

## Opdatering 2026-07-15 (10. runde — GENNEMBRUD: årsagen er fundet og opmålt)
Diagnosen fra runde 9 gav svar:
- Versions-markøren ("version 15.7-B") VISES på telefonen → cache-teorien (Teori A) er død; telefonen kører nyeste kode.
- `bundtest.html` som hjemmeskærm-app viste: env(safe-area-inset-bottom)=34 ✓, MEN `window.innerHeight`=793 mod `screen.height`=852 → **layout-vinduet er præcis 59pt for kort (= statusbar/Dynamic Island-højden)**. Indholdet forankres i toppen (rød gik op under statusbaren), så de 59pt mangler i BUNDEN. Området under web-vinduet males af sidens "canvas" (html-baggrund — hvid på testsiden).
- Konklusion: kendt WebKit-fejl i nyere iOS: standalone + `apple-mobile-web-app-status-bar-style=black-translucent` → viewport bliver screen−statusbar, men tegnes fra skærmens top. INGEN CSS kan løse det — det er selve vinduet der slutter for tidligt.

**Løsningskandidat (testes isoleret):** `bundtest2.html` — identisk testside, men med statusbar-stil `black` (ikke-overlay). Forventning: web-vinduet placeres under statusbaren og når helt til bunds. Hvis det virker: skift appens meta til `black` (env(top) bliver så 0 → headerens padding-top falder automatisk tilbage til 14px; statusbar-området bliver sort, hvilket matcher appens næsten-sorte tema).
Efter 4 mislykkede forsøg er strategien ændret: i stedet for flere CSS-gæt afgøres det nu eksperimentelt HVOR problemet ligger. Der er præcis to teorier tilbage:
- **Teori A (cache):** Telefonen kører slet ikke den nyeste kode (GitHub Pages CDN / hjemmeskærms-snapshot / service worker hønen-og-ægget). Ville forklare hvorfor INGEN forsøg har ændret noget visuelt — heller ikke farve-matchingen, som umuligt kan være usynlig hvis koden faktisk kørte.
- **Teori B (WebView-inset):** WebView'en dækker reelt ikke bunden i standalone; det sorte er iOS' eget vindue bag web-indholdet, og kan pr. definition ikke males med CSS.

**Nyt i denne runde:**
1. `bundtest.html` — minimal, isoleret testside (rød fuldskærm + grøn safe-area-stribe + blå "falsk bundnav" + live-tal på skærmen: klokkeslæt for indlæsning, standalone ja/nej, env(safe-area-inset-bottom) i px, innerHeight osv.). Skal uploades til repoet, åbnes i Safari OG som hjemmeskærm-app, og skærmbilledes.
2. Versions-markør i `index.html`: nederst i dropdown-menuen (☰) står nu "version 15.7-B". Hvis appen på telefonen IKKE viser den tekst efter upload+genstart, er Teori A bevist.

**Fortolkning af bundtest (som hjemmeskærm-app):**
- Rød når helt ned + grøn stribe ca. 34px synlig → WebView'en KAN dække bunden → Teori B død → fejlen er app-specifik/cache → fix i appen.
- Sort bjælke under rød/blå + env-tal = 0 → Teori B bevist → CSS kan ikke løse det; næste skridt er meta/manifest-varianter (fx uden manifest.json, anden statusbar-style) testet én ad gangen på testsiden — eller acceptér og design bundnav'en så den ser bevidst ud.

**Upload:** `bundtest.html` + `index.html` (versions-markør). Testsiden kræver sin egen "Føj til hjemmeskærm" (ikonet hedder "Bundtest").

## Opdatering 2026-07-15 (8. runde — sort bjælke under bundnav, forsøg 3: rigtig manifest.json)
Matteo sammenlignede med Strava-appen og pressede på — med rette, for Strava beviser at det GODT kan lade sig gøre at få bundnav'en helt ned uden sort bjælke. Fandt en sandsynlig hovedårsag: appen har KUN de gamle "apple-mobile-web-app-*" meta-tags, men ingen rigtig **Web App Manifest** (`manifest.json`) — det er den moderne standard som nyere iOS-versioner håndterer markant bedre, bl.a. i forhold til safe-area/viewport i hjemmeskærm-tilstand.

**Rettelser:**
- Ny fil `manifest.json` tilføjet (name, display:"standalone", background_color/theme_color, ikon-reference).
- `<link rel="manifest" href="manifest.json">` tilføjet i `index.html`'s `<head>`.
- Ekstra defensiv CSS: `height:-webkit-fill-available` tilføjet til html/body (kendt fix for et specifikt WebKit-bug-mønster med denne præcise symptom).
- Alle tidligere forsøg (position:fixed;inset:0, farve-matching, større knap-række) er bevaret — dette er lag oveni, ikke en erstatning.

⚠️ **VIGTIGT:** En Web App Manifest læses kun af iOS på selve installationstidspunktet ("Føj til hjemmeskærm"). Det er IKKE nok at uploade filen og genåbne den eksisterende hjemmeskærm-genvej — Matteo (og alle andre brugere) skal **slette den nuværende hjemmeskærm-genvej og tilføje appen igen fra bunden** for at manifestet reelt træder i kraft. Dette er ud over den service worker-relaterede engangs-geninstallation der allerede er sket tidligere.

**Ikke testet på telefonen endnu — kræver slet+geninstaller, ikke bare genupload.**

## Opdatering 2026-07-15 (7. runde — nyt ikon, bundnav-plads, kommentar-forbedringer)
1. **Nyt app-ikon** — lavet fra Matteos nyeste ChatGPT-genererede billede (samme figur/stil, men tekst der fylder bredden bedre og næsten intet tomrum i bunden). Beskåret tæt og kvadratisk, gemt som `icon-180-v1.png` (overskriver den forrige — filnavnet er uændret, så `index.html` skal IKKE opdateres for dette).
2. **Bundnav-plads** — iOS reserverer en lille strimmel nederst til "swipe hjem"-bevægelsen, hvor der ikke kan sidde trykbare knapper (kan ikke fjernes helt). I stedet er selve knap-rækken gjort højere (mere padding, større ikon/tekst), så knapperne fylder mere af området og den reserverede strimmel virker mindre/mere ubetydelig.
3. **"Kommentarer"-label i feed** — tilføjet en lille label ("💬 Kommentarer") over kommentarsektionen i hvert opslag, så det er tydeligt hvor kommentarerne starter.
4. **Dato på kommentarer** — hver kommentar viser nu dato (I dag/I går/dd. mmm) til højre.

Alt testet med jsdom-simulering (ingen JS-fejl, label og dato bekræftet i output). **Ikke testet på en rigtig telefon endnu.**

**Skal uploades til GitHub:** `index.html`, `icon-180-v1.png`, `PROGRESS.md`. `sw.js` skal IKKE med (uændret).

## Opdatering 2026-07-15 (6. runde — sort bjælke under bundnav, forsøg 2)
Matteo bekræftede via skærmbillede at der stadig var en tydelig sort stribe under bundnavigationen på hjemmeskærm-appen (efter forrige `position:fixed;inset:0`-rettelse var uploadet og appen geninstalleret). Årsag (mest sandsynlig): `env(safe-area-inset-bottom)` giver i nogle tilfælde ikke ekstra plads korrekt til et element der ligger inde i et `position:fixed;inset:0`-element på iOS hjemmeskærm-apps — så bundnav'ens baggrund nåede ikke helt ned til bunden, og man så html/body's baggrundsfarve (`--bg`, næsten sort) i stedet.

**Rettelse (defensiv, virker uanset præcis årsag):**
- `html,body` baggrund ændret fra `--bg` til `--bg-elevated` (samme farve som bundnav'en) — så selv hvis der er en lille kant/gab et sted, matcher farven bundnav'en i stedet for at se sort/forkert ud.
- `.app` har nu selv en eksplicit `background:var(--bg-elevated)` som ekstra sikkerhed.
- `main` har fået en eksplicit `background:var(--bg)` (den mørkere farve), så resten af appen ser ud som før — kun bundnav-området er påvirket.
- `.bottom-nav`'s `padding-bottom` er ændret til `max(env(safe-area-inset-bottom),12px)` — sikrer minimum 12px baggrund under ikonerne, selv hvis `env()` skulle give 0.

Syntaks-tjekket (JS OK). **Ikke testet på telefonen endnu** — Matteo skal uploade `index.html` og teste igen efter geninstallation.

## Opdatering 2026-07-15 (5. runde — nyt app-ikon)
Matteo har lavet et nyt AI-genereret app-ikon (person der flekser + "BRAH"-taleboble + "Matteos Jernlog-app"-tekst på lilla/blå gradient). Det er beskåret tæt ind (intet tomrum i bunden, ingen kanter/border) og skaleret til 180x180. Matteo har slettet alle gamle ikonfiler på GitHub, så filen er omdøbt fra `icon-180-v4.png` til **`icon-180-v1.png`** for at starte navngivningen forfra — `index.html` linje 11 (`<link rel="apple-touch-icon">`) peger nu på det nye navn.

**Mangler at blive uploadet til GitHub:** `index.html` og `icon-180-v1.png`. `sw.js` er IKKE ændret i denne runde og skal ikke uploades igen (den skal kun genuploades hvis dens eget indhold ændres).

## Opdatering 2026-07-15 (4. runde — testet på telefonen, mindre rettelser)
Matteo har nu uploadet koden til GitHub og testet på sin iPhone (som PWA/hjemmeskærm-app). Bundnavigationen virker og hopper ikke, feed-kommentarer er synlige — men en lille sort stribe var synlig nederst under bundnavigationen (dvh-højde ramte ikke helt bunden af skærmen på hjemmeskærm-installerede iPhone-apps). Rettet ved at ændre `.app` fra `height:100dvh` til `position:fixed;inset:0;` — mere robust løsning specifikt til dette iOS-scenarie. Titlen øverst er også ændret fra "Master Matteos Jernlog" til "Master Matteos Jernlog-app". **Bekræftet på GitHub at begge rettelser er uploadet korrekt** (tjekket direkte via raw-fil), men Matteo skulle slette+geninstallere hjemmeskærm-genvejen for at telefonens cache ikke viste den gamle version. Ikke bekræftet visuelt på telefonen efter denne rettelse endnu.

**"Godkend brugere"-siden er udvidet:** viser nu også en "Alle oprettede brugere"-liste (ikke kun ventende), med status (Godkendt/Afventer) pr. bruger. Godkendte brugere (undtagen Matteo selv) har en "Fjern adgang"-knap til at tilbagekalde godkendelse igen. Testet med jsdom-simulering, ingen fejl.

**Ny fil: `sw.js` (service worker) — løser "alle skal slette+geninstallere appen for at få opdateringer".** Uden en service worker cacher iPhones en hjemmeskærm-app ret aggressivt, så nye kodeændringer ikke altid når frem uden manuel geninstallation. `sw.js` tvinger appen til altid at hente den nyeste version fra serveren (netværk først, kun cache som nødløsning hvis reelt offline — appen kræver alligevel internet pga. Supabase). Registreres automatisk fra `index.html` ved opstart.

⚠️ **Vigtigt at forstå:** dette er en "hønen og ægget"-fix. Telefoner der allerede kører den GAMLE kode (uden service worker-registrering) kan ikke opdage den nye `sw.js` af sig selv — de skal have ÉN sidste manuel opdatering (slet+geninstallér genvejen, som i denne runde) for at hente koden der faktisk registrerer service workeren. Men fra og med DEN opdatering, bør alle fremtidige ændringer hentes automatisk, uden at nogen skal slette og geninstallere igen. Så: upload denne omgang som normalt, bed alle 3 brugere geninstallere én sidste gang — herefter bør det være løst for godt.
**Ikke testet i en rigtig browser/telefon endnu.**

## ⚠️ Vigtig ændring siden start — læs dette
Appen startede som et rent lokalt/offline-projekt (data kun på telefonen, ingen server). Undervejs er arkitekturen ændret fundamentalt til en **cloud-løsning med Supabase**, fordi appen deles med venner (feed, kommentarer, venneanmodninger — det kræver en central database). Det oprindelige "kun lokalt, ingen server"-krav gælder altså ikke længere.

## Formål
"Strava for vægtløftning" — personlig styrketræning-tracker delt mellem Matteo og hans venner (fx Thor). Log øvelser, sæt, reps, vægt, se grafer/statistik og PR-tracking, se venners træning i en feed.

## Arkitektur (nuværende)
- `index.html` (skelet) + `styles.css` + 7 `app-*.js`-filer — vanilla JS, stadig **ingen build-trin** (bare flere `<script src>`-tags, ikke ES-moduler — delt globalt scope som før, se 20. runde 2/2 nedenfor)
- Hostet på GitHub Pages, repo: `MatteoDK/Matteos-Jernlog`
- Bruges som PWA på iPhone via "Føj til hjemmeskærm"
- **Backend: Supabase** (gratis plan), projekt "jernlog", region Stockholm
- Database: Postgres via Supabase, tabeller: `profiles` (nu inkl. `approved`), `exercises`, `logs`, `friendships`, `comments` — alle med Row Level Security
- App-skal: header og bundnav er faste (flex-kolonne, `height:100dvh`), kun `<main>` scroller
- Login: email + adgangskode (email-bekræftelse slået til) + **manuel admin-godkendelse af nye brugere**
- Internet er påkrævet (bevidst valg, pga. cloud-backend)

## Features
- Log øvelse (søg/vælg, vægt+reps, auto-udfyldt vægt, grøn PR-toast, "foreslået i dag")
- Historik/statistik pr. øvelse (grafer, sæt-historik, grøn PR-badge)
- Feed (træninger grupperet, PR-øvelser, "i gang nu"-badge, kommentarer altid synlige uden at skulle folde ud)
- Kommentarer (notifikationer, ulæst-tæller)
- Øvelser-siden (grupperet efter muskelgruppe, træk-og-slip rækkefølge)
- Kalender (trænede dage, streaks, venners kalender)
- Venner (søg, anmod, acceptér, venneprofil med read-only historik)
- Dig (seneste aktiviteter + Wins & Plateaus)
- Bundnavigation: Feed, Kalender, Log øvelse, Historik/Statistik, Dig
- Godkend brugere (kun synlig for matteoverdiani.dk@gmail.com) — accepter/afvis nye konti

## Status lige nu
Koden i `Jernlog App/index.html` (denne mappe) er den nyeste, fulde version — **den er endnu ikke uploadet til GitHub**. Alt er verificeret med en simuleret jsdom-test (fake login/database, ingen rigtig server), ikke i en rigtig browser/telefon endnu.

### Rettelser i dag, runde 3 (nyeste)
1. **Scroll-plads / bundnav dækkede for indhold** (fx kommentarfeltet nederst i feedet) — App-strukturen er lavet om: header + bundnav er faste flex-elementer, kun `<main>` scroller. Bundnav er ikke længere `position:fixed`, så den kan ikke længere dække noget.
2. **Bundnav "hoppede" ved skift til Feed** — Årsag: Feed viste kort en "Henter…"-besked før det fulde indhold, og den pludselige højdeændring fik mobilens adresselinje til at vise/skjule sig og flytte den faste bundnav. Løst af samme struktur-ændring + skift fra `window.scrollTo` til `main.scrollTop`.
3. **Godkendelse af nye brugere** — Nye konti er nu spærret indtil du godkender dem manuelt.
   - Ny kolonne `approved` (default `false`) på `profiles`.
   - Nye brugere ser "Venter på at MASTER MATTEO accepterer dig" i stedet for appen.
   - Ny side "Godkend brugere" i dropdown-menuen, kun synlig for din konto, med Accepter/Afvis + antal-badge.
   - **Kræver at du selv kører `supabase-migration-approval.sql` (ligger i denne mappe) i Supabase SQL Editor, FØR du uploader den nye `index.html`.** Se forklaring i selve SQL-filen. Scriptet godkender automatisk alle eksisterende konti (dig + Thor).
   - Sikkerhed: en database-trigger forhindrer brugere i at godkende sig selv via API'et direkte — ikke 100% uigennemtrængeligt for en teknisk garvet person, men stopper "deler jeg linket, kan alle bare oprette sig".

### Rettelser i dag, runde 2
4. **Bundnavigation** — 5 faste knapper: Feed, Kalender, Log øvelse, Historik/Statistik, Dig. Fjernet fra dropdown-menuen (som nu kun har Kommentarer, Øvelser, Venner, Log ud).
5. **"Dig"-side** — erstatter "Wins & Plateaus": viser "Seneste aktiviteter" (egne træninger, Strava-agtigt) øverst, ranking nedenunder.
6. **App-boot** — åbner automatisk "Log øvelse" hvis du har logget inden for 30 min, ellers "Feed".
7. **Live-badge/varighed i feed** — tjekket, var allerede korrekt (ingen ændring).

### Rettelser i dag, runde 1
8. **PR-farve** — grøn i stedet for rød (kun PR-beskeden, andre fejlbeskeder er stadig røde).
9. **Feed-kommentarer altid synlige** — uden at skulle trykke "se detaljer" først.
10. **"Skift"-knap** — omdøbt til "Skift øvelse" (to linjer) + baggrundsfarve.
11. **404 efter email-verificering — IKKE rettet.** Koden styrer ikke selv redirect'et, det er Supabase Auths "Site URL"-indstilling. Forklaringen fra en anden chat om at det "løser sig selv" er ikke fuldt overbevisende — test igen efter upload, og hvis 404 fortsætter, skal vi se de faktiske Supabase-indstillinger direkte.

## Kendte faldgruber (vigtigt ved videre kodning)
- Diff-sync kræver nye objekt-kopier ved redigering af `memEx`/`memLogs` — redigér aldrig direkte
- `variant`-feltet: 'a', 'b', 'ab' eller null (null = Liste C)
- Kommentar-nøgle er `target_user + workout_start` — flyt aldrig `logged_at` på en træning med kommentarer uden at opdatere kommentarerne
- Supabase gratis-plan pauser projektet efter ~1 uges inaktivitet (skal vækkes manuelt på supabase.com)
- `main` er nu det eneste scrollbare element (ikke `window`) — brug `main.scrollTop`, ikke `window.scrollTo`, ved fremtidige ændringer

## Næste skridt (i denne rækkefølge)
1. ~~Kør `supabase-migration-approval.sql` i Supabase SQL Editor~~ **GJORT 2026-07-15** — kørt direkte via browser-styring, verificeret med `select username, approved, created_at from profiles;`. Alle 3 eksisterende konti (matty-mc-fatty, thor, mrbuuuzzz) er godkendt (approved=true).
   - ⚠️ **OBS:** "mrbuuuzzz" (formentlig Thors far) blev automatisk godkendt, fordi hans konto allerede eksisterede før migrationen kørte (oprettet 2026-07-14). Hvis det IKKE var meningen, skal han sættes tilbage til ikke-godkendt manuelt — enten via den nye "Godkend brugere"-side (kræver den nye kode er uploadet), eller direkte i Supabase: `update profiles set approved = false where username = 'mrbuuuzzz';`
2. Upload `Jernlog App/index.html` til GitHub-repoet (erstat den gamle) — ikonfilen skal **ikke** uploades igen, kun hvis den selv ændres
4. Test hele flowet på telefonen: opret en test-konto, bekræft email (tjek om 404 stadig sker), tjek at den nye konto rammer "venter på godkendelse"
5. Godkend test-kontoen fra din egen konto under "Godkend brugere"
6. Test resten: scroll til bunden af feedet og kommentér, skift mellem alle 5 bundnav-faner uden hop, PR-farve, Skift-knap

## Sådan bruges denne fil
Ved start af ny chat om app'en: peg AI'en på denne fil ("læs PROGRESS.md og fortsæt derfra").
Efter hver session: opdater "Status" og "Næste skridt" ovenfor, og gem filen i GitHub-repo'en (eller projektets Context).
