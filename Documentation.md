# EventLens
Windows Event Log Viewer moderne — Rust + Tauri

*Plan de développement complet*  
Avril 2026 · Version 1.0

## 1. Vision du Projet

### 1.1 Problème à résoudre
Windows Event Viewer existe depuis Windows 2000 et n'a subi aucune refonte majeure de son interface. Pourtant, il reste l'outil de référence pour diagnostiquer les crashs système, auditer la sécurité, et déboguer les services Windows — des tâches effectuées quotidiennement par des millions de développeurs et administrateurs systèmes.

Les douleurs concrètes des utilisateurs actuels :
* Interface archaïque, lente à charger avec de gros fichiers `.evtx` (> 100 Mo)
* Filtres basiques sans opérateurs logiques complexes (ET / OU imbriqués)
* Pas de recherche full-text sur les données d'événements
* Pas d'export moderne (JSON, CSV avec headers propres)
* Pas de corrélation entre plusieurs fichiers/logs
* Fermé, non extensible, non scriptable

| **Opportunité de marché** |
| --- |
| Aucun projet Rust avec GUI complet n'existe pour ce besoin. Les outils open source existants (WELA, evtx_dump) sont uniquement CLI. Les alternatives payantes (EventLog Explorer, ManageEngine) coûtent 200-500$/an. EventLens peut s'imposer comme la référence open source. |

### 1.2 Proposition de valeur
EventLens est un viewer Windows Event Log natif, ultra-rapide, open source, écrit en Rust avec une interface moderne Tauri. Il cible trois profils utilisateurs :
* Développeurs Windows : debug d'applications, services, crash dumps
* Administrateurs systèmes : audit de sécurité, analyse d'incidents, conformité
* Analystes DFIR : forensique rapide sur fichiers `.evtx` hors-ligne

### 1.3 Différenciateurs clés vs Event Viewer
* Chargement d'un fichier 500 Mo en < 2 secondes (vs 30+ sec)
* Recherche full-text sur tous les champs des événements
* Filtres XPath visuels + mode requête avancée
* Surveillance temps réel des canaux actifs avec alertes
* Corrélation multi-fichiers sur timeline unifiée
* Export JSON / CSV / JSONL propre
* Binaire natif < 15 Mo, aucune dépendance

## 2. Architecture Technique

### 2.1 Stack technologique
EventLens suit une architecture en deux couches clairement séparées :

| **Couche** | **Rôle** |
| --- | --- |
| **Backend Rust** (`src-tauri/`) | Toute la logique métier lourde : parsing EVTX, requêtes Windows API Live, filtrage, indexation, export. Accès complet aux ressources système. Communique avec le frontend via les commandes Tauri (IPC sécurisé). |
| **Frontend Next.js + React + TS** (`src/`) | Interface utilisateur rapide et réactive générée sous forme statique. Reçoit les données du backend via `invoke()`. Aucun accès direct aux APIs — tout passe par Tauri. |

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
| `tracing` | 0.1.x | Logging interne structuré de l'application | Dev |
| `thiserror` | 1.x | Gestion d'erreurs ergonomique avec types custom | Dev |

### 2.3 Structure du projet
Organisation recommandée du workspace Cargo :

```text
eventlens/
├── Cargo.toml               # Workspace
├── src/                     # Frontend React/TS
│   ├── components/
│   │   ├── EventTable.tsx   # Tableau virtualisé
│   │   ├── FilterBar.tsx    # Filtres visuels
│   │   ├── DetailPanel.tsx  # Détail événement
│   │   └── Timeline.tsx     # Vue chronologique
│   ├── hooks/
│   │   ├── useEventLog.ts   # Appels invoke()
│   │   └── useLiveLog.ts    # Streaming temps réel
│   └── store/               # Zustand state
├── src-tauri/
│   ├── src/
│   │   ├── main.rs          # Entry point Tauri
│   │   ├── commands/        # Commandes exposées
│   │   │   ├── load_file.rs # Chargement .evtx
│   │   │   ├── live_log.rs  # Surveillance live
│   │   │   ├── filter.rs    # Filtrage XPath
│   │   │   └── export.rs    # Export JSON/CSV
│   │   ├── engine/          # Logique métier
│   │   │   ├── parser.rs    # Wraps evtx crate
│   │   │   ├── live.rs      # EvtSubscribe
│   │   │   ├── search.rs    # Index tantivy
│   │   │   └── models.rs    # Types partagés
│   │   └── lib.rs
│   └── tauri.conf.json
└── package.json
```

### 2.4 Modèle de données central
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
}
```

### 2.5 Modes d'accès aux logs
EventLens supporte deux modes de lecture, gérés par des modules séparés :

#### Mode Fichier (.evtx)
Utilise la crate `evtx` avec parallélisme `rayon` pour un parsing ultra-rapide. Un fichier de 500 Mo (~1M d'événements) se charge en moins de 3 secondes sur du matériel moderne.

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
```

#### Mode Live (canaux Windows actifs)
Utilise l'API Windows `EvtSubscribe` via `windows-rs` pour un abonnement temps réel aux canaux. Les événements sont streamés vers le frontend via Tauri Events.

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

## 3. Roadmap de Développement

### 3.1 Vue d'ensemble des phases

| **Phase** | **Nom** | **Objectifs** | **Durée** | **Livrable** |
| --- | --- | --- | --- | --- |
| **Phase 0** | **Fondations** | Setup projet, parsing `.evtx` CLI, modèle de données fonctionnel | Semaine 1-2 | CLI |
| **Phase 1** | **MVP GUI** | Tableau d'événements, Next.js UI, filtres, chargement fichier | Semaine 3-5 | App Tauri v0.1 |
| **Phase 2** | **Live + Search** | Surveillance temps réel, recherche full-text `tantivy` | Semaine 6-9 | v0.2 — Beta |
| **Phase 3** | **Features Pro** | Corrélation, export, alertes, plugins | Semaine 10-14 | v1.0 stable |
| **Phase 4** | **Distribution** | Installeur Windows, auto-update, docs, site web | Semaine 15-16 | Release publique |

### 3.2 Phase 0 — Fondations (Semaines 1-2)

#### Objectif
Valider le parsing, définir les modèles, mettre en place le projet Tauri. Le résultat est un binaire CLI capable de lire un `.evtx` et d'afficher les événements en JSON.

#### Tâches
1. Initialiser le projet : `cargo new`, `npx create-next-app@latest`, configurer le build statique (`output: 'export'`), puis `cargo tauri init`
2. Créer `engine/models.rs` avec les types `EventRecord`, `EventLevel`, `FilterQuery`
3. Implémenter `engine/parser.rs` — wrapping de la crate `evtx` avec `rayon`
4. Tester les performances : fichier 100 Mo, 500 Mo, 1 Go
5. Configurer les permissions Tauri (filesystem read, path resolver)
6. Mettre en place CI GitHub Actions : `cargo test` + `cargo clippy` + `cargo fmt`

#### Code de démarrage — parser.rs
```toml
[dependencies]
evtx = { version = "0.11", features = ["multithreading"] }
rayon = "1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chrono = { version = "0.4", features = ["serde"] }
tokio = { version = "1", features = ["full"] }
tauri = { version = "2", features = [] }
windows = { version = "0.58", features = ["Win32_System_EventLog", "Win32_Foundation"] }
```

#### Critère de succès
| **Go / No-Go Phase 0** |
| --- |
| Un fichier `security.evtx` de 200 Mo se parse entièrement en moins de 4 secondes sur une machine standard (Core i5, 8 Go RAM). Le JSON produit contient tous les champs System + EventData. |

### 3.3 Phase 1 — MVP GUI (Semaines 3-5)

#### Objectif
L'utilisateur peut ouvrir un fichier `.evtx` via un dialogue, voir les événements dans un tableau virtualisé, et filtrer par niveau/date/EventID. C'est la démo montrable.

#### Composants Rust (commandes Tauri)
* `load_file(path: String) -> Result<Vec<EventRecord>>` — chargement avec progress
* `filter_events(query: FilterQuery) -> Result<Vec<EventRecord>>` — filtrage
* `get_event_detail(id: u64) -> Result<EventRecord>` — détail complet + XML brut

#### Composants Frontend (Next.js / React)
1. `EventTable.tsx` — tableau virtualisé (`react-virtual`) pour 1M+ lignes sans lag
2. `FilterBar.tsx` — composant client avec sélecteurs (Niveau, Range, EventID...)
3. `DetailPanel.tsx` — panneau latéral avec JSON pretty-print et XML brut
4. `app/page.tsx` — Entry point du layout Next.js
5. `FileDropZone` — drag & drop de fichiers `.evtx`

#### Décisions UX importantes
* Tableau avec colonnes redimensionnables : Date, Niveau (colored badge), EventID, Source, Message
* Icônes de niveau colorées : rouge (Critical/Error), orange (Warning), gris (Info/Verbose)
* Click sur ligne = panneau détail sans perdre la liste
* Shortcut Ctrl+F = focus sur la barre de recherche

#### Critère de succès
| **Go / No-Go Phase 1** |
| --- |
| L'interface affiche 100 000 événements sans scroll lag. Le filtrage par niveau renvoie les résultats en < 100ms. Démontrable à un ami non-technique en 30 secondes. |

### 3.4 Phase 2 — Live & Search (Semaines 6-9)

#### Objectif
Ajouter la surveillance temps réel des canaux Windows actifs et la recherche full-text sur les données d'événements — les deux features qui distinguent radicalement EventLens de l'Event Viewer natif.

#### Surveillance temps réel (Live Mode)
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

#### Canaux Windows à supporter
* System — événements système kernel
* Application — logs d'applications
* Security — audit de sécurité (nécessite admin)
* Setup — installation/mise à jour Windows
* Microsoft-Windows-* — canaux manufacturiers (optionnels, > 300 canaux)

#### Critère de succès
| **Go / No-Go Phase 2** |
| --- |
| Le mode live affiche les nouveaux événements en < 500ms après leur génération. La recherche full-text retourne des résultats en < 300ms sur un index de 500k événements. |

### 3.5 Phase 3 — Features Pro (Semaines 10-14)

#### 3.5.1 Corrélation multi-fichiers
Permettre de charger plusieurs fichiers `.evtx` simultanément et de les visualiser sur une timeline unifiée triée par timestamp. Essentiel pour l'analyse DFIR sur plusieurs machines.

#### 3.5.2 Système d'alertes
Définir des règles (EventID + niveau + pattern de message) qui déclenchent des notifications Windows natives via la notification WinAPI. Stockage des règles en SQLite local.

#### 3.5.3 Export avancé
* Export JSON / JSONL (compatible SIEM, Splunk, Elasticsearch)
* Export CSV avec headers configurables
* Export HTML rapport (résumé statistique + tableau des événements critiques)

#### 3.5.4 Statistiques et dashboard
Vue synthétique pour un fichier ou canal : répartition par niveau (graphique bâtons), top 10 EventIDs, top 10 providers, timeline d'activité par heure.

#### 3.5.5 Mode Expert XPath
Zone de texte pour saisir directement des requêtes XPath Windows Event Log pour les utilisateurs avancés. Syntaxe colorée avec validation en temps réel.

### 3.6 Phase 4 — Distribution (Semaines 15-16)

#### Installeur Windows
* Build NSIS via Tauri CLI (`cargo tauri build`)
* Signature du code (Code Signing Certificate — environ 200$/an)
* Publication sur GitHub Releases + page de téléchargement

#### Auto-update
* Plugin `tauri-plugin-updater` — vérifie GitHub Releases API
* Notifie l'utilisateur des nouvelles versions sans forcer la mise à jour

#### Documentation
* `README.md` avec GIFs animés des features clés
* Wiki GitHub : guide d'utilisation, guide de contribution
* `CHANGELOG.md` maintenu avec Conventional Commits

## 4. Spécifications Fonctionnelles

### 4.1 Filtrage avancé
Le système de filtrage est l'un des différenciateurs majeurs. Deux modes sont disponibles :

#### Mode Visuel (débutants)
Sélecteurs dans la barre de filtres : niveau, plage de dates, EventID, provider, channel, ordinateur. Les filtres s'accumulent (logique ET par défaut avec toggle OU).

#### Mode XPath Expert
Champ texte libre acceptant la syntaxe XPath standard des Windows Event Logs, identique à ce qu'accepte l'Event Viewer natif ou PowerShell `Get-WinEvent` :

```xml
*[System[(Level=1 or Level=2) and TimeCreated[@SystemTime >= '2026-01-01T00:00:00']]]
and EventData[Data[@Name='LogonType'] = '3']
```

### 4.2 Interface utilisateur — Layout
L'interface suit un layout en trois zones :
* Barre latérale gauche : liste des canaux disponibles (live) / fichiers ouverts
* Zone centrale : tableau d'événements (> 80% de l'espace)
* Panneau inférieur/droit collapsible : détail de l'événement sélectionné

Le tableau d'événements affiche les colonnes suivantes (toutes réordonables/redimensionnables) :
* Date/Heure — format ISO 8601 ou relatif (il y a 2 min)
* Niveau — badge coloré (Critical, Error, Warning, Information, Verbose)
* ID — EventID numérique
* Source — Provider name
* Description — premiers 100 caractères du message
* Ordinateur — nom de la machine source

### 4.3 Panneau de détail d'événement
Quand un événement est sélectionné, le panneau détail affiche :
* Onglet Général : tous les champs System formatés (timestamp, level, eventID, task, keywords...)
* Onglet Données : EventData sous forme de table clé/valeur avec copie rapide
* Onglet XML brut : le XML complet de l'événement avec coloration syntaxique
* Onglet Contexte : les N événements avant/après sur la timeline (corrélation rapide)

### 4.4 Permissions Windows requises
EventLens gère proprement les permissions selon le canal :
* Canaux publics (Application, System) : aucune élévation requise
* Canal Security : nécessite les privilèges administrateur — l'app demande l'élévation UAC si nécessaire
* Canaux Microsoft-Windows-* : variables, l'app informe l'utilisateur

| **Note de sécurité** |
| --- |
| EventLens ne stocke aucune donnée d'événement sur des serveurs externes. Toute l'analyse reste locale à la machine. Aucune télémétrie sans consentement explicite. |

## 5. Qualité & Tests

### 5.1 Stratégie de test
Trois niveaux de tests couvrent l'ensemble de l'application :

#### Tests unitaires Rust
* `engine/parser.rs` — fixtures `.evtx` de taille connue, validation des champs
* `engine/filter.rs` — cas limites des filtres XPath et visuels
* `engine/search.rs` — précision de l'index `tantivy` sur corpus de test
* `engine/models.rs` — sérialisation/désérialisation aller-retour

#### Tests d'intégration
* Chargement de fichiers `.evtx` publics (Microsoft fournit des samples)
* Cycle complet : load -> filter -> export -> re-import
* Tests de performance avec `hyperfine` en CI pour détecter les régressions

#### Tests End-to-End
* Tauri propose `webdriver` pour tester l'interface complète
* Scénarios : ouverture fichier, filtrage, export, live mode on/off

### 5.2 Benchmarks de performance
Les objectifs de performance mesurés en CI à chaque PR :

| **Opération** | **Objectif** | **Mesure** |
| --- | --- | --- |
| Chargement `.evtx` 100 Mo | **< 1.5 seconde** | `hyperfine` + `cargo bench` |
| Chargement `.evtx` 500 Mo | **< 5 secondes** | `hyperfine` + `cargo bench` |
| Filtrage sur 500k événements | **< 100ms** | `criterion` bench |
| Recherche full-text (`tantivy`) | **< 300ms** | `criterion` bench |
| Rendu 100k lignes tableau | **scroll 60fps** | Chrome DevTools |
| Latence live event | **< 500ms** | test automatisé |
| RAM au repos | **< 80 Mo** | Process monitor |
| RAM 500k events chargés | **< 500 Mo** | Process monitor |

### 5.3 CI/CD Pipeline
GitHub Actions avec les étapes suivantes sur chaque PR et `push` `main` :
1. `cargo fmt --check` — formatage uniforme
2. `cargo clippy -- -D warnings` — zéro warning toléré
3. `cargo test --all` — tous les tests unitaires et d'intégration
4. `cargo bench` — benchmarks avec comparaison à la baseline
5. `npm run build` — compilation Next.js statique (next build)
6. `cargo tauri build` — build complet Windows (matrix: x86_64, i686)
7. Création automatique du release draft sur tag `v*.*.*`

## 6. Stratégie de Distribution & Monétisation

### 6.1 Modèle open source
EventLens est publié sous licence MIT — le code est entièrement open source. Cette décision est stratégique : elle construit la confiance dans un outil qui accède aux logs de sécurité, et favorise l'adoption communautaire.

### 6.2 Chemins de monétisation
#### Option A — Sponsoring GitHub (recommandé en phase 1)
GitHub Sponsors permet aux utilisateurs et entreprises de soutenir le projet. Les grands outils open source Windows (Everything, FanControl, AutoHotkey) reçoivent des dizaines de milliers de dollars/an via ce modèle.

#### Option B — Version Pro (phase 2, après 1000+ utilisateurs)
* Features Pro : règles d'alerte avancées, export HTML, profils de filtres partagés en équipe
* Prix indicatif : 29$/an individuel, 99$/an équipe 5 seats
* Le coeur reste open source — seules les features enterprise sont payantes

#### Option C — Support entreprise
* Contrat de support pour déploiements DFIR/SOC en entreprise
* Intégration custom SIEM, formation

### 6.3 Stratégie de distribution initiale
1. Publier sur GitHub avec README de qualité professionnelle + GIFs
2. Poster sur `r/rust`, `r/sysadmin`, `r/netsec` — ces communautés adorent les outils Rust
3. Article de blog technique : "Parsing 1M Windows events in 3 seconds with Rust"
4. Soumettre sur Hacker News (Show HN)
5. Publier sur `winget` et Chocolatey pour une installation simple
6. Contacter les auteurs d'articles sur l'Event Viewer pour mention

## 7. Risques & Mitigations

| **Risque** | **Impact** | **Mitigation** | **Probabilité** |
| --- | --- | --- | --- |
| Faux positif antivirus sur le binaire Rust (WinAPI) | Élevé | Signature de code + soumission aux AV vendors | Moyen |
| EvtSubscribe nécessite admin pour canal Security | Moyen | UAC prompt clair + doc utilisateur | Faible |
| WebView2 non installé sur Windows 10 ancien | Moyen | Bundler WebView2 en option dans l'installeur | Faible |
| Performances insuffisantes sur gros fichiers | Élevé | Benchmarks dès Phase 0 + streaming lazy | Faible |
| Breaking change API Windows dans future version | Faible | Abstraction `engine/` isole les dépendances WinAPI | Très faible |
| Fragmentation des formats de canaux manufacturiers | Moyen | Parser XML générique, pas de format hard-codé | Moyen |

### 7.1 Prochaine action — Démarrer maintenant
Le projet peut démarrer en 15 minutes avec les commandes suivantes :

```bash
# Prérequis : Rust stable, Node.js 20+, Tauri CLI
cargo install tauri-cli --version "^2"

# Créer le projet
cargo tauri init eventlens
cd eventlens

# Ajouter les dépendances core
cargo add evtx --features multithreading
cargo add windows --features Win32_System_EventLog,Win32_Foundation
cargo add tokio --features full
cargo add rayon serde serde_json chrono thiserror

# Lancer le dev mode
cargo tauri dev
```

| **Ressources clés** |
| --- |
| `evtx` crate: docs.rs/crate/evtx · `windows-rs`: microsoft.github.io/windows-docs-rs · Tauri v2: v2.tauri.app · Samples EVTX: github.com/libyal/libevtx/tree/main/samples |
