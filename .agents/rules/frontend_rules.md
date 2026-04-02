# Règles de Développement Frontend — NexusLog

Lors de tout développement, modification ou ajout de fonctionnalité sur le frontend NexusLog, respectez **scrupuleusement** l'architecture et les règles suivantes.

---

## 1. Structure du Projet et Séparation des Responsabilités

Le projet `frontend/src/` suit une architecture stricte basée sur Next.js App Router (mode Static Export pour Tauri). Ne mélangez jamais la logique de données et l'UI.

### `app/` (Routing & Pages)
- Contient les routes Next.js.
- Pages = conteneurs de layout. Déléguez la logique aux composants.
- Toutes les pages doivent être marquées `"use client"` (static export Tauri).

### `components/` (UI & Feature Components)
- Groupés par fonctionnalité métier : `components/events/`, `components/sigma/`, `components/filters/`
- **`components/ui/`** : Composants génériques réutilisables (StatusChip, LoadingSpinner, ProgressBar, etc.). **Toujours vérifier s'il n'existe pas déjà ici avant d'en créer un nouveau.**
- **`components/layout/`** : AppLayout, Header, Sidebar.

### `hooks/` (Custom Hooks)
- Hooks personnalisés pour l'IPC Tauri (`useEventLog`), le thème (`useTheme`), etc.
- Un hook = une responsabilité unique.

### `store/` (État Global — Zustand)
- Un store par domaine : `eventStore`, `filterStore`, `settingsStore`.
- **Pas de logique métier complexe dans les stores** — uniquement état + actions simples.

### `types/` (Modèles TypeScript)
- Centralise toutes les interfaces. **Alignment strict avec les structs Rust du backend.**
- Fichiers : `models.ts`, `filters.ts`, `i18n.d.ts`

### `i18n/` (Internationalisation)
- Configuration i18next + fichiers de traduction `locales/en.json` et `locales/fr.json`.

### `styles/` (Design System)
- `theme.ts` : Configuration thème dark/light, color maps, utilitaires.
- `globals.css` : CSS custom properties (tokens), animations, glassmorphism.

---

## 2. Sécurité TypeScript — Tolérance Zéro

> **Règle fondamentale** : TypeScript est notre première ligne de défense. Traitez chaque violation de type comme une faille de sécurité potentielle.

### 2.1 Configuration Compilateur (`tsconfig.json`)

Le `tsconfig.json` est configuré en **mode sécurité maximale**. Ne désactivez **JAMAIS** ces options :

| Option | Effet de Sécurité |
|---|---|
| `"strict": true` | Active l'ensemble des vérifications strictes (noImplicitAny, strictNullChecks, etc.) |
| `"noUncheckedIndexedAccess": true` | Tout accès par index (`arr[i]`, `obj[key]`) est potentiellement `undefined` → force une vérification |
| `"exactOptionalPropertyTypes": true` | Interdit l'assignation implicite de `undefined` aux propriétés optionnelles |
| `"noUnusedLocals": true` | Variables inutilisées = erreur de compilation |
| `"noUnusedParameters": true` | Paramètres inutilisés = erreur de compilation |
| `"noImplicitReturns": true` | Toutes les branches de code doivent retourner une valeur |
| `"noFallthroughCasesInSwitch": true` | Empêche le fall-through accidentel dans les switch |
| `"noPropertyAccessFromIndexSignature": true` | Force l'accès explicite via bracket notation pour les signatures d'index |
| `"noImplicitOverride": true` | Mot-clé `override` obligatoire pour les méthodes de classe surchargées |

### 2.2 Interdictions Absolues

```typescript
// ❌ INTERDIT — any désactive TOUTE sécurité TypeScript
function process(data: any) { ... }

// ✅ CORRECT — unknown force la vérification avant utilisation
function process(data: unknown) {
  if (isEventRecord(data)) {
    // TypeScript connaît le type ici
  }
}
```

| Pratique Interdite | Alternative Sécurisée |
|---|---|
| `any` comme type | `unknown` + type guard / type narrowing |
| `as` cast sans vérification | Type guards (`is`, `instanceof`, `typeof`, `in`) |
| `@ts-ignore` | `@ts-expect-error` avec commentaire expliquant pourquoi |
| `// eslint-disable` sans motif | Corriger l'erreur ou documenter la raison précise |
| `!` (non-null assertion) sans preuve | Optional chaining `?.` + nullish coalescing `??` |
| `Object`, `Function`, `{}` comme types | Interfaces spécifiques ou `Record<string, unknown>` |
| `String`, `Number`, `Boolean` (classes) | `string`, `number`, `boolean` (primitifs) |

### 2.3 Gestion des Erreurs — Pattern Obligatoire

```typescript
// ❌ INTERDIT — catch avec any implicite
try { ... } catch (e) { console.log(e.message); }

// ✅ CORRECT — catch avec unknown + narrowing
try {
  const result = await invoke<string>("greet", { name });
} catch (err: unknown) {
  const message = err instanceof Error
    ? err.message
    : String(err);
  setError(message);
}
```

### 2.4 Accès Indexé — Vérification Obligatoire

Avec `noUncheckedIndexedAccess: true`, tout accès par index est `T | undefined` :

```typescript
const events: EventRecord[] = [...];

// ❌ INTERDIT — potentiel undefined non géré
const first = events[0]; // Type: EventRecord | undefined
first.event_id; // Erreur TS !

// ✅ CORRECT — vérification explicite
const first = events[0];
if (first) {
  console.log(first.event_id); // Type: EventRecord (narrowed)
}

// ✅ CORRECT — alternative avec optional chaining
const eventId = events[0]?.event_id ?? 0;
```

### 2.5 Sécurité IPC Tauri — Frontière de Confiance

Le frontend est traité comme **non fiable** par Tauri. Toutes les données IPC doivent être :

```typescript
// ✅ CORRECT — invoke avec type générique explicite
const result = await invoke<EventRecord[]>("load_file", { path: filePath });

// ❌ INTERDIT — invoke sans type = any implicite
const result = await invoke("load_file", { path: filePath });
```

**Règles IPC :**
- Toujours spécifier le type de retour `invoke<T>()` avec le type attendu
- Toujours wrapper dans un `try/catch` avec `err: unknown`
- Ne jamais exposer les détails d'erreur backend bruts à l'utilisateur
- Valider les données reçues avant de les injecter dans le state

### 2.6 Type Guards — Patterns Recommandés

```typescript
// Type guard pour vérifier un EventRecord
function isEventRecord(data: unknown): data is EventRecord {
  return (
    typeof data === "object" &&
    data !== null &&
    "record_id" in data &&
    "event_id" in data &&
    "level" in data &&
    "timestamp" in data
  );
}

// Type guard avec discriminated union
function isErrorResponse(response: unknown): response is { error: string } {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    typeof (response as Record<string, unknown>)["error"] === "string"
  );
}
```

### 2.7 Assertions de Type — Règles Strictes

```typescript
// ❌ INTERDIT — assertion de type aveugle (menteur au compilateur)
const data = response as EventRecord;

// ✅ ACCEPTABLE — assertion après vérification
if (isEventRecord(response)) {
  const data = response; // TypeScript sait que c'est EventRecord
}

// ✅ ACCEPTABLE — assertion nécessaire pour les APIs tierces (documenté)
// @ts-expect-error — L'API Tauri retourne un type correct mais la signature est générique
const handle = await invoke<string>("start_watch");
```

---

## 3. Internationalisation (i18n) — Tolérance Zéro Texte en Dur

- **Chaque chaîne visible** (titres, boutons, labels, placeholders, messages d'erreur, tooltips) **DOIT** être traduite.
- Utilisez le hook `useTranslation` de `react-i18next`.
- Import obligatoire en haut du composant : `import "@/i18n/config";`
- Ajoutez les clés dans `i18n/locales/en.json` ET `i18n/locales/fr.json` simultanément.
- Les types i18n sont déclarés dans `types/i18n.d.ts`.

```typescript
// ❌ INTERDIT
<button>Open File</button>

// ✅ CORRECT
const { t } = useTranslation();
<button>{t("welcome.openFile")}</button>
```

---

## 4. Design et Thème (UI/UX)

### 4.1 Tokens CSS — Jamais de Couleurs Hexadécimales en Dur

```css
/* ❌ INTERDIT — couleur hexadécimale en dur */
color: #ff4757;
background: #0d1117;

/* ✅ CORRECT — utiliser les tokens CSS */
color: var(--color-error);
background: var(--color-bg-primary);
```

### 4.2 Dark Mode First
- Le thème par défaut est **dark mode**.
- Toutes les couleurs doivent fonctionner en dark ET light via `data-theme="dark|light"`.
- Utilisez les CSS custom properties définies dans `globals.css`.

### 4.3 Glassmorphism et Animations
- Utilisez la classe `.glass` pour l'effet glassmorphism.
- Respectez `prefers-reduced-motion` pour l'accessibilité.
- Toutes les transitions via les tokens : `var(--transition-fast)`, `var(--transition-base)`, `var(--transition-slow)`.

### 4.4 Tailwind v4
- Tailwind est disponible pour les utilitaires (flex, grid, padding, margin).
- Les couleurs, ombres et animations complexes passent par les CSS custom properties.
- Ne mélangez pas les classes Tailwind pour les couleurs avec les tokens CSS.

---

## 5. Composants — Conventions

### 5.1 Nommage
- Composants : `PascalCase` (ex: `EventTable.tsx`, `FilterBar.tsx`)
- Hooks : `camelCase` avec préfixe `use` (ex: `useEventLog.ts`)
- Stores : `camelCase` avec suffixe `Store` (ex: `eventStore.ts`)
- Types : `PascalCase` pour les interfaces/types, fichiers en `camelCase`

### 5.2 Structure d'un Composant

```typescript
"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "@/i18n/config";

interface MyComponentProps {
  /** Description de la prop */
  title: string;
  /** Callback typé */
  onAction: (id: number) => void;
}

/**
 * Description du composant.
 * Phase X — Section Y
 */
export function MyComponent({ title, onAction }: MyComponentProps) {
  const { t } = useTranslation();
  // ...
}
```

### 5.3 Props
- Toujours définir une interface `XxxProps` pour chaque composant.
- Documenter chaque prop avec JSDoc.
- **Pas de props `any`** — utiliser des types précis ou des génériques.

---

## 6. Gestion d'État (Zustand)

- Un store par domaine métier.
- Les stores exposent l'état ET les actions dans la même interface.
- Types stricts sur tout l'état — **pas de `any` dans les stores**.
- Utiliser `set((state) => ...)` pour les mises à jour dépendant de l'état précédent.

---

## 7. Performance

- Utiliser `useCallback` pour les handlers passés en props.
- Utiliser `useMemo` uniquement quand le calcul est coûteux (> 1ms).
- Pas de re-renders inutiles : sélectionner précisément les champs du store avec `useStore(store, selector)`.
- Les listes longues (> 1000 éléments) DOIVENT utiliser `@tanstack/react-virtual`.

---

## 8. Accessibilité (a11y)

- ARIA labels sur tous les éléments interactifs.
- Navigation clavier complète (Tab, Enter, Esc).
- Contraste WCAG AA minimum (4.5:1 texte normal, 3:1 texte large).
- Focus visible (`focus-visible`) sur tous les éléments interactifs.
- Respect de `prefers-reduced-motion`.

---

## 9. Contraintes Techniques Strictes

- **`allowJs: false`** — Tout le code DOIT être en TypeScript.
- **Pas de `console.log`** en production — utiliser `tracing` côté Rust, supprimer les logs de debug.
- **Pas de dépendances non déclarées** — tout passe par `package.json`.
- **CI obligatoire** : `npx tsc --noEmit` + `npx eslint .` doivent passer sans erreur.
- **Pas de `@ts-ignore`** — utiliser `@ts-expect-error` avec commentaire.
- **Les imports de types** doivent utiliser `import type { X }` (pas `import { X }` pour les types purs).
