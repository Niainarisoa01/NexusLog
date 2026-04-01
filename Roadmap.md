# Roadmap de Développement — EventLens (NexusLog)

Ce document de référence décrit la trajectoire de développement complète, structurée par phases, sections de travail, livrables finaux et **points de validation techniques** pour certifier que la section est fonctionnelle avant de passer à la suite.

---

## Phase 0 : Fondations et Architecture Core (Semaines 1-2)

**Livrable de Phase :** Un exécutable en ligne de commande (CLI Rust) capable de parser sans erreur un fichier `.evtx` lourd (500 Mo) en moins de 5 secondes et d'exporter le log structuré en JSON.

### Section 1. Initialisation du Socle Technique
- **Tâches :**
  - Génération du workspace Tauri v2 (`cargo tauri init`) dans le projet existant.
  - Mise en place de `Next.js` (App Router avec mode Static Export) avec `React` et `TypeScript` pour le frontend.
  - Nettoyage des composants de base. Création et structuration des dossiers (`engine`, `components`, `hooks`, `app`).
- **Points de Validation (Checklist) :**
  - [ ] Les commandes `cargo check` et `npm run dev` s'exécutent sans aucune erreur.
  - [ ] L'application de bureau s'ouvre avec un simple écran blanc/Hello World sans console errors.

### Section 2. Modélisation Stricte des Données
- **Tâches :**
  - **Backend :** Définition en Rust de l'objet central `EventRecord` (incluant `record_id`, `event_id`, `timestamp`, `level`, etc.).
  - Intégration des implémentations de sérialisation `serde`.
  - **Frontend :** Création des interfaces TypeScript associées dans `src/types/models.ts`.
- **Points de Validation (Checklist) :**
  - [ ] Le struct `EventRecord` compile intégralement avec ses attributs `derive(Serialize, Deserialize)`.
  - [ ] L'interface `EventRecord` TypeScript reflète la version Rust au type strict (zéro `any`).

### Section 3. Développement du Parseur `.evtx` (Rust)
- **Tâches :**
  - Intégration de la librairie d'abstraction `evtx` et refactoring pour implémenter la parallélisation `rayon`.
  - Conversion brute des données extraites en tableau JSON asynchrone protégé.
- **Points de Validation (Checklist) :**
  - [ ] L'exécution d'un fichier `.rs` de test ou d'un CLI lit un fichier `Security.evtx` de 500Mo.
  - [ ] Le temps total de traitement affiché dans le terminal est intrinsèquement **inférieur à 5 secondes**.
  - [ ] Le compte d'événements affiché matche à l'unité près avec le compte natif Windows Event Viewer.

### Section 4. Pipeline et Outillages de Base
- **Tâches :**
  - Configuration propre de la gestion d'erreurs Rust avec `thiserror`.
  - Configuration de la chaîne CI pour le backend (`cargo clippy` et `cargo test`).
- **Points de Validation (Checklist) :**
  - [ ] Le pipeline `cargo clippy` ressort vierge (0 warnings ou erreurs soulevées).
  - [ ] Les mauvaises routes de fichiers passées au parser sont traitées gracieusement et ressortent en chaînes `String` d'erreurs propres sans causer de "panic".

---

## Phase 1 : MVP Interface Graphique (Semaines 3-5)

**Livrable de Phase :** L'application de bureau Tauri avec une interface graphique fonctionnelle chargeant un fichier `.evtx` local. Scrollez dans le tableau et cliquez sur un événement.

### Section 1. Couche de Communication IPC (Inter-Process)
- **Tâches :**
  - Backend : Commande `load_file_command.rs` lisant le fichier.
  - Frontend : Hook personnalisé `useEventLog.ts` pour appeler `invoke('load_file', {path})`.
- **Points de Validation (Checklist) :**
  - [ ] Un appel simulé au payload IPC depuis la console React retourne parfaitement sur le navigateur un Array JSON remplissant les critères du `EventRecord`.

### Section 2. UX et Composants Haut Niveau (React)
- **Tâches :**
  - Conception du Layout : Header métier, Sidebar éventuelle, Zone Centrale fluide, Panneau latéral dynamique.
- **Points de Validation (Checklist) :**
  - [ ] Les conteneurs CSS / Flexbox sont "responsive" (redimensionnement de fenêtre fluide).
  - [ ] Aucun débordement (overflow) visuel non contrôlé (comme les barres d'ascenseurs doubles).

### Section 3. Le Cœur de l'Outil : L'Event Table (React)
- **Tâches :**
  - Implémentation du système de scroll virtuel via `@tanstack/react-virtual`.
  - Configuration des colonnes (Niveau, IDs, Sources, Descriptions courtes).
- **Points de Validation (Checklist) :**
  - [ ] Injection d'un tableau moqué de **100 000 lignes** en mémoire locale.
  - [ ] Le scroll manuel à la molette garde l'application collée à **60 FPS** (Vérifié via l'outil Performance Chrome).

### Section 4. Outils de Filtrage Basique et Détails
- **Tâches :**
  - Composant `DetailPanel.tsx` : Interception du clic, formatage de l'objet complet.
  - Barre `FilterBar.tsx` pour tri local en mémoire Frontend (ex: niveau d'erreur).
- **Points de Validation (Checklist) :**
  - [ ] Cliquer sur une ligne ouvre sans latence les détails complexes complets sur la zone latérale.
  - [ ] L'application d'un filtre sur le niveau "Error" masque instanément les lignes "Info" du tableau.

---

## Phase 2 : Moteur de Recherche et Temps Réel (Semaines 6-9)

**Livrable de Phase :** Dashboard connecté en direct aux logs systèmes de la machine locale avec capacité de recherche Full-Text algorithmique.

### Section 1. Surveillance Temps Réel (Live Windows)
- **Tâches :**
  - Backend : Module d'écoute `EvtSubscribe` asynchrone via `tokio` et `windows-rs`.
  - Frontend : Écoute du canal WebSocket (`appWindow.listen('new-log')`).
- **Points de Validation (Checklist) :**
  - [ ] Lorsqu'on ouvre de force un exécutable tiers non autorisé dans l'OS, un nouveau log s'affiche tout seul dans le viewer EventLens en l'espace d'une seconde sans recharger la page.

### Section 2. Intégration du Moteur d'Indexation `Tantivy`
- **Tâches :**
  - Indexation silencieuse des champs capitaux (Messages, Providers) par le moteur externe `tantivy`.
- **Points de Validation (Checklist) :**
  - [ ] À l'ouverture d'un nouveau fichier de 500Mo, un dossier d'index local compressé se crée.
  - [ ] Le Process Manager n'indique aucune fuite de mémoire (RAM flat) à la fin de la génération d'index.

### Section 3. Mode Recherche UI et Optimisation
- **Tâches :**
  - Ajout d'une barre de requête et exécution de requêtes par mots croisés vers l'index.
- **Points de Validation (Checklist) :**
  - [ ] En entrant un mot arbitraire (ex: `failed_login`) au milieu de centaines de mégas, les résultats retournés apparaissent dans la table événementielle en **moins de 300 millisecondes**.

---

## Phase 3 : Fonctionnalités Pro et Analyse DFIR (Semaines 10-14)

**Livrable de Phase :** Application `v1.0 Stable` parée pour l'export, prête à répondre aux besoins d'ingénierie forensique avec Corrélation et Mode Expert.

### Section 1. Mode Expert PowerShell / XML (XPath)
- **Tâches :**
  - Support syntaxique du filtre `XPath` via backend et éditeur code embarqué UI frontend.
- **Points de Validation (Checklist) :**
  - [ ] Saisir manuellement la query `*[System[(Level=1)]]` dans l'outil remonte strictement la même matrice d'événements critiques (Error) que l'Event Viewer natif sur la même machine.

### Section 2. Corrélation Multi-Fichiers (Investigation)
- **Tâches :**
  - Intégration séquentielle de charges simultanées `.evtx` sur une route temporelle absolue unifiée.
- **Points de Validation (Checklist) :**
  - [ ] L'application sait croiser et imbriquer chronologiquement un événement provenant de `Machine_A_System.evtx` entre deux événements de `Machine_B_Security.evtx`, triés parfaitement par Timestamp `ISO 8601`.

### Section 3. Export Structuré et Statistiques
- **Tâches :**
  - Enregistrement brut en JsonLines (ElasticSearch) et CSV formaté.
  - Graphes (Pie Chart, Timeline Bar) basiques.
- **Points de Validation (Checklist) :**
  - [ ] Un clic sur "Exporter CSV" génère un fichier sur le bureau Windows avec des headers structurés, qui s'ouvre proprement dans Excel / Sheets.
  - [ ] Les graphiques reflètent précisément (ex: 20% rouge, 80% gris) la pondération des filtres actifs en cours.

### Section 4. Système d'Alertes 
- **Tâches :**
  - Stockage SQLite (`rusqlite`) local et appel notification système Windows Natif.
- **Points de Validation (Checklist) :**
  - [ ] Créer une alerte sur "EventID = 4625". Si l'événement survient sur le canal en écoute Live (`Security`), l'application lance la bulle de notification typique de Windows au coin de l'écran.

---

## Phase 4 : Distribution, CI/CD et Publication (Semaines 15-16)

**Livrable de Phase :** Fichier exécutable (`.exe` ou `.msi`) autonome installable, incluant l'updater en temps réel.

### Section 1. Packaging Windows NSIS 
- **Tâches :**
  - Build final des assets compressés via le compilateur natif Tauri (`tauri.conf.json`).
- **Points de Validation (Checklist) :**
  - [ ] L'exécution de `cargo tauri build` réussit de bout-en-bout sans péter en Release.
  - [ ] L'installateur final créé (`EventLens_1.0.0_setup.exe`) s'exécute proprement en sandbox ou sur une VM neuve sans requérir Node.js ni Rust chez l'utilisateur final. L'icône est présente sur le bureau.

### Section 2. Auto-Updater
- **Tâches :**
  - Intégration du module `tauri-plugin-updater` synchronisé (Release GitHub par ex).
- **Points de Validation (Checklist) :**
  - [ ] En mode test local d'un serveur fictif mock, l'application repère une version plus grande, l'invite UI de mise à jour s'affiche, et le restart actualise bien la version interne de l'application.

### Section 3. Documentation et Clôture
- **Tâches :**
  - Rédactions finales (Notices `README.md`, logs CHANGELOG). Audit global de failles éventuelles.
- **Points de Validation (Checklist) :**
  - [ ] Aucune dépendance obsolète contenant une vulénerabilité critique listée par `npm audit` ou `cargo audit`.
  - [ ] Le repository public contient un guide visuel explicite pour qu'un développeur inconnu puisse builder le projet chez lui en suivant un strict `Getting Started`.
