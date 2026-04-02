# NexusLog

Windows Event Log Viewer moderne — Rust + Tauri

*Plan de développement complet*  
Avril 2026 · Version 1.0

## 1. Vision du Projet

### 1.1 Problème à résoudre

Windows Event Viewer existe depuis Windows 2000 et n'a subi aucune refonte majeure de son interface. Pourtant, il reste l'outil de référence pour diagnostiquer les crashs système, auditer la sécurité, et déboguer les services Windows — des tâches effectuées quotidiennement par des millions de développeurs et administrateurs systèmes.

Les douleurs concrètes des utilisateurs actuels :
* Interface archaïque basée MMC, lente à charger avec de gros fichiers `.evtx` (> 100 Mo)
* Filtres basiques sans opérateurs logiques complexes (ET / OU imbriqués)
* Pas de recherche full-text sur les données d'événements
* Pas d'export moderne (JSON, CSV avec headers propres)
* Pas de corrélation entre plusieurs fichiers/logs
* Fermé, non extensible, non scriptable
* Pas de détection de menaces intégrée (Sigma Rules)
* Mono-plateforme : impossible d'analyser un `.evtx` sur Linux ou macOS pour les analystes DFIR

| **Opportunité de marché** |
| --- |
| Aucun projet Rust avec GUI desktop complet n'existe pour ce besoin. Les meilleurs parseurs Rust (evtx_dump, Hayabusa, Chainsaw) sont CLI-only. Les alternatives GUI (EventLook, FullEventLogView) sont lentes et limitées. Les solutions payantes (EventLog Explorer, ManageEngine) coûtent 200-500$/an. NexusLog comble un gap précis : **la puissance des CLI Rust dans une GUI desktop native moderne**. |

### 1.2 Proposition de valeur

NexusLog est un viewer Windows Event Log natif, ultra-rapide, open source, écrit en Rust avec une interface moderne Tauri. Il cible quatre profils utilisateurs :
* **Développeurs Windows** : debug d'applications, services, crash dumps
* **Administrateurs systèmes** : audit de sécurité, analyse d'incidents, conformité
* **Analystes DFIR** : forensique rapide sur fichiers `.evtx` hors-ligne, threat hunting via Sigma
* **Équipes SOC** : surveillance temps réel, corrélation d'événements, alertes proactives

### 1.3 Différenciateurs clés vs la concurrence

| **Fonctionnalité** | **Event Viewer** | **EventLook** | **FullEventLogView** | **EVTX Web** | **Hayabusa** | **NexusLog** |
| --- | --- | --- | --- | --- | --- | --- |
| GUI Desktop Native | ✅ | ✅ | ✅ | ❌ | ❌ | **✅** |
| Performance Ultra (Rust) | ❌ | 🟡 | 🟡 | ✅ | ✅ | **✅** |
| Recherche Full-Text | ❌ | ❌ | ❌ | ✅ | 🟡 | **✅** |
| Mode Live (EvtSubscribe) | ✅ | 🟡 | ❌ | ❌ | ❌ | **✅** |
| Corrélation Multi-Fichiers | ❌ | ❌ | ❌ | ❌ | ✅ | **✅** |
| Alertes Natives | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Sigma Rules (DFIR) | ❌ | ❌ | ❌ | ❌ | ✅ | **✅** |
| Cross-Platform (fichiers) | ❌ | ❌ | ❌ | ✅ | ✅ | **✅** |
| Open Source | ❌ | ✅ | ❌ | ✅ | ✅ | **✅** |
| Gratuit | ✅ | ✅ | ✅ | ✅ | ✅ | **✅** |
| Binaire Léger (< 15 Mo) | — | 🟡 | ✅ | — | ✅ | **✅** |
| Export JSON/CSV/JSONL | ❌ | 🟡 | ✅ | ✅ | ✅ | **✅** |
| Statistiques / Dashboard | ❌ | ❌ | ❌ | ❌ | 🟡 | **✅** |
| Système de Plugins | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |

> **Positionnement unique :** NexusLog est le **seul outil** qui combine simultanément performance Rust, GUI desktop native, mode Live, recherche full-text, Sigma Rules et support cross-platform. Cette combinaison n'existe nulle part sur le marché.

### 1.4 Analyse concurrentielle détaillée

#### Segment 1 : Viewers Natifs / Légers
* **Windows Event Viewer** — Interface MMC inchangée depuis 2000. Chargement 30+ sec pour 500 Mo. Filtres basiques XPath brut. Aucune recherche full-text. Aucun export JSON/CSV.
* **EventLook** (.NET 8, open source) — UI améliorée, auto-refresh. Mais dépend de .NET, pas de full-text search, pas de corrélation, pas d'alertes.
* **FullEventLogView** (NirSoft, freeware) — Polyvalent en export. Mais interface Win32 datée, pas de virtualisation, pas de live, code fermé.

#### Segment 2 : Outils DFIR / CLI Rust
* **evtx crate + evtx_dump** — Parseur de référence en Rust (14-17x plus rapide que Go). NexusLog utilise cette crate en interne.
* **EVTX Web** (WASM) — **Concurrent le plus proche techniquement.** Rust/WASM + DuckDB-WASM + virtual scrolling. Mais : pas de mode Live (impossible via WASM), pas d'app desktop native, pas d'alertes, pas de Sigma.
* **Hayabusa** (Yamato Security) — Meilleur support Sigma natif. Génération de timelines. Mais : CLI uniquement, nécessite Timeline Explorer pour visualiser, faux positifs fréquents.
* **Chainsaw** (WithSecure) — Triage rapide, artefacts multiples (Shimcache, SRUM). Mais : CLI uniquement, pas de live monitoring.
* **EvtxECmd** (Eric Zimmerman) — Standard DFIR, "maps" enrichissants. Mais : Windows-only CLI, pas de GUI intégrée.

#### Segment 3 : Solutions Commerciales
* **EventLog Explorer** (~200$/an) — Features enterprise riches. Mais : payant, interface datée, limité par bugs d'API Windows, code fermé.
* **ManageEngine** (~500$/an) — Suite complète mais lourde, orientée enterprise.

#### Segment 4 : Plateformes SIEM / Centralisées
* **ELK Stack**, **Graylog**, **Wazuh**, **Grafana Loki** — Solutions serveur puissantes mais nécessitent infrastructure. NexusLog n'est pas un SIEM mais peut exporter vers ces plateformes (JSONL, intégration directe).

#### Faiblesses universelles exploitées par NexusLog
1. **Gap CLI ↔ GUI** — Les meilleurs outils en performance sont CLI-only, les GUI sont lentes
2. **Aucun outil ne combine Live + Fichier** dans une même interface moderne open source
3. **Bugs systémiques API Windows** — Cache de métadonnées incorrect (task categories). Le mode fichier d'NexusLog via `evtx` crate contourne ce problème
4. **Absence de vue statistique** — Aucun viewer ne propose de dashboard synthétique
5. **Pas de système d'alertes proactif** dans les outils open source GUI

## 2. Architecture Technique

### 2.1 Stack technologique

NexusLog suit une architecture en deux couches clairement séparées :

| **Couche** | **Rôle** |
| --- | --- |
| **Backend Rust** (`src-tauri/`) | Toute la logique métier lourde : parsing EVTX, requêtes Windows API Live, filtrage, indexation tantivy, export, détection Sigma, gestion mémoire par streaming. Accès complet aux ressources système. Communique avec le frontend via les commandes Tauri (IPC sécurisé). |
| **Frontend Next.js + React + TS** (`src/`) | Interface utilisateur rapide et réactive générée sous forme statique. Reçoit les données du backend via `invoke()`. Aucun accès direct aux APIs — tout passe par Tauri. Internationalisation (i18n) intégrée dès le scaffold initial. |

### 2.2 Crates Rust essentielles

| **Crate** | **Version** | **Rôle** | **Catégorie** |
| --- | --- | --- | --- |
| `evtx` | 0.11.x | Parser `.evtx` — 14-17x plus rapide que Go, 100% safe Rust, JSON/XML | Core / Parsing |
| `windows` | 0.58.x | Bindings WinAPI officiels Microsoft — `EvtQuery`, `EvtSubscribe`, `EvtNext` | Core / WinAPI |
| `win-event-log` | git | Wrapper haut-niveau pour `EvtQuery` avec filtres typés | Core / WinAPI |
| `tauri` | 2.x | Framework app desktop — IPC sécurisé, tray icon, notifications | App / UI |
| `tokio` | 1.x | Runtime async — streaming live, surveillance, tâches parallèles | Async |
| `rayon` | 1.x | Parallélisme data — parsing multi-thread des gros fichiers `.evtx` | Parallélisme |
| `tantivy` | 0.22.x | Moteur de recherche full-text — indexation des `EventData` | Search |
| `serde` | 1.x | Sérialisation JSON pour IPC frontend <-> backend | Data |
| `serde_json` | 1.x | JSON parsing et export | Data |
| `chrono` | 0.4.x | Manipulation des timestamps Windows (`FILETIME` -> `DateTime`) | Data |
| `csv` | 1.x | Export CSV des événements filtrés | Export |
| `rusqlite` | 0.31.x | Stockage local SQLite — règles d'alertes, bookmarks, profils de filtres | Storage |
| `sigma-rust` | latest | Évaluation de règles Sigma contre les événements — threat hunting DFIR | Detection |
| `tracing` | 0.1.x | Logging interne structuré de l'application | Dev |
| `thiserror` | 1.x | Gestion d'erreurs ergonomique avec types custom | Dev |
| `uuid` | 1.x | Identifiants uniques pour les watchers live et sessions | Util |
| `flume` | 0.11.x | Channels MPMC async/sync — communication inter-threads streaming | Async |

### 2.3 Bibliothèques Frontend (npm)

| **Package** | **Version** | **Rôle** |
| --- | --- | --- |
| `@tauri-apps/api` | 2.x | Appels IPC vers le backend Rust |
| `@tanstack/react-virtual` | 3.x | Virtual scrolling pour 1M+ lignes sans lag |
| `zustand` | 4.x | State management léger et réactif |
| `recharts` | 2.x | Graphiques statistiques (pie, bar, timeline) |
| `@monaco-editor/react` | 4.x | Éditeur de code embarqué pour requêtes XPath |
| `react-i18next` | 14.x | Internationalisation FR/EN extensible |
| `i18next` | 23.x | Framework i18n core |
| `date-fns` | 3.x | Manipulation de dates avec support timezone |

### 2.4 Structure du projet

Organisation recommandée du workspace Cargo :

```text
nexuslog/
├── Cargo.toml                    # Workspace
├── src/                          # Frontend React/TS
│   ├── components/
│   │   ├── EventTable.tsx        # Tableau virtualisé (@tanstack/react-virtual)
│   │   ├── FilterBar.tsx         # Filtres visuels (niveau, date, EventID, provider)
│   │   ├── DetailPanel.tsx       # Détail événement (General, Data, XML, Context)
│   │   ├── Timeline.tsx          # Vue chronologique multi-fichiers
│   │   ├── Dashboard.tsx         # Statistiques synthétiques (pie, bar, timeline)
│   │   ├── SearchBar.tsx         # Recherche full-text (tantivy)
│   │   ├── XPathEditor.tsx       # Éditeur XPath (Monaco)
│   │   ├── AlertManager.tsx      # Gestion des règles d'alertes
│   │   ├── SigmaPanel.tsx        # Résultats de détection Sigma
│   │   ├── FileDropZone.tsx      # Drag & drop de fichiers .evtx
│   │   └── ChannelSidebar.tsx    # Liste des canaux / fichiers ouverts
│   ├── hooks/
│   │   ├── useEventLog.ts        # Appels invoke() — chargement fichier
│   │   ├── useLiveLog.ts         # Streaming temps réel (Tauri Events)
│   │   ├── useSearch.ts          # Recherche full-text
│   │   ├── usePagination.ts      # Pagination / streaming pour gros fichiers
│   │   └── useSigma.ts           # Résultats Sigma
│   ├── store/                    # Zustand state management
│   │   ├── eventStore.ts         # État des événements chargés
│   │   ├── filterStore.ts        # État des filtres actifs
│   │   └── settingsStore.ts      # Préférences utilisateur (langue, thème)
│   ├── i18n/                     # Internationalisation
│   │   ├── config.ts             # Configuration i18next
│   │   └── locales/
│   │       ├── en.json           # Traductions anglaises
│   │       └── fr.json           # Traductions françaises
│   ├── types/
│   │   ├── models.ts             # Interfaces TypeScript alignées sur Rust
│   │   ├── filters.ts            # Types de filtres
│   │   └── i18n.d.ts             # Types i18n
│   └── styles/
│       ├── globals.css           # Design tokens (couleurs, spacing, ombres)
│       └── theme.ts              # Configuration du thème (clair/sombre)
├── src-tauri/
│   ├── src/
│   │   ├── main.rs               # Entry point Tauri
│   │   ├── commands/             # Commandes exposées au frontend
│   │   │   ├── load_file.rs      # Chargement .evtx (streaming/pagination)
│   │   │   ├── live_log.rs       # Surveillance live (EvtSubscribe)
│   │   │   ├── filter.rs         # Filtrage XPath + visuel
│   │   │   ├── search.rs         # Recherche full-text (tantivy)
│   │   │   ├── export.rs         # Export JSON/CSV/JSONL
│   │   │   ├── sigma.rs          # Détection Sigma Rules
│   │   │   ├── stats.rs          # Statistiques et compteurs
│   │   │   └── alerts.rs         # Gestion des alertes
│   │   ├── engine/               # Logique métier (couche abstraction)
│   │   │   ├── parser.rs         # Wraps evtx crate + streaming
│   │   │   ├── live.rs           # EvtSubscribe wrapper
│   │   │   ├── search.rs         # Index tantivy
│   │   │   ├── sigma.rs          # Évaluation Sigma Rules
│   │   │   ├── correlator.rs     # Corrélation multi-fichiers
│   │   │   ├── alerting.rs       # Moteur d'alertes (SQLite + notifications)
│   │   │   ├── exporter.rs       # Logique d'export multi-format
│   │   │   ├── streaming.rs      # Pagination / chunks pour gros fichiers
│   │   │   └── models.rs         # Types partagés
│   │   ├── plugins/              # Système de plugins extensible
│   │   │   ├── mod.rs            # Plugin API
│   │   │   └── loader.rs         # Chargement dynamique de plugins
│   │   ├── db/                   # Couche de persistance
│   │   │   ├── mod.rs            # Interface SQLite
│   │   │   └── migrations.rs     # Migrations schéma
│   │   └── lib.rs
│   ├── sigma-rules/              # Règles Sigma embarquées par défaut
│   │   └── windows/              # Règles par catégorie Windows
│   └── tauri.conf.json
├── tests/                        # Tests d'intégration end-to-end
│   ├── fixtures/                 # Fichiers .evtx de test
│   └── integration/
├── benches/                      # Benchmarks criterion
└── package.json
```

### 2.5 Modèle de données central

La structure `EventRecord` est le type pivot entre le backend Rust et le frontend :

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EventRecord {
    pub record_id: u64,
    pub event_id: u32,
    pub level: EventLevel,        // Critical/Error/Warning/Info/Verbose
    pub timestamp: DateTime<Utc>,
    pub provider: String,
    pub channel: String,
    pub computer: String,
    pub task_id: Option<u16>,
    pub keywords: Option<u64>,
    pub user_id: Option<String>,
    pub data: Value,              // serde_json::Value - champs dynamiques
    pub raw_xml: Option<String>,  // XML brut pour mode expert
    pub source_file: Option<String>,  // Fichier d'origine (multi-fichiers)
    pub sigma_matches: Vec<SigmaMatch>, // Règles Sigma déclenchées
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SigmaMatch {
    pub rule_id: String,
    pub rule_title: String,
    pub severity: SigmaSeverity,  // Critical/High/Medium/Low/Info
    pub description: String,
    pub tags: Vec<String>,        // MITRE ATT&CK tags
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum SigmaSeverity {
    Critical,
    High,
    Medium,
    Low,
    Informational,
}
```

### 2.6 Architecture de streaming / pagination

Pour gérer les fichiers volumineux (> 1 Go, 1M+ événements) sans saturer la RAM :

```rust
/// Le backend charge les événements par chunks et les envoie progressivement
/// au frontend. La RAM reste contrôlée même pour de très gros fichiers.
#[derive(Debug, Serialize, Deserialize)]
pub struct EventChunk {
    pub chunk_id: u32,
    pub events: Vec<EventRecord>,
    pub total_count: u64,           // Nombre total d'événements dans le fichier
    pub loaded_count: u64,          // Nombre chargé jusqu'ici
    pub progress_percent: f32,      // Progression (0.0 - 100.0)
    pub is_last: bool,              // Dernier chunk ?
}

/// Le frontend peut demander une "fenêtre" de résultats
#[derive(Debug, Serialize, Deserialize)]
pub struct PaginationRequest {
    pub offset: u64,
    pub limit: u64,                 // Typiquement 1000-5000 lignes
    pub filters: Option<FilterQuery>,
    pub sort_by: Option<SortField>,
    pub sort_order: SortOrder,
}
```

### 2.7 Modes d'accès aux logs

NexusLog supporte deux modes de lecture, gérés par des modules séparés :

#### Mode Fichier (.evtx) — Cross-Platform

Utilise la crate `evtx` avec parallélisme `rayon` pour un parsing ultra-rapide. Un fichier de 500 Mo (~1M d'événements) se charge en moins de 3 secondes sur du matériel moderne. Ce mode fonctionne sur **Windows, Linux et macOS** car il ne dépend d'aucune API Windows.

```rust
// engine/parser.rs
pub async fn load_evtx(path: &Path) -> Result<Vec<EventRecord>> {
    let mut parser = EvtxParser::from_path(path)?;
    let records: Vec<_> = parser.records_json_value()
        .par_bridge()           // rayon parallelism
        .filter_map(|r| r.ok())
        .map(|r| map_to_model(r))
        .collect();
    
    Ok(records)
}

// engine/streaming.rs — Mode streaming pour fichiers > 1 Go
pub fn load_evtx_streamed(
    path: &Path,
    chunk_size: usize,      // ex: 5000 événements par chunk
    sender: Sender<EventChunk>,
) -> Result<()> {
    let mut parser = EvtxParser::from_path(path)?;
    let mut chunk_id = 0;
    let mut buffer = Vec::with_capacity(chunk_size);
    
    for record in parser.records_json_value() {
        if let Ok(r) = record {
            buffer.push(map_to_model(r));
            if buffer.len() >= chunk_size {
                sender.send(EventChunk {
                    chunk_id,
                    events: std::mem::take(&mut buffer),
                    // ...
                })?;
                chunk_id += 1;
            }
        }
    }
    // Envoyer le dernier chunk partiel
    Ok(())
}
```

#### Mode Live (canaux Windows actifs) — Windows Only

Utilise l'API Windows `EvtSubscribe` via `windows-rs` pour un abonnement temps réel aux canaux. Les événements sont streamés vers le frontend via Tauri Events. Ce mode n'est disponible que sur Windows.

```rust
// engine/live.rs
pub async fn subscribe_channel(
    channel: &str,
    query: &str,
    app: AppHandle,
) -> Result<()> {
    // EvtSubscribe avec callback
    // Chaque nouvel événement => app.emit("new-event", record)
}
```

> **Note cross-platform :** Sur Linux/macOS, le mode Live est automatiquement désactivé dans l'interface. L'application fonctionne en mode "analyse de fichiers .evtx uniquement" avec toutes les fonctionnalités de recherche, filtrage, corrélation et Sigma. Cela permet aux analystes DFIR de travailler sur leur OS de prédilection.

### 2.8 Architecture du moteur Sigma

L'intégration des Sigma Rules permet la détection de menaces directement dans NexusLog :

```rust
// engine/sigma.rs
pub struct SigmaEngine {
    rules: Vec<SigmaRule>,
    rule_index: HashMap<String, usize>,
}

impl SigmaEngine {
    /// Charge les règles depuis le dossier sigma-rules/ embarqué
    pub fn load_rules(rules_dir: &Path) -> Result<Self> { /* ... */ }
    
    /// Charge des règles additionnelles fournies par l'utilisateur
    pub fn add_custom_rules(&mut self, path: &Path) -> Result<usize> { /* ... */ }
    
    /// Évalue un événement contre toutes les règles chargées
    pub fn evaluate(&self, event: &EventRecord) -> Vec<SigmaMatch> { /* ... */ }
    
    /// Évalue un batch d'événements en parallèle via rayon
    pub fn evaluate_batch(&self, events: &[EventRecord]) -> HashMap<u64, Vec<SigmaMatch>> {
        events.par_iter()
            .filter_map(|e| {
                let matches = self.evaluate(e);
                if matches.is_empty() { None }
                else { Some((e.record_id, matches)) }
            })
            .collect()
    }
}
```

### 2.9 Système de plugins

NexusLog expose une API de plugins pour permettre l'extensibilité communautaire :

```rust
// plugins/mod.rs
pub trait NexusLogPlugin: Send + Sync {
    fn name(&self) -> &str;
    fn version(&self) -> &str;
    
    /// Appelé pour chaque événement chargé — permet l'enrichissement
    fn on_event_loaded(&self, event: &mut EventRecord) -> Result<()> { Ok(()) }
    
    /// Ajoute des options d'export personnalisées
    fn export_formats(&self) -> Vec<ExportFormat> { vec![] }
    
    /// Ajoute des parseurs pour d'autres formats de logs
    fn supported_extensions(&self) -> Vec<&str> { vec![] }
}
```

## 3. Roadmap de Développement

### 3.1 Vue d'ensemble des phases

| **Phase** | **Nom** | **Objectifs** | **Durée** | **Livrable** |
| --- | --- | --- | --- | --- |
| **Phase 0** | **Fondations** | Setup projet, parsing `.evtx` CLI, modèle de données, benchmarks mémoire, test cross-platform | Semaine 1-2 | CLI fonctionnel |
| **Phase 1** | **MVP GUI** | Tableau virtualisé, Next.js UI premium, filtres, chargement fichier, i18n, accessibilité | Semaine 3-5 | App Tauri v0.1 |
| **Phase 2** | **Live + Search** | Surveillance temps réel, recherche full-text tantivy, streaming/pagination gros fichiers | Semaine 6-9 | v0.2 — Beta |
| **Phase 3** | **Features Pro** | Corrélation, export avancé, alertes, Sigma Rules, statistiques, plugins | Semaine 10-14 | v1.0 stable |
| **Phase 4** | **Distribution** | Installeur Windows, build cross-platform, auto-update, docs, soumission AV vendors | Semaine 15-16 | Release publique |

### 3.2 Phase 0 — Fondations (Semaines 1-2)

#### Objectif
Valider le parsing, définir les modèles, mettre en place le projet Tauri. Le résultat est un binaire CLI capable de lire un `.evtx` et d'afficher les événements en JSON.

#### Tâches
1. Initialiser le projet : `cargo new`, `npx create-next-app@latest`, configurer le build statique (`output: 'export'`), puis `cargo tauri init`
2. Créer `engine/models.rs` avec les types `EventRecord`, `EventLevel`, `FilterQuery`, `EventChunk`, `PaginationRequest`
3. Implémenter `engine/parser.rs` — wrapping de la crate `evtx` avec `rayon`
4. Implémenter `engine/streaming.rs` — mode streaming pour gros fichiers (> 1 Go)
5. Tester les performances : fichier 100 Mo, 500 Mo, 1 Go — mesurer **temps ET mémoire**
6. Tester le parsing **cross-platform** (Linux/macOS) pour valider la portabilité du mode fichier
7. Configurer les permissions Tauri (filesystem read, path resolver)
8. Mettre en place CI GitHub Actions : `cargo test` + `cargo clippy` + `cargo fmt`
9. Scaffolder l'architecture i18n dans le frontend (react-i18next + fichiers en/fr vides)

#### Code de démarrage — Cargo.toml

```toml
[dependencies]
evtx = { version = "0.11", features = ["multithreading"] }
rayon = "1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chrono = { version = "0.4", features = ["serde"] }
tokio = { version = "1", features = ["full"] }
tauri = { version = "2", features = [] }
thiserror = "1"
uuid = { version = "1", features = ["v4"] }
flume = "0.11"
tracing = "0.1"
tracing-subscriber = "0.3"

[target.'cfg(windows)'.dependencies]
windows = { version = "0.58", features = ["Win32_System_EventLog", "Win32_Foundation"] }
```

> **Note :** La crate `windows` n'est importée que sur la cible Windows via `cfg(windows)`. Sur Linux/macOS, le mode Live est désactivé à la compilation.

#### Critère de succès

| **Go / No-Go Phase 0** |
| --- |
| Un fichier `security.evtx` de 200 Mo se parse entièrement en moins de 4 secondes sur une machine standard (Core i5, 8 Go RAM). Le JSON produit contient tous les champs System + EventData. La RAM ne dépasse pas 800 Mo pour un fichier de 1 Go en mode streaming. Le même parser fonctionne sans erreur sur Linux. |

### 3.3 Phase 1 — MVP GUI (Semaines 3-5)

#### Objectif
L'utilisateur peut ouvrir un fichier `.evtx` via un dialogue, voir les événements dans un tableau virtualisé, et filtrer par niveau/date/EventID. C'est la démo montrable. L'interface doit provoquer un **effet "WOW"** immédiat face à la concurrence visuellement pauvre.

#### Composants Rust (commandes Tauri)
* `load_file(path: String) -> Result<EventChunk>` — chargement avec streaming et progress
* `get_page(request: PaginationRequest) -> Result<EventChunk>` — pagination
* `filter_events(query: FilterQuery) -> Result<Vec<EventRecord>>` — filtrage
* `get_event_detail(id: u64) -> Result<EventRecord>` — détail complet + XML brut

#### Composants Frontend (Next.js / React)
1. `EventTable.tsx` — tableau virtualisé (`@tanstack/react-virtual`) pour 1M+ lignes sans lag
2. `FilterBar.tsx` — composant client avec sélecteurs (Niveau, Range, EventID, Provider)
3. `DetailPanel.tsx` — panneau latéral avec JSON pretty-print et XML brut, 4 onglets
4. `FileDropZone.tsx` — drag & drop de fichiers `.evtx`
5. `ChannelSidebar.tsx` — barre latérale avec fichiers ouverts
6. `app/page.tsx` — Entry point du layout Next.js

#### Décisions UX importantes
* **Design premium** : dark mode par défaut, glassmorphism subtil, micro-animations
* Tableau avec colonnes redimensionnables : Date, Niveau (colored badge), EventID, Source, Message
* Icônes de niveau colorées avec animations : rouge pulsé (Critical/Error), orange (Warning), gris (Info/Verbose)
* Click sur ligne = panneau détail sans perdre la liste (animation slide-in)
* Shortcut `Ctrl+F` = focus sur la barre de recherche
* **i18n opérationnel** : toute chaîne visible traduite (EN/FR minimum)
* **Accessibilité (a11y)** : ARIA labels sur tous les éléments interactifs, navigation clavier complète, contraste WCAG AA minimum

#### Critère de succès

| **Go / No-Go Phase 1** |
| --- |
| L'interface affiche 100 000 événements sans scroll lag. Le filtrage par niveau renvoie les résultats en < 100ms. L'interface en dark mode impressionne visuellement un utilisateur non-technique. Le changement de langue EN ↔ FR fonctionne sans rechargement. Navigation complète au clavier (Tab, Enter, Esc). Démontrable à un ami non-technique en 30 secondes. |

### 3.4 Phase 2 — Live & Search (Semaines 6-9)

#### Objectif
Ajouter la surveillance temps réel des canaux Windows actifs et la recherche full-text sur les données d'événements — les deux features qui distinguent radicalement NexusLog de l'Event Viewer natif. Implémenter le streaming pour les fichiers > 1 Go.

#### Surveillance temps réel (Live Mode) — Windows Only

Implémentation via `EvtSubscribe` (Windows Eventing API). Le backend Rust souscrit à un canal et pousse chaque nouvel événement au frontend via Tauri Events.

```rust
// commands/live_log.rs
#[tauri::command]
pub async fn start_live_watch(
    channel: String,
    xpath_query: String,
    app: AppHandle,
    state: State<'_, LiveState>,
) -> Result<String, String> {
    let handle = tokio::spawn(async move {
        subscribe_and_emit(channel, xpath_query, app).await
    });
    
    // Retourne un watch_id pour pouvoir stop()
    let id = Uuid::new_v4().to_string();
    state.handles.insert(id.clone(), handle);
    
    Ok(id)
}
```

#### Recherche full-text (tantivy)

Lors du chargement d'un fichier, un index `tantivy` est construit en background. Les champs indexés : message, provider, computer, user_id, et toutes les clés EventData. La recherche supporte les opérateurs booléens et les wildcards.

```rust
// engine/search.rs
pub struct EventIndex {
    index: Index,
    reader: IndexReader,
    writer: Arc<Mutex<IndexWriter>>,
}

impl EventIndex {
    pub fn search(&self, query: &str, limit: usize) -> Result<Vec<u64>> {
        // retourne les record_ids
        // ...
    }
}
```

#### Streaming / Pagination pour gros fichiers

Pour les fichiers dépassant 1 Go, le chargement complet en RAM n'est pas viable. Le système de streaming envoie les événements par chunks au frontend :

```rust
// commands/load_file.rs — Mode streaming
#[tauri::command]
pub async fn load_file_streamed(
    path: String,
    chunk_size: Option<usize>,
    app: AppHandle,
) -> Result<LoadSummary, String> {
    let chunk_size = chunk_size.unwrap_or(5000);
    let (tx, rx) = flume::bounded(4); // Back-pressure
    
    // Thread de parsing
    tokio::spawn_blocking(move || {
        load_evtx_streamed(Path::new(&path), chunk_size, tx)
    });
    
    // Thread d'émission — Tauri Events
    while let Ok(chunk) = rx.recv_async().await {
        app.emit("event-chunk", &chunk)?;
    }
    
    Ok(LoadSummary { /* ... */ })
}
```

#### Graceful degradation cross-platform

Le mode Live est automatiquement désactivé sur Linux/macOS :

```rust
// Compilation conditionnelle
#[cfg(target_os = "windows")]
pub mod live;

#[cfg(not(target_os = "windows"))]
pub mod live {
    pub fn is_live_available() -> bool { false }
    // Stubs qui retournent des erreurs explicatives
}
```

#### Canaux Windows à supporter
* System — événements système kernel
* Application — logs d'applications
* Security — audit de sécurité (nécessite admin)
* Setup — installation/mise à jour Windows
* Microsoft-Windows-* — canaux manufacturiers (optionnels, > 300 canaux)

#### Critère de succès

| **Go / No-Go Phase 2** |
| --- |
| Le mode live affiche les nouveaux événements en < 500ms après leur génération. La recherche full-text retourne des résultats en < 300ms sur un index de 500k événements. Un fichier de 1.5 Go se charge en streaming sans dépasser 800 Mo de RAM. Sur Linux, l'app ouvre un fichier .evtx et le recherche full-text fonctionne. |

### 3.5 Phase 3 — Features Pro (Semaines 10-14)

#### 3.5.1 Corrélation multi-fichiers

Permettre de charger plusieurs fichiers `.evtx` simultanément et de les visualiser sur une timeline unifiée triée par timestamp. Essentiel pour l'analyse DFIR sur plusieurs machines.

```rust
// engine/correlator.rs
pub struct Correlator {
    sources: Vec<SourceFile>,
    unified_timeline: BTreeMap<DateTime<Utc>, Vec<EventRecord>>,
}

impl Correlator {
    pub fn add_source(&mut self, path: &Path, label: &str) -> Result<()> { /* ... */ }
    pub fn build_timeline(&mut self) -> Result<&BTreeMap<DateTime<Utc>, Vec<EventRecord>>> { /* ... */ }
    pub fn get_context(&self, record_id: u64, window: Duration) -> Vec<EventRecord> { /* ... */ }
}
```

#### 3.5.2 Sigma Rules — Détection de menaces

Intégration du moteur Sigma pour la détection automatique de menaces dans les événements chargés. C'est un différenciateur majeur face à tous les viewers GUI existants.

**Fonctionnalités :**
* Chargement des règles Sigma YAML standard (compatibles SigmaHQ)
* Jeu de règles par défaut embarqué dans l'application (Top 100 Windows rules)
* Import de règles personnalisées par l'utilisateur
* Évaluation en batch parallélisé (rayon) lors du chargement de fichiers
* Évaluation en temps réel en mode Live
* Panneau dédié `SigmaPanel.tsx` avec résumé des détections par sévérité
* Tags MITRE ATT&CK affichés pour chaque détection
* Export des résultats Sigma en rapport dédié

**Règles embarquées prioritaires :**
* `4625` — Échecs de connexion (brute force)
* `4720` / `4726` — Création/suppression de comptes
* `1102` — Effacement des logs d'audit (anti-forensique)
* `7045` — Installation de service (persistance)
* `4688` — Création de processus avec ligne de commande suspecte
* Règles Sigma communautaires les plus populaires

#### 3.5.3 Système d'alertes

Définir des règles (EventID + niveau + pattern de message) qui déclenchent des notifications Windows natives via l'API notification Tauri. Stockage des règles en SQLite local.

```rust
// engine/alerting.rs
#[derive(Debug, Serialize, Deserialize)]
pub struct AlertRule {
    pub id: String,
    pub name: String,
    pub condition: AlertCondition,
    pub action: AlertAction,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
}

pub enum AlertCondition {
    EventIdEquals(u32),
    LevelAtLeast(EventLevel),
    MessageContains(String),
    SigmaRule(String),              // ID de règle Sigma
    Composite(Vec<AlertCondition>, LogicOp),
}
```

#### 3.5.4 Export avancé

* Export JSON / JSONL (compatible SIEM : Splunk, Elasticsearch, Timesketch)
* Export CSV avec headers configurables
* Export HTML rapport (résumé statistique + tableau des événements critiques)
* **Export direct SIEM** : format d'ingestion Elasticsearch Bulk API / Splunk HEC

#### 3.5.5 Statistiques et dashboard

Vue synthétique pour un fichier ou canal :
* Répartition par niveau (graphique bâtons colorés)
* Top 10 EventIDs les plus fréquents
* Top 10 providers
* Timeline d'activité par heure / jour
* Répartition des détections Sigma par sévérité
* Compteur de fichiers / sources / événements

#### 3.5.6 Mode Expert XPath

Zone de texte pour saisir directement des requêtes XPath Windows Event Log pour les utilisateurs avancés. Syntaxe colorée avec validation en temps réel via Monaco Editor.

#### 3.5.7 Système de plugins

API de plugins permettant à la communauté d'étendre NexusLog :
* Parseurs pour d'autres formats de logs (syslog, auditd, journalctl)
* Nouveaux formats d'export
* Règles de détection personnalisées
* Enrichissement d'événements (GeoIP, réputation d'IP, etc.)

### 3.6 Phase 4 — Distribution (Semaines 15-16)

#### Installeur Windows
* Build NSIS via Tauri CLI (`cargo tauri build`)
* **Signature du code** (Code Signing Certificate — environ 200$/an) — **critique** pour éviter les faux positifs antivirus
* **Soumission préventive aux éditeurs antivirus** (Microsoft, Kaspersky, ESET) avant la release publique
* Publication sur GitHub Releases + page de téléchargement

#### Builds Cross-Platform
* Build Windows : `.exe` / `.msi` (installeur complet avec mode Live)
* Build Linux : `.AppImage` / `.deb` (mode fichier uniquement, Live désactivé)
* Build macOS : `.dmg` (mode fichier uniquement, Live désactivé)
* Documentation claire sur les différences de fonctionnalités par plateforme

#### Auto-update
* Plugin `tauri-plugin-updater` — vérifie GitHub Releases API
* Notifie l'utilisateur des nouvelles versions sans forcer la mise à jour

#### Distribution & Marketing
* Publier sur `winget` et Chocolatey pour Windows
* Publier sur Homebrew (cask) pour macOS
* Publier sur Flathub / snap pour Linux
* `README.md` avec GIFs animés des features clés
* Wiki GitHub : guide d'utilisation, guide de contribution
* `CHANGELOG.md` maintenu avec Conventional Commits
* Article de blog : "Parsing 1M Windows events in 3 seconds with Rust"
* Posts sur `r/rust`, `r/sysadmin`, `r/netsec`, `r/dfir`
* Soumission Hacker News (Show HN)

## 4. Spécifications Fonctionnelles

### 4.1 Filtrage avancé

Le système de filtrage est l'un des différenciateurs majeurs. Trois modes sont disponibles :

#### Mode Visuel (débutants)
Sélecteurs dans la barre de filtres : niveau, plage de dates, EventID, provider, channel, ordinateur. Les filtres s'accumulent (logique ET par défaut avec toggle OU).

#### Mode Sigma (analystes DFIR)
Sélection de règles Sigma à appliquer. Filtrage des événements déclenchant des détections par sévérité (Critical, High, Medium, Low).

#### Mode XPath Expert
Champ texte libre (Monaco Editor) acceptant la syntaxe XPath standard des Windows Event Logs, identique à ce qu'accepte l'Event Viewer natif ou PowerShell `Get-WinEvent` :

```xml
*[System[(Level=1 or Level=2) and TimeCreated[@SystemTime >= '2026-01-01T00:00:00']]]
and EventData[Data[@Name='LogonType'] = '3']
```

### 4.2 Interface utilisateur — Layout

L'interface suit un layout en trois zones :
* **Barre latérale gauche** : liste des canaux disponibles (live) / fichiers ouverts, résultats Sigma résumés
* **Zone centrale** : tableau d'événements (> 80% de l'espace) + barre de filtres en header
* **Panneau inférieur/droit collapsible** : détail de l'événement sélectionné

Le tableau d'événements affiche les colonnes suivantes (toutes réordonables/redimensionnables) :
* Date/Heure — format ISO 8601 ou relatif (il y a 2 min)
* Niveau — badge coloré avec animation (Critical, Error, Warning, Information, Verbose)
* ID — EventID numérique
* Source — Provider name
* Description — premiers 100 caractères du message
* Ordinateur — nom de la machine source
* Sigma — icône d'alerte si l'événement matche une règle (avec tooltip du nom de la règle)
* Source File — nom du fichier d'origine (en mode corrélation multi-fichiers)

### 4.3 Panneau de détail d'événement

Quand un événement est sélectionné, le panneau détail affiche :
* **Onglet Général** : tous les champs System formatés (timestamp, level, eventID, task, keywords...)
* **Onglet Données** : EventData sous forme de table clé/valeur avec copie rapide
* **Onglet XML brut** : le XML complet de l'événement avec coloration syntaxique (Monaco)
* **Onglet Contexte** : les N événements avant/après sur la timeline (corrélation rapide)
* **Onglet Sigma** : détails des détections Sigma pour cet événement (règles matchées, MITRE tags, description)

### 4.4 Dashboard / Statistiques

Vue accessible via un onglet dédié ou un toggle :
* **Répartition par niveau** : graphique bâtons avec couleurs Critical/Error/Warning/Info/Verbose
* **Top 10 EventIDs** : les IDs les plus fréquents avec pourcentages
* **Top 10 Providers** : les sources d'événements les plus actives
* **Timeline d'activité** : barres par heure/jour montrant la densité d'événements
* **Résumé Sigma** : compteurs par sévérité (Critical: X, High: Y, Medium: Z)
* **Métriques techniques** : nombre total d'événements, plage de dates, taille du fichier

### 4.5 Internationalisation (i18n)

L'application est traduite dès le MVP :
* **Langues supportées** : Anglais (défaut), Français
* **Architecture** : `react-i18next` avec namespaces par composant
* **Couverture** : 100% des chaînes visibles (titres, boutons, labels, messages d'erreur, tooltips)
* **Extensibilité** : structure JSON simple permettant l'ajout de langues par la communauté

### 4.6 Accessibilité (a11y)

L'application respecte les standards WCAG 2.1 AA minimum :
* **Navigation clavier complète** : Tab, Shift+Tab, Enter, Esc, flèches dans le tableau
* **ARIA labels** : tous les éléments interactifs ont des labels descriptifs
* **Contraste** : ratio minimum 4.5:1 pour le texte normal, 3:1 pour le texte large
* **Focus visible** : indicateur de focus clair et visible sur tous les éléments interactifs
* **Screen reader** : structure sémantique HTML5, live regions pour les événements live
* **Préférences système** : respect de `prefers-reduced-motion` et `prefers-color-scheme`

### 4.7 Permissions Windows requises

NexusLog gère proprement les permissions selon le canal :
* Canaux publics (Application, System) : aucune élévation requise
* Canal Security : nécessite les privilèges administrateur — l'app demande l'élévation UAC si nécessaire
* Canaux Microsoft-Windows-* : variables, l'app informe l'utilisateur
* **Graceful degradation** : si l'élévation est refusée, l'app affiche les canaux accessibles sans admin et informe l'utilisateur des canaux inaccessibles

| **Note de sécurité** |
| --- |
| NexusLog ne stocke aucune donnée d'événement sur des serveurs externes. Toute l'analyse reste locale à la machine. Aucune télémétrie sans consentement explicite. Les fichiers .evtx ne sont jamais modifiés. |

## 5. Qualité & Tests

### 5.1 Stratégie de test

Quatre niveaux de tests couvrent l'ensemble de l'application :

#### Tests unitaires Rust
* `engine/parser.rs` — fixtures `.evtx` de taille connue, validation des champs
* `engine/filter.rs` — cas limites des filtres XPath et visuels
* `engine/search.rs` — précision de l'index `tantivy` sur corpus de test
* `engine/sigma.rs` — validation des détections Sigma contre événements connus
* `engine/streaming.rs` — intégrité des chunks, back-pressure, pas de perte d'événements
* `engine/correlator.rs` — tri chronologique multi-sources
* `engine/models.rs` — sérialisation/désérialisation aller-retour

#### Tests d'intégration
* Chargement de fichiers `.evtx` publics (Microsoft fournit des samples)
* Cycle complet : load -> filter -> sigma -> export -> re-import
* Tests de performance avec `hyperfine` en CI pour détecter les régressions
* **Tests cross-platform** : le même fichier .evtx produit les mêmes résultats sur Windows et Linux

#### Tests End-to-End
* Tauri propose `webdriver` pour tester l'interface complète
* Scénarios : ouverture fichier, filtrage, recherche, export, live mode on/off
* Test d'accessibilité automatisé (axe-core)

#### Tests de mémoire / performance
* Profiling mémoire avec fichiers de 1Go+ en mode streaming
* Vérification absence de fuites mémoire sur cycles chargement/déchargement répétés
* Benchmark tantivy avec index de 1M+ événements

### 5.2 Benchmarks de performance

Les objectifs de performance mesurés en CI à chaque PR :

| **Opération** | **Objectif** | **Mesure** |
| --- | --- | --- |
| Chargement `.evtx` 100 Mo | **< 1.5 seconde** | `hyperfine` + `cargo bench` |
| Chargement `.evtx` 500 Mo | **< 5 secondes** | `hyperfine` + `cargo bench` |
| Chargement `.evtx` 1 Go (streaming) | **< 12 secondes** | `hyperfine` + mesure RAM |
| Filtrage sur 500k événements | **< 100ms** | `criterion` bench |
| Recherche full-text (`tantivy`) | **< 300ms** | `criterion` bench |
| Évaluation Sigma (100 règles × 500k events) | **< 5 secondes** | `criterion` bench |
| Rendu 100k lignes tableau | **scroll 60fps** | Chrome DevTools |
| Latence live event | **< 500ms** | test automatisé |
| RAM au repos | **< 80 Mo** | Process monitor |
| RAM 500k events chargés | **< 500 Mo** | Process monitor |
| RAM 1M events streaming | **< 800 Mo** | Process monitor (pic) |

### 5.3 CI/CD Pipeline

GitHub Actions avec les étapes suivantes sur chaque PR et `push` `main` :

1. `cargo fmt --check` — formatage uniforme
2. `cargo clippy -- -D warnings` — zéro warning toléré
3. `cargo test --all` — tous les tests unitaires et d'intégration
4. `cargo bench` — benchmarks avec comparaison à la baseline
5. `npm run build` — compilation Next.js statique (next build)
6. **Tests cross-platform** — matrice CI : `windows-latest`, `ubuntu-latest`, `macos-latest`
7. `cargo tauri build` — build complet (matrix: Windows x86_64, Linux x86_64, macOS arm64)
8. `cargo audit` + `npm audit` — vérification des vulnérabilités connues
9. Création automatique du release draft sur tag `v*.*.*`

## 6. Stratégie de Distribution & Monétisation

### 6.1 Modèle open source

NexusLog est publié sous licence MIT — le code est entièrement open source. Cette décision est stratégique : elle construit la confiance dans un outil qui accède aux logs de sécurité, et favorise l'adoption communautaire.

### 6.2 Chemins de monétisation

#### Option A — Sponsoring GitHub (recommandé en phase 1)
GitHub Sponsors permet aux utilisateurs et entreprises de soutenir le projet. Les grands outils open source Windows (Everything, FanControl, AutoHotkey) reçoivent des dizaines de milliers de dollars/an via ce modèle.

#### Option B — Version Pro (phase 2, après 1000+ utilisateurs)
* Features Pro : règles d'alerte avancées composites, export HTML rapport, profils de filtres partagés en équipe, intégration SIEM directe, pack de règles Sigma enterprise
* Prix indicatif : 29$/an individuel, 99$/an équipe 5 seats
* Le coeur reste open source — seules les features enterprise sont payantes

#### Option C — Support entreprise
* Contrat de support pour déploiements DFIR/SOC en entreprise
* Intégration custom SIEM, formation
* Règles Sigma personnalisées pour industries spécifiques

### 6.3 Stratégie de distribution initiale

1. Publier sur GitHub avec README de qualité professionnelle + GIFs animés
2. Poster sur `r/rust`, `r/sysadmin`, `r/netsec`, `r/dfir` — ces communautés adorent les outils Rust
3. Article de blog technique : "Parsing 1M Windows events in 3 seconds with Rust"
4. Soumettre sur Hacker News (Show HN)
5. Publier sur `winget`, Chocolatey (Windows), Homebrew (macOS), Flathub (Linux)
6. Contacter les auteurs d'articles sur l'Event Viewer et les blogueurs DFIR pour mention
7. Démonstration vidéo YouTube : comparaison côte-à-côte NexusLog vs Event Viewer
8. Présentation dans les conférences open source et sécurité (BSides, local meetups Rust)

## 7. Risques & Mitigations

| **Risque** | **Impact** | **Mitigation** | **Probabilité** |
| --- | --- | --- | --- |
| Faux positif antivirus sur le binaire Rust (WinAPI) | Élevé | Signature de code (200$/an) + soumission préventive aux AV vendors avant release publique | Moyen |
| EvtSubscribe nécessite admin pour canal Security | Moyen | UAC prompt clair + graceful degradation (afficher canaux accessibles sans admin) + doc utilisateur | Faible |
| WebView2 non installé sur Windows 10 ancien | Moyen | Tauri v2 installe automatiquement WebView2 via bootstrapper NSIS | Faible |
| Performances insuffisantes sur gros fichiers (> 1 Go) | Élevé | Mode streaming/pagination dès Phase 0 + benchmarks mémoire en CI | Faible |
| Breaking change API Windows dans future version | Faible | Abstraction `engine/` isole les dépendances WinAPI derrière `cfg(windows)` | Très faible |
| Fragmentation des formats de canaux manufacturiers | Moyen | Parser XML générique, pas de format hard-codé | Moyen |
| **EVTX Web (WASM) pourrait ajouter un wrapper Tauri** | Élevé | Livrer le MVP rapidement + construire la communauté en premier + features différenciantes (Sigma, alertes) | Moyen |
| **OOM (Out of Memory) sur fichiers > 1 Go** | Élevé | Architecture streaming/pagination obligatoire + back-pressure (flume bounded channels) | Moyen |
| **Faux positifs des règles Sigma** | Moyen | Documentation claire sur le tuning + interface permettant de muter/désactiver par règle | Élevé |
| **Scalabilité de l'index tantivy** sur > 5M événements | Moyen | Index partitionné par fichier source + limites configurables | Faible |
| **Compatibilité cross-platform** — comportement différent Linux/Windows | Moyen | Tests CI sur les 3 OS + documentation des limitations par plateforme | Faible |
| **Adoption communautaire insuffisante** | Moyen | Stratégie marketing ciblée (r/rust, HN, DFIR community) + documentation de contribution exemplaire | Moyen |

### 7.1 Prochaine action — Démarrer maintenant

Le projet peut démarrer en 15 minutes avec les commandes suivantes :

```bash
# Prérequis : Rust stable, Node.js 20+, Tauri CLI
cargo install tauri-cli --version "^2"

# Créer le projet
cargo tauri init nexuslog
cd nexuslog

# Ajouter les dépendances core
cargo add evtx --features multithreading
cargo add tokio --features full
cargo add rayon serde serde_json chrono thiserror uuid flume tracing

# Dépendances Windows-only (ajoutées manuellement dans Cargo.toml)
# [target.'cfg(windows)'.dependencies]
# windows = { version = "0.58", features = ["Win32_System_EventLog", "Win32_Foundation"] }

# Installer les deps frontend
npm install @tauri-apps/api @tanstack/react-virtual zustand recharts react-i18next i18next date-fns

# Lancer le dev mode
cargo tauri dev
```

| **Ressources clés** |
| --- |
| `evtx` crate: docs.rs/crate/evtx · `windows-rs`: microsoft.github.io/windows-docs-rs · Tauri v2: v2.tauri.app · Samples EVTX: github.com/libyal/libevtx/tree/main/samples · SigmaHQ Rules: github.com/SigmaHQ/sigma · Hayabusa (référence Sigma): github.com/Yamato-Security/hayabusa · EVTX Web (référence UI): github.com/omerbenamram/evtx |

> **Conseil stratégique** : Le plus grand risque n'est pas technique mais celui de la rapidité d'exécution. EVTX Web est activement développé et pourrait ajouter un wrapper Tauri à tout moment. Le premier à livrer un MVP fonctionnel avec mode Live et Sigma gagne le marché. Priorisez Phase 0 + Phase 1 en 4 semaines maximum.
