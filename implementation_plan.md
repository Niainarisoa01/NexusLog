# Démarrage de NexusLog sur Linux (Phase 0)

L'objectif de ce plan est de démarrer le développement de NexusLog. Comme vous êtes sur Linux, c'est **tout à fait possible** et c'est même un excellent test pour notre stratégie cross-platform ! 

La seule limitation est que nous ne pouvons pas tester le "Mode Live" (qui dépend des API Windows). Nous allons donc configurer le projet pour que la logique Windows soit ignorée lors de la compilation sur Linux.

## User Review Required

> [!WARNING]
> La création du projet implique le téléchargement de plusieurs paquets (NPM et crates Rust). Assurez-vous d'avoir une connexion internet stable. L'installation de la CLI Tauri prendra également quelques minutes.
> 
> *Acceptez-vous que je lance les commandes d'installation et de génération du projet dans le dossier actuel ?*

## Proposed Changes

Voici les étapes que j'exécuterai dès votre approbation :

### 1. Préparation de l'environnement
Nous avons vérifié que Rust (1.94) et Node (v25) sont installés. La CLI Tauri est cependant manquante.
- Exécuter `cargo install tauri-cli --version "^2"`

### 2. Initialisation du Frontend (Next.js)
Nous allons initialiser l'application web directement dans le dossier `frontend`.
- Exécuter `npx -y create-next-app@latest ./frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
- Configurer Next.js pour l'export statique (requis par Tauri) dans `next.config.mjs`

### 3. Initialisation du Backend (Tauri)
Nous utiliserons l'application web fraîchement créée comme base pour Tauri.
- Initialiser le projet Tauri dans le dossier racine avec `cargo tauri init` (en configurant le path sur `../frontend/out`).
- Ajouter les dépendances de base (evtx, tokio, serde, etc.).

### 4. Configuration Cross-Platform (La partie critique pour Linux)
Afin de pouvoir développer sur Linux sans erreurs de compilation liées à Windows :
- Nous ajouterons la crate `windows` *uniquement* pour la cible Windows dans le fichier `Cargo.toml` (`[target.'cfg(windows)'.dependencies]`).
- Nous créerons les modules de base (`engine/parser.rs`, `engine/live.rs`) en utilisant `#[cfg(windows)]` et `#[cfg(not(windows))]` pour ignorer le code Live sur votre machine Linux tout en gardant le Parser EVTX fonctionnel.

## Open Questions

> [!IMPORTANT]
> - Souhaitez-vous utiliser TailwindCSS bien que votre règle globale frontend pour *Gestion Inscription* interdise Tailwind au profit de MUI ? 
> - **Note :** La règle `user_global` spécifie des contraintes pour *Gestion Inscription*, mais NexusLog (EventLens) est un projet distinct. Voulez-vous que je suive les mêmes règles MUI pour NexusLog, ou préférez-vous la flexibilité de Tailwind pour ce nouveau projet desktop ?

## Verification Plan

### Automatisée
- Lancer `npm run build` dans le dossier frontend.
- Lancer `cargo check` dans le dossier backend (Tauri). Tout doit compiler sous Linux sans erreur.

### Manuelle
- Démarrer l'application avec `cargo tauri dev` et s'assurer que l'interface "Hello World" s'ouvre correctement dans la fenêtre Tauri sur Linux.
