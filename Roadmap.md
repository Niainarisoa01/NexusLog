# Roadmap de Développement — NexusLog

Ce document de référence décrit la trajectoire de développement complète, structurée par phases, sections de travail, livrables finaux et **points de validation techniques** pour certifier que la section est fonctionnelle avant de passer à la suite.

> **Contexte concurrentiel** : NexusLog vise à combler un gap unique dans le marché — combiner la puissance des CLI Rust (Hayabusa, Chainsaw, evtx_dump) avec l'ergonomie d'une GUI desktop native. Le concurrent le plus proche est EVTX Web (WASM), mais il ne peut pas faire de surveillance Live ni offrir une expérience desktop native. La rapidité d'exécution est critique.

---

## Phase 0 : Fondations et Architecture Core (Semaines 1-2)

**Livrable de Phase :** Un exécutable en ligne de commande (CLI Rust) capable de parser sans erreur un fichier `.evtx` lourd (500 Mo) en moins de 5 secondes, d'exporter le log structuré en JSON, et de fonctionner sur Windows ET Linux/macOS.

### Section 1. Initialisation du Socle Technique
- **Tâches :**
  - Génération du workspace Tauri v2 (`cargo tauri init`) dans le projet existant.
  - Mise en place de `Next.js` (App Router avec mode Static Export) avec `React` et `TypeScript` pour le frontend.
  - Nettoyage des composants de base. Création et structuration des dossiers (`engine`, `commands`, `plugins`, `db`, `components`, `hooks`, `store`, `i18n`, `types`, `styles`).
  - Configuration de la compilation conditionnelle (`cfg(windows)`) pour isoler les dépendances WinAPI.
  - Scaffolding de l'architecture i18n : installation de `react-i18next` + `i18next`, création des fichiers de traduction vides `en.json` et `fr.json`.
- **Points de Validation (Checklist) :**
  - [ ] Les commandes `cargo check` et `npm run dev` s'exécutent sans aucune erreur.
  - [ ] L'application de bureau s'ouvre avec un simple écran blanc/Hello World sans console errors.
  - [ ] `cargo check` réussit sur Windows, Linux ET macOS (CI matrix).
  - [ ] Le scaffolding i18n est en place : `react-i18next` est configuré et un texte de test s'affiche traduit en EN/FR.

### Section 2. Modélisation Stricte des Données
- **Tâches :**
  - **Backend :** Définition en Rust des objets centraux : `EventRecord` (incluant `record_id`, `event_id`, `timestamp`, `level`, `source_file`, `sigma_matches`), `EventLevel`, `FilterQuery`, `EventChunk`, `PaginationRequest`, `SigmaMatch`, `SigmaSeverity`.
  - Intégration des implémentations de sérialisation `serde`.
  - **Frontend :** Création des interfaces TypeScript associées dans `src/types/models.ts` et `src/types/filters.ts`.
- **Points de Validation (Checklist) :**
  - [ ] Le struct `EventRecord` compile intégralement avec ses attributs `derive(Serialize, Deserialize)`.
  - [ ] L'interface `EventRecord` TypeScript reflète la version Rust au type strict (zéro `any`).
  - [ ] Les types `EventChunk`, `PaginationRequest` et `SigmaMatch` sont définis côté Rust et TypeScript.

### Section 3. Développement du Parseur `.evtx` (Rust)
- **Tâches :**
  - Intégration de la librairie d'abstraction `evtx` et refactoring pour implémenter la parallélisation `rayon`.
  - Conversion brute des données extraites en tableau JSON asynchrone protégé.
  - Implémentation du mode **streaming / chunked** dans `engine/streaming.rs` : envoi d'événements par lots de 5000 via `flume` bounded channel pour contrôler la mémoire.
  - Test de portabilité **cross-platform** : exécuter le parser sur Linux et macOS en CI.
- **Points de Validation (Checklist) :**
  - [ ] L'exécution d'un fichier `.rs` de test ou d'un CLI lit un fichier `Security.evtx` de 500Mo.
  - [ ] Le temps total de traitement affiché dans le terminal est intrinsèquement **inférieur à 5 secondes**.
  - [ ] Le compte d'événements affiché matche à l'unité près avec le compte natif Windows Event Viewer.
  - [ ] **Benchmark mémoire** : le chargement en mode streaming d'un fichier de 1 Go ne fait pas dépasser **800 Mo de RAM** (pic).
  - [ ] Le même binaire CLI parse un fichier `.evtx` **sans erreur sur Linux** (testé en CI GitHub Actions Ubuntu).

### Section 4. Pipeline et Outillages de Base
- **Tâches :**
  - Configuration propre de la gestion d'erreurs Rust avec `thiserror`.
  - Configuration de la chaîne CI pour le backend (`cargo clippy` et `cargo test`).
  - **Configuration CI cross-platform** : matrice GitHub Actions avec `windows-latest`, `ubuntu-latest`, `macos-latest`.
  - Installation de `cargo audit` dans le pipeline CI pour la détection de vulnérabilités.
- **Points de Validation (Checklist) :**
  - [ ] Le pipeline `cargo clippy` ressort vierge (0 warnings ou erreurs soulevées).
  - [ ] Les mauvaises routes de fichiers passées au parser sont traitées gracieusement et ressortent en chaînes `String` d'erreurs propres sans causer de "panic".
  - [ ] `cargo audit` ne signale aucune vulnérabilité critique dans les dépendances.
  - [ ] Le CI passe sur les 3 OS (Windows, Linux, macOS).

---

## Phase 1 : MVP Interface Graphique (Semaines 3-5)

**Livrable de Phase :** L'application de bureau Tauri avec une interface graphique fonctionnelle et visuellement impressionnante chargeant un fichier `.evtx` local. Scrollez dans le tableau et cliquez sur un événement. L'interface est traduite en EN/FR et navigable au clavier.

### Section 1. Couche de Communication IPC (Inter-Process)
- **Tâches :**
  - Backend : Commande `load_file_command.rs` lisant le fichier avec support streaming (envoi progressif de chunks via Tauri Events).
  - Backend : Commande `get_page` pour la pagination côté backend (offset + limit).
  - Frontend : Hook personnalisé `useEventLog.ts` pour appeler `invoke('load_file', {path})` et écouter les chunks streamés.
  - Frontend : Hook `usePagination.ts` pour la navigation dans les résultats paginés.
- **Points de Validation (Checklist) :**
  - [ ] Un appel simulé au payload IPC depuis la console React retourne parfaitement sur le navigateur un Array JSON remplissant les critères du `EventRecord`.
  - [ ] Le streaming fonctionne : une barre de progression s'affiche pendant le chargement d'un fichier de 500 Mo, les événements apparaissent progressivement.

### Section 2. UX et Design Premium (React)
- **Tâches :**
  - Conception du **Layout premium** : Header métier avec logo/titre, Sidebar gauche collapsible (fichiers/canaux), Zone Centrale fluide (80%+), Panneau détail droit/inférieur collapsible.
  - **Design system** : définition des tokens CSS (couleurs, spacing, ombres, border-radius) dans `styles/globals.css`.
  - **Dark mode par défaut** avec toggle clair/sombre. Respect de `prefers-color-scheme`.
  - Micro-animations : transitions sur hover, slide-in pour le panneau détail, fade-in pour les résultats filtrés.
  - Glassmorphism subtil sur les panneaux et la sidebar.
  - **Typographie premium** : intégration Google Fonts (Inter ou Outfit).
- **Points de Validation (Checklist) :**
  - [ ] Les conteneurs CSS / Flexbox sont "responsive" (redimensionnement de fenêtre fluide).
  - [ ] Aucun débordement (overflow) visuel non contrôlé (comme les barres d'ascenseurs doubles).
  - [ ] Le dark mode fonctionne et se bascule sans rechargement.
  - [ ] Le design provoque un **effet "WOW"** par rapport à l'Event Viewer natif (validation subjective par au moins 2 personnes externes).

### Section 3. Le Cœur de l'Outil : L'Event Table (React)
- **Tâches :**
  - Implémentation du système de scroll virtuel via `@tanstack/react-virtual`.
  - Configuration des colonnes redimensionnables : Date/Heure, Niveau (badge coloré animé), EventID, Source (Provider), Description (tronquée), Ordinateur.
  - Badges de niveau avec coding couleur : rouge pulsé (Critical), rouge (Error), orange (Warning), gris (Info), gris clair (Verbose).
  - Tri par colonne (click sur header).
- **Points de Validation (Checklist) :**
  - [ ] Injection d'un tableau moqué de **100 000 lignes** en mémoire locale.
  - [ ] Le scroll manuel à la molette garde l'application collée à **60 FPS** (Vérifié via l'outil Performance Chrome).
  - [ ] Les badges de niveau sont visuellement distincts et les couleurs sont cohérentes avec le thème.

### Section 4. Outils de Filtrage Basique et Détails
- **Tâches :**
  - Composant `DetailPanel.tsx` : Interception du clic, formatage de l'objet complet. **4 onglets** : Général, Données (clé/valeur), XML brut (coloration syntaxique), Contexte (N événements avant/après).
  - Barre `FilterBar.tsx` pour tri local en mémoire Frontend (niveau d'erreur, plage de dates, EventID, provider).
  - Composant `FileDropZone.tsx` : drag & drop de fichiers `.evtx` avec animation de réception.
- **Points de Validation (Checklist) :**
  - [ ] Cliquer sur une ligne ouvre sans latence les détails complexes complets sur la zone latérale (avec animation slide-in).
  - [ ] L'application d'un filtre sur le niveau "Error" masque instantanément les lignes "Info" du tableau.
  - [ ] Le drag & drop d'un fichier `.evtx` déclenche le chargement automatique.
  - [ ] Les 4 onglets du panneau détail fonctionnent et affichent les données correctement.

### Section 5. Internationalisation et Accessibilité
- **Tâches :**
  - **i18n** : Traduction complète de toute l'interface en EN et FR. Toutes les chaînes visibles passent par `react-i18next`. Sélecteur de langue dans les paramètres.
  - **Accessibilité (a11y)** : ARIA labels sur tous les boutons, inputs et éléments interactifs. Navigation clavier complète (Tab, Shift+Tab, Enter, Esc, flèches dans le tableau). Focus visible sur tous les éléments. Contraste WCAG AA minimum (4.5:1 pour texte normal).
  - Raccourcis clavier : `Ctrl+O` ouvrir fichier, `Ctrl+F` recherche, `Esc` fermer panneau détail.
- **Points de Validation (Checklist) :**
  - [ ] Le changement de langue EN ↔ FR fonctionne sans rechargement de page.
  - [ ] **Zéro texte en dur** visible dans le code source des composants — tout passe par les clés i18n.
  - [ ] Navigation complète de l'application au **clavier seul** (sans souris) : ouvrir fichier → naviguer dans le tableau → ouvrir détail → filtrer → fermer détail.
  - [ ] Le test d'accessibilité automatisé (axe-core ou Lighthouse) retourne un score ≥ 90.

---

## Phase 2 : Moteur de Recherche et Temps Réel (Semaines 6-9)

**Livrable de Phase :** Dashboard connecté en direct aux logs systèmes de la machine locale (Windows) avec capacité de recherche Full-Text algorithmique. Streaming opérationnel pour les fichiers > 1 Go. Mode fichier fonctionnel sur Linux/macOS.

### Section 1. Surveillance Temps Réel (Live Windows) — Windows Only
- **Tâches :**
  - Backend : Module d'écoute `EvtSubscribe` asynchrone via `tokio` et `windows-rs`, protégé par `cfg(windows)`.
  - Frontend : Écoute du canal Tauri Events (`appWindow.listen('new-log')`).
  - Gestion du `watch_id` (UUID) pour démarrer/arrêter la surveillance par canal.
  - **Graceful degradation** : sur Linux/macOS, le bouton "Live" est désactivé avec un tooltip explicatif ("Live monitoring is only available on Windows").
  - **Gestion des permissions** : si l'utilisateur n'a pas les droits admin, afficher les canaux publics (Application, System) et griser Security avec message explicatif.
- **Points de Validation (Checklist) :**
  - [ ] Lorsqu'on ouvre de force un exécutable tiers non autorisé dans l'OS, un nouveau log s'affiche tout seul dans le viewer NexusLog en l'espace d'une seconde sans recharger la page.
  - [ ] Le start/stop de la surveillance fonctionne proprement (pas de fuites de handles ou de threads).
  - [ ] Sur Linux, l'interface affiche clairement que le mode Live n'est pas disponible sans crash.
  - [ ] Sans droits admin, les canaux publics fonctionnent et les canaux protégés sont grisés.

### Section 2. Intégration du Moteur d'Indexation `Tantivy`
- **Tâches :**
  - Indexation silencieuse en background des champs capitaux (Messages, Providers, Computer, UserID, EventData) par le moteur externe `tantivy`.
  - Index partitionné par fichier source pour la scalabilité (éviter un index monolithique > 5M événements).
  - Gestion du cycle de vie de l'index : création, mise à jour (mode Live), suppression quand le fichier est fermé.
- **Points de Validation (Checklist) :**
  - [ ] À l'ouverture d'un nouveau fichier de 500Mo, un dossier d'index local compressé se crée en background.
  - [ ] Le Process Manager n'indique aucune fuite de mémoire (RAM flat) à la fin de la génération d'index.
  - [ ] L'index d'un fichier de 500k événements occupe moins de 200 Mo sur disque.
  - [ ] La fermeture d'un fichier libère proprement l'index associé.

### Section 3. Mode Recherche UI et Optimisation
- **Tâches :**
  - Ajout du composant `SearchBar.tsx` avec barre de requête full-text.
  - Support des opérateurs booléens (AND, OR, NOT) et des wildcards (*).
  - Highlighting des termes recherchés dans les résultats.
  - Debounce intelligent (300ms) pour la recherche en temps réel.
- **Points de Validation (Checklist) :**
  - [ ] En entrant un mot arbitraire (ex: `failed_login`) au milieu de centaines de mégas, les résultats retournés apparaissent dans la table événementielle en **moins de 300 millisecondes**.
  - [ ] Les termes trouvés sont mis en surbrillance dans la colonne Description.
  - [ ] Les opérateurs booléens (`failed AND login`, `error OR warning`) fonctionnent correctement.

### Section 4. Streaming Productionnel et Gestion Mémoire
- **Tâches :**
  - Finalisation du mode streaming avec back-pressure (`flume` bounded channels, taille 4).
  - Barre de progression UI avec pourcentage, nombre d'événements chargés, et estimation du temps restant.
  - Pagination côté backend : le frontend demande des "fenêtres" de résultats (`offset` + `limit`) au lieu de tout charger en mémoire.
  - Bouton "Annuler" pendant le chargement streaming.
- **Points de Validation (Checklist) :**
  - [ ] Un fichier de 1.5 Go se charge en streaming sans dépasser **800 Mo de RAM** (pic).
  - [ ] La barre de progression reflète fidèlement l'avancement réel du parsing.
  - [ ] Le bouton "Annuler" interrompt proprement le chargement sans crash ni fuite mémoire.
  - [ ] Après annulation, la mémoire est libérée et l'application reste réactive.

---

## Phase 3 : Fonctionnalités Pro et Analyse DFIR (Semaines 10-14)

**Livrable de Phase :** Application `v1.0 Stable` parée pour l'export, la détection de menaces Sigma, prête à répondre aux besoins d'ingénierie forensique avec Corrélation, Mode Expert et Dashboard statistique.

### Section 1. Mode Expert PowerShell / XML (XPath)
- **Tâches :**
  - Support syntaxique du filtre `XPath` via backend et éditeur code embarqué UI frontend (Monaco Editor).
  - Coloration syntaxique XPath en temps réel.
  - Validation et messages d'erreur explicites pour les requêtes mal formées.
  - Historique des requêtes (stocké localement en SQLite).
- **Points de Validation (Checklist) :**
  - [ ] Saisir manuellement la query `*[System[(Level=1)]]` dans l'outil remonte strictement la même matrice d'événements critiques (Error) que l'Event Viewer natif sur la même machine.
  - [ ] La coloration syntaxique fonctionne et une requête invalide affiche un message d'erreur clair.
  - [ ] L'historique des requêtes est persisté entre les sessions.

### Section 2. Détection Sigma Rules (DFIR)
- **Tâches :**
  - Intégration du moteur Sigma dans `engine/sigma.rs` avec évaluation parallélisée (rayon).
  - Embarquement d'un jeu de règles Sigma par défaut (Top 100 Windows rules depuis SigmaHQ).
  - Interface d'import de règles Sigma personnalisées (fichiers YAML).
  - Composant `SigmaPanel.tsx` : résumé des détections par sévérité (Critical/High/Medium/Low), liste des règles matchées avec tags MITRE ATT&CK.
  - Colonne "Sigma" dans le tableau principal : icône d'alerte avec tooltip.
  - Évaluation Sigma en temps réel en mode Live (chaque nouvel événement est évalué contre les règles actives).
  - Interface de gestion des règles : activer/désactiver, muter les faux positifs, ajouter des exceptions.
  - Export dédié des résultats Sigma en rapport (JSON, CSV, HTML).
- **Points de Validation (Checklist) :**
  - [ ] L'ouverture d'un fichier contenant des événements `4625` (échec de connexion) déclenche la détection de la règle Sigma correspondante.
  - [ ] Le panneau Sigma affiche correctement le résumé : nombre de détections par sévérité, liste des règles matchées.
  - [ ] L'import d'un fichier YAML Sigma personnalisé fonctionne et la règle est immédiatement active.
  - [ ] L'évaluation de 100 règles sur 500k événements se termine en **moins de 5 secondes**.
  - [ ] En mode Live, un événement suspect est immédiatement flaggé Sigma avec notification visuelle.
  - [ ] La désactivation d'une règle Sigma supprime ses détections du panneau sans recharger le fichier.

### Section 3. Corrélation Multi-Fichiers (Investigation)
- **Tâches :**
  - Intégration séquentielle de charges simultanées `.evtx` sur une route temporelle absolue unifiée.
  - Chaque source est différenciée par couleur et label dans la timeline.
  - Composant `Timeline.tsx` : vue chronologique visuelle avec zoom et navigation.
  - Fonction "Contexte" : afficher les N événements avant/après un événement donné, à travers toutes les sources.
- **Points de Validation (Checklist) :**
  - [ ] L'application sait croiser et imbriquer chronologiquement un événement provenant de `Machine_A_System.evtx` entre deux événements de `Machine_B_Security.evtx`, triés parfaitement par Timestamp `ISO 8601`.
  - [ ] Les sources sont visuellement distinguées (couleur, label) dans le tableau et la timeline.
  - [ ] La fonction "Contexte" affiche les événements adjacents à travers toutes les sources.

### Section 4. Export Structuré et Statistiques
- **Tâches :**
  - **Export multi-format :**
    - JSON (pretty-print)
    - JSONL / JSON Lines (compatible Elasticsearch Bulk API, Splunk HEC, Timesketch)
    - CSV formaté avec headers configurables (colonnes sélectionnables)
    - HTML rapport (résumé statistique + tableau événements critiques + détections Sigma)
  - **Dashboard statistique** (composant `Dashboard.tsx`) :
    - Graphique bâtons : répartition par niveau (couleurs Critical/Error/Warning/Info/Verbose)
    - Top 10 EventIDs les plus fréquents
    - Top 10 Providers
    - Timeline d'activité par heure/jour (densité d'événements)
    - Résumé Sigma : compteurs par sévérité
    - Métriques techniques : total, plage de dates, taille fichier
  - Bibliothèque graphique : `recharts` pour les visualisations.
- **Points de Validation (Checklist) :**
  - [ ] Un clic sur "Exporter CSV" génère un fichier sur le bureau Windows avec des headers structurés, qui s'ouvre proprement dans Excel / Sheets.
  - [ ] L'export JSONL produit un fichier importable directement dans Elasticsearch (testé avec `curl -XPOST`).
  - [ ] Le rapport HTML contient un résumé lisible des statistiques et des détections Sigma.
  - [ ] Les graphiques reflètent précisément (ex: 20% rouge, 80% gris) la pondération des filtres actifs en cours.
  - [ ] Le dashboard se met à jour en temps réel quand des filtres sont appliqués.

### Section 5. Système d'Alertes
- **Tâches :**
  - Stockage SQLite (`rusqlite`) local : règles d'alertes, historique des notifications, bookmarks.
  - Types de conditions d'alerte : EventID, niveau minimum, pattern de message, règle Sigma, conditions composites (AND/OR).
  - Appel notification système natif via Tauri notification plugin.
  - Composant `AlertManager.tsx` : CRUD des règles d'alertes.
  - Historique des alertes déclenchées.
- **Points de Validation (Checklist) :**
  - [ ] Créer une alerte sur "EventID = 4625". Si l'événement survient sur le canal en écoute Live (`Security`), l'application lance la bulle de notification typique de Windows au coin de l'écran.
  - [ ] Les alertes basées sur une règle Sigma se déclenchent correctement.
  - [ ] L'historique des alertes est consultable et persisté entre les sessions.
  - [ ] La désactivation d'une alerte arrête les notifications sans supprimer la règle.

### Section 6. Système de Plugins (Extensibilité)
- **Tâches :**
  - Définition de l'API `NexusLogPlugin` (trait Rust).
  - Système de chargement de plugins depuis un répertoire configurable.
  - Types de plugins supportés : parseurs de formats additionnels, formats d'export custom, enrichissement d'événements.
  - Documentation de l'API plugins pour la communauté.
- **Points de Validation (Checklist) :**
  - [ ] Un plugin d'exemple (ex: "GeoIP Enricher" fictif) peut être chargé et enrichit un champ `EventRecord`.
  - [ ] L'API de plugin est documentée avec un exemple fonctionnel dans le wiki.
  - [ ] Un plugin défectueux est isolé et ne crash pas l'application principale.

---

## Phase 4 : Distribution, CI/CD et Publication (Semaines 15-16)

**Livrable de Phase :** Fichiers exécutables autonomes installables pour Windows (`.exe`/`.msi`), Linux (`.AppImage`/`.deb`) et macOS (`.dmg`), incluant l'updater en temps réel. Soumission préventive aux antivirus réalisée.

### Section 1. Packaging Multi-Plateforme
- **Tâches :**
  - Build final des assets compressés via le compilateur natif Tauri (`tauri.conf.json`).
  - **Windows** : installeur NSIS (`.exe` et `.msi`), **signature de code** (Code Signing Certificate ~200$/an).
  - **Linux** : `.AppImage` (portable) et `.deb` (Debian/Ubuntu). Mode fichier uniquement, Live désactivé.
  - **macOS** : `.dmg` avec icône et info.plist. Mode fichier uniquement, Live désactivé.
  - Documentation claire des **différences par plateforme** (Live = Windows only).
- **Points de Validation (Checklist) :**
  - [ ] L'exécution de `cargo tauri build` réussit de bout-en-bout sans péter en Release sur les 3 OS.
  - [ ] L'installateur Windows final créé (`NexusLog_1.0.0_setup.exe`) s'exécute proprement en sandbox ou sur une VM neuve sans requérir Node.js ni Rust chez l'utilisateur final. L'icône est présente sur le bureau.
  - [ ] L'AppImage Linux s'exécute sur Ubuntu 22.04+ sans dépendance externe.
  - [ ] Le `.dmg` macOS s'ouvre et l'application se lance sans erreur Gatekeeper (signée).
  - [ ] Sur Linux/macOS, le mode Live est proprement désactivé dans l'interface avec un message explicatif.

### Section 2. Soumission Antivirus et Signature
- **Tâches :**
  - Acquisition d'un certificat de signature de code (DigiCert, Sectigo ou équivalent).
  - Signature du binaire Windows avec le certificat.
  - **Soumission préventive aux éditeurs antivirus** avant la release publique :
    - Microsoft : soumission via [Microsoft Security Intelligence](https://www.microsoft.com/en-us/wdsi/filesubmission)
    - Kaspersky, ESET, Avast/AVG : soumission de faux positifs
    - VirusTotal : upload pour vérification globale
  - Test d'installation sur VM vierge avec Windows Defender actif.
- **Points de Validation (Checklist) :**
  - [ ] Le binaire signé est reconnu comme "Publisher: NexusLog" dans les propriétés Windows.
  - [ ] Windows Defender ne bloque PAS l'installation sur une VM Windows 11 fraîche.
  - [ ] Le score VirusTotal est ≤ 2 détections (faux positifs résiduels acceptables).

### Section 3. Auto-Updater
- **Tâches :**
  - Intégration du module `tauri-plugin-updater` synchronisé avec GitHub Releases.
  - Vérification automatique au démarrage (configurable : auto, manuelle, désactivée).
  - Notification non-intrusive avec changelog affiché.
- **Points de Validation (Checklist) :**
  - [ ] En mode test local d'un serveur fictif mock, l'application repère une version plus grande, l'invite UI de mise à jour s'affiche, et le restart actualise bien la version interne de l'application.
  - [ ] L'utilisateur peut désactiver la vérification automatique dans les paramètres.

### Section 4. Distribution sur les Stores et Package Managers
- **Tâches :**
  - **Windows** : publication sur `winget` et Chocolatey.
  - **macOS** : publication sur Homebrew (cask).
  - **Linux** : publication sur Flathub et/ou snap.
  - Publication sur GitHub Releases avec assets pour les 3 OS.
- **Points de Validation (Checklist) :**
  - [ ] `winget install NexusLog` installe l'application correctement sur Windows.
  - [ ] `brew install --cask nexuslog` installe l'application sur macOS.
  - [ ] Le manifest winget est accepté dans le repository winget-pkgs.

### Section 5. Documentation, Marketing et Clôture
- **Tâches :**
  - **README.md professionnel** : GIFs animés des features clés, badges CI, comparaison avec l'Event Viewer, guide d'installation rapide.
  - **Wiki GitHub** : guide d'utilisation complet, guide de contribution, documentation API plugins.
  - **CHANGELOG.md** maintenu avec Conventional Commits.
  - **Vidéo de démonstration** : comparaison côte-à-côte NexusLog vs Event Viewer (YouTube).
  - **Article de blog** : "Parsing 1M Windows events in 3 seconds with Rust" (dev.to, Medium, blog personnel).
  - **Posts communautaires** : `r/rust`, `r/sysadmin`, `r/netsec`, `r/dfir`, Hacker News (Show HN).
  - **Audit de sécurité** : `cargo audit` + `npm audit`, revue des permissions Tauri.
  - **Getting Started** : guide pour qu'un développeur inconnu puisse builder le projet en < 10 minutes.
- **Points de Validation (Checklist) :**
  - [ ] Aucune dépendance obsolète contenant une vulnérabilité critique listée par `npm audit` ou `cargo audit`.
  - [ ] Le repository public contient un guide visuel explicite pour qu'un développeur inconnu puisse builder le projet chez lui en suivant un strict `Getting Started`.
  - [ ] Le README contient au moins 3 GIFs/captures animées montrant les features clés.
  - [ ] L'article de blog est publié et partagé sur au moins 2 plateformes communautaires.
  - [ ] Le post Hacker News (Show HN) est soumis le jour de la release.

---

## Résumé des Livrables par Phase

| Phase | Semaines | Livrable Principal | Plateformes |
| --- | --- | --- | --- |
| **Phase 0** | 1-2 | CLI Rust fonctionnel + parser validé | Windows, Linux, macOS |
| **Phase 1** | 3-5 | App Tauri v0.1 — GUI premium, filtres, i18n, a11y | Windows (Linux/macOS mode fichier) |
| **Phase 2** | 6-9 | v0.2 Beta — Live + Search + Streaming | Windows (Live), All (fichier) |
| **Phase 3** | 10-14 | v1.0 Stable — Sigma, Corrélation, Export, Alertes, Plugins | Windows (complet), All (fichier) |
| **Phase 4** | 15-16 | Release publique — Installeurs, Stores, Documentation | Windows, Linux, macOS |

---

## Métriques de Succès Globales

| Métrique | Objectif à 3 mois post-release | Objectif à 12 mois |
| --- | --- | --- |
| GitHub Stars | 500+ | 3000+ |
| Downloads (GitHub Releases) | 2000+ | 15000+ |
| Contributors | 5+ | 20+ |
| Issues ouvertes/closes | Ratio close > 80% | Ratio close > 85% |
| Règles Sigma embarquées | 100+ | 300+ |
| Langues supportées (i18n) | 2 (EN, FR) | 5+ (communauté) |
| Score accessibilité (Lighthouse) | ≥ 90 | ≥ 95 |
