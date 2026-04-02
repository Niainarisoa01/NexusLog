# NexusLog

<div align="center">

**Ultra-fast Windows Event Log Viewer — Rust + Tauri**

[![CI](https://github.com/Niainarisoa01/NexusLog/actions/workflows/ci.yml/badge.svg)](https://github.com/Niainarisoa01/NexusLog/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.77%2B-orange.svg)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/tauri-v2-blueviolet.svg)](https://v2.tauri.app/)

*Parse 1M+ events in seconds. Search instantly. Detect threats with Sigma rules.*

</div>

---

## 🚀 Features

| Feature | Status |
|---|---|
| ⚡ **Blazing Fast** — Parse 500MB `.evtx` files in < 5 seconds | 🔧 Phase 0 |
| 🖥️ **Native Desktop** — Tauri v2 with modern React UI | 🔧 Phase 0 |
| 🌍 **Cross-Platform** — Analyze `.evtx` on Windows, Linux & macOS | 🔧 Phase 0 |
| 🌐 **i18n** — English & French, extensible | 🔧 Phase 0 |
| 📊 **Virtual Scrolling** — Handle 1M+ rows without lag | ⬜ Phase 1 |
| 🔍 **Full-Text Search** — tantivy-powered instant search | ⬜ Phase 2 |
| 📡 **Live Mode** — Real-time Windows Event monitoring | ⬜ Phase 2 |
| 🛡️ **Sigma Rules** — Built-in threat detection (DFIR) | ⬜ Phase 3 |
| 📈 **Dashboard** — Visual statistics and timelines | ⬜ Phase 3 |
| 🔌 **Plugin System** — Extensible architecture | ⬜ Phase 3 |

## 🏗️ Architecture

```
NexusLog/
├── src-tauri/          # Rust backend (parsing, search, live monitoring)
│   └── src/
│       ├── engine/     # Core logic (parser, streaming, models)
│       ├── commands/   # Tauri IPC commands
│       ├── plugins/    # Plugin API
│       └── db/         # SQLite persistence
├── frontend/           # Next.js + React + TypeScript
│   └── src/
│       ├── app/        # Next.js pages
│       ├── components/ # UI components
│       ├── hooks/      # Custom hooks (IPC, theme)
│       ├── store/      # Zustand state management
│       ├── i18n/       # Translations (EN/FR)
│       ├── types/      # TypeScript interfaces (mirror Rust)
│       └── styles/     # Design system + theme
└── .github/workflows/  # CI/CD pipeline
```

## 🛠️ Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) 1.77+
- [Node.js](https://nodejs.org/) 20+
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/) (`cargo install tauri-cli --version "^2"`)

### Development

```bash
# Clone
git clone https://github.com/Niainarisoa01/NexusLog.git
cd NexusLog

# Install frontend dependencies
cd frontend
npm install

# Run in dev mode (from project root)
cd ../src-tauri
cargo tauri dev
```

### Build

```bash
cd src-tauri
cargo tauri build
```

## 📖 Documentation

- [Documentation Technique](Documentation.md) — Architecture complète
- [Roadmap](Roadmap.md) — Plan de développement par phases
- [Règles Frontend](.agents/rules/frontend_rules.md) — Standards TypeScript sécurisé

## 🔒 Security

- **TypeScript strict mode** with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **Zero `any` policy** — All code strictly typed
- **Tauri capability-based permissions** — Principle of least privilege
- **CI security audits** — `cargo audit` + `npm audit` on every PR

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
