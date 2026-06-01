# Luna UI

**An unstyled, fully-typed React component library for building AI agent & automation dashboards.**

Luna UI is the frontend toolkit for the Luna platform. It ships the React components, domain editors, flow canvas, and run-observability views you need to build a control plane for **agentic automation** — connectors, AI agents, multi-step flows, schedules, and live run streams — and pairs them with the wire types of [**luna-core**](#relationship-with-luna-core), the Python backend that powers them.

It is **headless by design**: components carry layout and behavior but no baked-in colors. You provide a handful of CSS variables and the whole library themes itself to match your app — light, dark, or anything in between.

```
┌─────────────────────────────────────────────────────────────┐
│  luna-core  (Python)            luna-ui  (React, this repo)  │
│  ───────────────────            ─────────────────────────   │
│  FastAPI routers          ◄──►  Forms (Agent/Connector/Op)  │
│  Flow engine (LangGraph)  ◄──►  Flow editor + visualizer     │
│  Run events (WS + REST)   ◄──►  Run timeline / conversation   │
│  Pydantic schemas         ═══►  TypeScript types (mirrored)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Table of contents

- [Why Luna UI](#why-luna-ui)
- [Installation](#installation)
- [Theming (required)](#theming-required)
- [Quick start](#quick-start)
- [Component reference](#component-reference)
  - [Base UI primitives](#base-ui-primitives)
  - [Domain primitives](#domain-primitives)
  - [Layout](#layout)
  - [Entity cards](#entity-cards)
  - [Domain forms](#domain-forms)
  - [Instructions editor](#instructions-editor)
  - [The Flow system](#the-flow-system)
  - [Run observability](#run-observability)
  - [Chat subsystem](#chat-subsystem)
  - [Hooks & helpers](#hooks--helpers)
- [Domain model & types](#domain-model--types)
- [Relationship with luna-core](#relationship-with-luna-core)
- [Design principles](#design-principles)
- [Building from source](#building-from-source)
- [License](#license)

---

## Why Luna UI

Building a dashboard for an AI automation backend means re-solving the same hard UI problems over and over:

- Rendering a **streaming agent run** — interleaved text deltas, thinking traces, tool calls, tool results, human checkpoints, and nested iteration loops — into something a human can read.
- Editing a **visual flow graph** with typed nodes, conditional edges, and per-node configuration panels.
- Writing **agent instructions** that reference live context with autocomplete and schema-aware validation.
- Defining **HTTP connectors and operations** with parameters, auth, retries, and a live test panel.
- Authoring **recurring schedules** without making users hand-write cron.

Luna UI provides all of this as composable, controlled React components. Every component is presentational and state-driven — **it never fetches data or owns server state**. You wire it to your data layer (React Query, SWR, Redux, plain `fetch`, anything) and the components render.

---

## Installation

```bash
npm install luna-ui
# or  pnpm add luna-ui   /   yarn add luna-ui
```

**Peer dependencies** — provided by your app:

```bash
npm install react@^18 react-dom@^18
```

Luna UI targets **React 18+**. It bundles its own copies of Radix UI, Tiptap, `@xyflow/react` (React Flow), Monaco, `lucide-react`, `react-markdown`, `zustand`, and `dagre`, so you don't need to install those yourself.

---

## Theming (required)

Luna UI ships a compiled stylesheet that contains **only the Tailwind utilities the components use** — no color values. All colors, the corner radius, and the font are resolved from **CSS custom properties you define**. Import the stylesheet once, then declare the tokens on `:root`.

```ts
// main.tsx — import once, near your app root
import 'luna-ui/styles.css'
```

```css
:root {
  --color-bg: #0b0b0f;            /* app background */
  --color-surface: #16161d;       /* raised surfaces (cards, menus) */
  --color-border: #26262f;        /* borders & dividers */
  --color-text-primary: #f5f5f7;  /* primary text */
  --color-text-muted: #8b8b96;    /* secondary / muted text */
  --color-accent: #6366f1;        /* brand / interactive accent */
  --color-accent-subtle: #1e1b3a; /* accent-tinted backgrounds */
  --color-accent-border: #3730a3; /* accent borders */
  --color-danger: #ef4444;        /* errors, destructive actions */
  --color-success: #22c55e;       /* success, healthy status */
  --color-warning: #f59e0b;       /* warnings, pending status */
  --radius: 0.5rem;               /* global corner radius */
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

That's the entire theme contract — eleven colors, a radius, and a font. Because class composition runs through [`cn` / `tailwind-merge`](#the-cn-helper), you can always override any component's classes inline via `className` without specificity battles.

---

## Quick start

```tsx
import {
  PageLayout, Sidebar, Topbar,
  CardGrid, FlowCard, Button, RunConversation,
  type Flow, type RunEvent,
} from 'luna-ui'
import { Workflow, Bot, Plug } from 'lucide-react'
import 'luna-ui/styles.css'

function Dashboard({ flows }: { flows: Flow[] }) {
  return (
    <PageLayout
      sidebar={
        <Sidebar
          logo={<span className="font-semibold">Luna</span>}
          sections={[{ items: [
            { label: 'Flows',      icon: <Workflow size={16} />, href: '/flows', active: true },
            { label: 'Agents',     icon: <Bot size={16} />,      href: '/agents' },
            { label: 'Connectors', icon: <Plug size={16} />,     href: '/connectors' },
          ]}]}
          onNavigate={(href) => router.push(href)}
        />
      }
      topbar={<Topbar title="Flows" subtitle="Automation pipelines" actions={<Button>New flow</Button>} />}
    >
      <CardGrid columns={3} emptyState={<p>No flows yet.</p>}>
        {flows.map((f) => <FlowCard key={f.id} flow={f} onClick={() => router.push(`/flows/${f.id}`)} />)}
      </CardGrid>
    </PageLayout>
  )
}

// Rendering a live run — feed it the event stream from luna-core:
function RunView({ events, streaming }: { events: RunEvent[]; streaming: boolean }) {
  return <RunConversation events={events} streaming={streaming} autoScroll />
}
```

---

## Component reference

Everything is exported from the package root (`import { ... } from 'luna-ui'`). Props marked `?` are optional. Every component also accepts `className`.

---

### Base UI primitives

Headless, accessible building blocks. Most wrap a [Radix UI](https://www.radix-ui.com/) primitive; variants are driven by [`class-variance-authority`](https://cva.style/). The compound Radix wrappers (`Dialog`, `Select`, `Popover`, `DropdownMenu`, `Tooltip`, `ScrollArea`) re-export the full Radix part set with theming applied and otherwise keep the Radix prop API.

#### `Button` · `buttonVariants`
Extends `React.ButtonHTMLAttributes`. Use `asChild` to render as a child element (e.g. an `<a>`).

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `variant?` | `'default' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger' \| 'link'` | `'default'` | Visual style |
| `size?` | `'sm' \| 'md' \| 'lg' \| 'icon'` | `'md'` | `icon` = square |
| `asChild?` | `boolean` | `false` | Render via Radix `Slot` |

#### `Input`
`React.InputHTMLAttributes<HTMLInputElement>` — themed text input, `h-9` baseline. No extra props.

#### `Badge` · `badgeVariants`
Extends `React.HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Notes |
| --- | --- | --- |
| `variant?` | `'default' \| 'accent' \| 'success' \| 'danger' \| 'warning' \| 'muted'` | Pill color |

#### `Checkbox`
Native checkbox with built-in label/description. Supports the indeterminate state.

| Prop | Type | Notes |
| --- | --- | --- |
| `checked` | `boolean \| 'indeterminate'` | Controlled state |
| `onCheckedChange?` | `(checked: boolean) => void` | |
| `disabled?` | `boolean` | |
| `id?` | `string` | |
| `label?` | `React.ReactNode` | |
| `description?` | `React.ReactNode` | |
| `align?` | `'start' \| 'center'` | Label/description alignment |

#### `TimePicker`
| Prop | Type | Notes |
| --- | --- | --- |
| `value` | `string` | `"HH:MM"` 24-hour |
| `onChange` | `(next: string) => void` | |
| `minuteStep?` | `number` | Minute column step (default `1`) |
| `disabled?` | `boolean` | |

#### `DayOfWeekToggle`
| Prop | Type | Notes |
| --- | --- | --- |
| `value` | `number[]` | Days `0`–`6` (`0` = Sunday) |
| `onChange` | `(next: number[]) => void` | |
| `weekStart?` | `'sunday' \| 'monday'` | Render order |
| `disabled?` | `boolean` | |

#### `NumberStepper`
| Prop | Type | Notes |
| --- | --- | --- |
| `value` | `number` | |
| `onChange` | `(next: number) => void` | |
| `min?` / `max?` / `step?` | `number` | Clamped input |
| `disabled?` | `boolean` | |
| `aria-label?` | `string` | |

**Also exported:** `Separator`, `Tooltip` (`TooltipTrigger`, `TooltipContent`, `TooltipProvider`), `Dialog` (`DialogPortal`, `DialogOverlay`, `DialogTrigger`, `DialogClose`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`), `Select` (`SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`), `Popover` (`PopoverTrigger`, `PopoverAnchor`, `PopoverContent`), `DropdownMenu` (full part set incl. checkbox/radio items, submenus, `DropdownMenuShortcut`), `ScrollArea` / `ScrollBar`.

---

### Domain primitives

Reusable patterns one level above the base kit.

#### `PulseIndicator`
Extends `React.HTMLAttributes<HTMLSpanElement>`. `size?: 'sm' | 'md'`, `color?: string` (default `var(--color-accent)`).

#### `EmptyState`
| Prop | Type | Notes |
| --- | --- | --- |
| `icon` | `React.ReactNode` | |
| `title` | `string` | |
| `description?` | `string` | |
| `action?` | `{ label: string; onClick: () => void }` \| `React.ReactNode` | Optional CTA |

#### `MarkdownText`
`text: string` → GitHub-flavored markdown rendered to themed HTML (`react-markdown` + `remark-gfm`).

#### `AutoScrollContainer`
Extends `React.HTMLAttributes<HTMLDivElement>` and [`UseAutoScrollOptions`](#useautoscroll). A scroll viewport that sticks to the bottom while content streams.

| Prop | Type | Notes |
| --- | --- | --- |
| `contentClassName?` | `string` | Class on the inner (observed) wrapper |
| `viewportClassName?` | `string` | Class on the `overflow:auto` viewport |
| `showJumpToBottom?` | `boolean` | Show the "jump to latest" pill (default `true`) |
| `jumpToBottomLabel?` | `React.ReactNode` | Pill label |

#### `IconButton`
Extends `React.ButtonHTMLAttributes` (minus `aria-label`). `icon: React.ReactNode`, `label: string` (used as tooltip + `aria-label`), `variant?: 'default' | 'accent' | 'danger'`, `size?: 'sm' | 'md'`.

#### `FilterTabs<T extends string>`
Underlined tab row with optional count badges. `options: { label; value: T; count? }[]`, `value: T`, `onChange: (value: T) => void`.

#### `CardGrid`
Responsive 1–4 column grid with skeletons. `columns?: 1|2|3|4`, `loading?`, `skeletonCount?`, `emptyState?: React.ReactNode`, `children?`.

#### `DataList`
Vertical list with skeletons. `gap?: 1|2|3` (default `2`), `loading?`, `skeletonCount?`, `skeletonHeight?: number`, `emptyState?`, `children?`.

#### `SearchInput`
Extends `React.InputHTMLAttributes` (minus `onChange`/`value`/`size`). `value: string`, `onChange: (value: string) => void`, `onDebouncedChange?: (value: string) => void`, `debounceMs?: number` (default `250`), `size?: 'sm' | 'md'`.

#### `FilterChip` · `FilterBar`
`FilterChip` is a single/multi-select dropdown pill; `FilterBar` arranges a `search` slot, `children` (chips), and a `trailing` slot. (`FilterChipOption` = `{ label; value; count?; icon? }`.)

#### `ScoreRing`
SVG gauge (0–100%). `value: number`, `max?: number` (default `1`; set `100` for percentage inputs), `size?: number` (px), `strokeWidth?: number`, `tone?: ScoreRingTone` (auto-derived if omitted), `label?`, `caption?: React.ReactNode`.

#### `DetailSection` · `DetailField`
`DetailSection`: `title`, `action?`, `children`. `DetailField`: `label`, `value?: React.ReactNode`, `placeholder?` (default `'—'`).

#### `FormField`
`label`, `htmlFor?`, `error?`, `hint?`, `children` (the input).

#### `ConfirmDialog`
| Prop | Type | Notes |
| --- | --- | --- |
| `open` | `boolean` | |
| `onOpenChange` | `(open: boolean) => void` | |
| `title` | `string` | |
| `description?` | `React.ReactNode` | |
| `error?` | `string \| null` | Shown above the buttons (e.g. a 409) |
| `confirmLabel?` / `cancelLabel?` | `string` | |
| `variant?` | `'default' \| 'danger'` | |
| `busy?` | `boolean` | Disables buttons, shows "…" |
| `onConfirm` | `() => void \| Promise<void>` | Kept open on rejection so you can set `error` |
| `children?` | `React.ReactNode` | |

#### `MethodBadge`
`method: string` → color-coded HTTP method chip.

---

### Layout

#### `PageLayout`
Full-viewport shell. `sidebar: React.ReactNode`, `topbar: React.ReactNode`, `children: React.ReactNode`.

#### `Sidebar`
| Prop | Type | Notes |
| --- | --- | --- |
| `logo` | `React.ReactNode` | |
| `sections` | `NavSection[]` | `NavSection = { label?: string; items: NavItem[] }` |
| `bottomItems?` | `NavItem[]` | Pinned to the bottom |
| `onNavigate?` | `(href: string) => void` | |

`NavItem = { label; icon; href; badge?; active?; onClick? }`.

#### `Topbar`
`title: string`, `subtitle?`, `actions?: React.ReactNode`.

---

### Entity cards

Each card renders one luna-core domain entity. They share a `CardAction[]` footer and an optional `onClick`:

```ts
interface CardAction { icon: React.ReactNode; label: string; onClick: () => void; variant?: 'default' | 'accent' | 'danger' }
```

| Component | Required prop | Extra props |
| --- | --- | --- |
| `StatCard` | `label: string`, `value: string \| number` | `change?`, `accent?: boolean`, `live?: boolean` |
| `FlowCard` | `flow: Flow` | `actions?`, `onClick?` |
| `AgentCard` | `agent: Agent` | `actions?`, `onClick?` |
| `ConnectorCard` | `connector: Connector` | `operationsCount?: number`, `actions?`, `onClick?` |
| `OperationCard` | `operation: Operation` | `actions?`, `onClick?` |
| `LLMProviderCard` | `provider: LLMProvider` | `actions?`, `onClick?` |

**Detail / summary cards** (for drawers & modals):

#### `AgentSummary`
| Prop | Type | Notes |
| --- | --- | --- |
| `name` | `string` | |
| `provider?` / `model?` | `string \| null` | |
| `temperature?` | `number \| null` | |
| `role?` / `instructions?` | `string \| null` | Collapsible |
| `operations?` | `AgentSummaryOperation[] \| null` | `null` = still loading |
| `operationsLoading?` | `boolean` | |
| `systemTools?` | `AgentSummarySystemTool[] \| null` | Same loading convention |
| `systemToolsLoading?` | `boolean` | |
| `loading?` | `boolean` | |
| `error?` | `boolean \| string` | |

(`AgentSummaryOperation = { id; name?; description?; method? }`, `AgentSummarySystemTool = { name; description? }`.)

#### `OperationSummary`
`name`, `description?`, `method?`, `path?`, `connector?: OperationSummaryConnector | null` (`{ name; authType?; baseUrl?; description? }`), `loading?`, `error?: boolean | string`.

#### `LLMProviderModelsList`
| Prop | Type | Notes |
| --- | --- | --- |
| `models` | `LLMProviderModel[]` | |
| `loading?` | `boolean` | |
| `error?` | `string \| null` | |
| `selectedId?` | `string \| null` | When set, rows become selectable buttons |
| `onSelect?` | `(model: LLMProviderModel) => void` | |
| `hideSearch?` | `boolean` | |
| `searchPlaceholder?` | `string` | |

#### `JobCard`
A worked example of a host-app entity card (the kind of domain object a Luna deployment manages). `job: JobCardData`, `actions?`, `onClick?`, `showScore?`, `showDescription?`. `JobCardData` carries `{ id, title, description?, sourceName, budget?, clientName?, clientCountry?, skills, postedAt, statusLabel, statusVariant, score?, scoreReason?, url? }` where `statusVariant: 'success' | 'idle' | 'running' | 'failed'`.

---

### Domain forms

Controlled, validated editors that emit normalized submit payloads. **They never call your API** — they hand you a clean object in `onSubmit`/`onChange` and you persist it. The full-entity forms share a common shape: `mode: 'create' | 'edit'`, `initialValues?`, `saving?`, `error?: string | null`, `submitLabel?`, `onSubmit`, `onCancel?`.

#### `AgentForm`
Create/edit an AI agent. Composes the [Instructions editor](#instructions-editor), `OperationsPicker`, `SystemToolsPicker`, and `JsonEditor`.

| Prop | Type | Notes |
| --- | --- | --- |
| `mode` | `'create' \| 'edit'` | |
| `initialValues?` | `Partial<AgentFormValues>` | |
| `providers` | `AgentFormProvider[]` | `{ id; name; is_active? }` |
| `loadModels` | `(providerId: string) => Promise<AgentFormModel[]>` | Resolver; cached per provider |
| `connectors` | `PickerConnector[]` | Feeds the operations picker |
| `systemTools` | `PickerSystemTool[]` | Empty array hides the picker |
| `contextSources` | `ContextSource[]` | Drives chip validation |
| `onSubmit` | `(values: AgentFormSubmit) => void \| Promise<void>` | |
| `onPreviewInstructions?` | `(instructions: string) => Promise<InstructionsPreviewResult>` | Adds a "Preview" button |

`AgentFormValues = { name; role; llmProviderId; model; temperature; instructions; outputSchema; operationIds; systemToolNames }`. `AgentFormSubmit` extends it with `requiredSources: string[]` (extracted live from the instructions, mirroring the backend's algorithm).

#### `ConnectorForm`
| Prop | Type | Notes |
| --- | --- | --- |
| `mode` / `initialValues?` / `saving?` / `error?` / `submitLabel?` / `onCancel?` | — | Common form props |
| `hasCredentials?` | `boolean` | Edit mode: drives the "replace credentials" UX |
| `oauth2CallbackUrl?` | `string` | Copy-pasteable hint in the OAuth2 sub-form |
| `onSubmit` | `(values: ConnectorFormSubmit) => void \| Promise<void>` | |

Auth sub-forms for `none · api_key · basic · oauth2`. Credential semantics on submit: `undefined` keeps the stored secret, `null` clears it, an object replaces it.

#### `OperationForm`
Define a REST operation; composes `ParameterListEditor`, `FixedHeadersEditor`, `FixedBodyEditor`, `RetryPolicyEditor`, and an inline `OperationTestDialog`.

| Prop | Type | Notes |
| --- | --- | --- |
| common form props | — | `mode`, `initialValues?: Partial<OperationFormValues>`, `saving?`, `error?`, `submitLabel?`, `onCancel?` |
| `onTest?` | `(draft: OperationFormSubmit, input: Record<string, unknown>) => Promise<OperationTestResult>` | Enables the Test button; re-evaluated per Run |
| `testUnavailable?` | `string \| null` | Banner in the test dialog |
| `onSubmit` | `(values: OperationFormSubmit) => void \| Promise<void>` | |

#### `LLMProviderForm`
Common form props plus `hasApiKey?: boolean` (drives the masked-key / "Change API key" UX in edit mode). `onSubmit: (values: LLMProviderFormSubmit) => …`. API-key semantics: `undefined` keeps, `''` clears, a string rotates.

#### `SchedulePicker`
Author recurring rules without cron. `value: ScheduleConfig`, `onChange: (next: ScheduleConfig) => void`. Backed by the [schedule helpers](#schedule-helpers).

#### `RunInputsDialog`
Collect a flow's declared inputs for a manual run.
| Prop | Type | Notes |
| --- | --- | --- |
| `open` / `onOpenChange` | `boolean` / `(open) => void` | |
| `inputs` | `FlowInputDef[]` | From `FlowDefinition.inputs` |
| `onConfirm` | `(values: Record<string, unknown>) => void \| Promise<void>` | Empty fields omitted so the backend applies defaults |
| `title?` / `confirmLabel?` / `busy?` | — | |

#### `PerRuleInputsEditor`
Per-schedule-rule input overrides. `rules: PerRuleInputsRow[]` (`{ label?; inputs }`), `declaredInputs: FlowInputDef[]`, `onChange: (ruleIndex: number, next: Record<string, unknown>) => void`.

#### Building blocks

| Component | Key props |
| --- | --- |
| `ParameterListEditor` | `value: ParameterDef[]`, `onChange`, `hideInSelector?` (for nested object props). Recursive. Also exports `emptyParameter`. |
| `OperationsPicker` | `connectors: PickerConnector[]`, `selectedIds: string[]`, `onChange: (ids) => void`, `defaultExpanded?`, `emptyMessage?`. (`PickerConnector = { id; name; description?; operations: PickerOperation[] }`.) |
| `SystemToolsPicker` | `tools: PickerSystemTool[]`, `selectedNames: string[]`, `onChange: (names) => void`, `emptyMessage?`. |
| `OperationTestDialog` | `open`, `onOpenChange`, `operation: { name; method; path; inputSchema }`, `onRun: (input) => Promise<OperationTestResult>`, `unavailable?`. Also exports `buildInputSkeleton`. |
| `RetryPolicyEditor` | `value: RetryPolicy \| null`, `onChange`. |
| `FixedHeadersEditor` | `value: FixedHeaderRow[]`, `onChange`, `paramNames: string[]` (for `{param}` substitution). |
| `FixedBodyEditor` | `value: string` (raw JSON), `onChange`, `paramNames: string[]`, `error?`. |
| `ParamChipPalette` | `paramNames: string[]`, `onInsert: (name) => void`, `label?`. |
| `TagInput` | `value: string[]`, `onChange`, `placeholder?`, `unique?` (default `true`), `lowercase?`, `disabled?`. |
| `JsonEditor` | Monaco-backed. `value: string`, `onChange: (value, { parsed?, error? }) => void`, `language?: 'json' \| 'jsonc'`, `height?: number \| string`, `readOnly?`, `placeholder?`. |

---

### Instructions editor

`InstructionsEditor` is a [Tiptap](https://tiptap.dev/)-based rich editor for agent prompts that interpolate live backend context. Authors type prose and drop in **`@context` chips** from a palette; each chip serializes to a backend marker:

```
${context.profile}                      → the whole `profile` context source
${context.profile.headline}             → a drilled scalar
${context.client.experience[*].title}   → an array drill-down
```

| Prop | Type | Notes |
| --- | --- | --- |
| `value` | `string` | Serialized markers + plain text; re-parsed when it changes externally |
| `onChange` | `(value: string, meta: { requiredSources: string[]; hasInvalidChip: boolean }) => void` | Fired on every edit |
| `contextSources` | `ContextSource[]` | Validates chips & powers the palette |
| `placeholder?` | `string` | |
| `hidePalette?` | `boolean` | |
| `readOnly?` | `boolean` | |
| `footer?` | `React.ReactNode` | e.g. `RequiredSourcesPreview` |
| `minHeight?` | `number` | px |
| `onPreview?` | `(instructions: string) => Promise<InstructionsPreviewResult>` | Adds a "Preview" button |

`InstructionsPreviewResult = { resolved: string; required_sources?: string[]; diagnostics?: { name; status; detail? }[] }`.

**Exported utilities** (usable standalone): `serializeInstructions(doc)` / `parseInstructions(text)` (lossless round-trip), `extractRequiredSources(text)` (deduped source names), `listSchemaPaths(schema)` / `pathExists(schema, path)` (walk a JSON Schema for autocomplete & validation, including `anyOf/oneOf/allOf` and `[*]` array drills), and `RequiredSourcesPreview`. Chips are tinted by validation state: `ok` (accent), `unknown-source` (danger), `unknown-path` (warning).

The editor depends only on the generic `ContextSource` type (`{ name; description; schema; id_implicit? }`) — it knows nothing about any specific app's domain.

---

### The Flow system

A complete visual editor and viewer for luna-core `FlowDefinition`s, built on [React Flow (`@xyflow/react`)](https://reactflow.dev/) with [dagre](https://github.com/dagrejs/dagre) auto-layout. Three entry points at increasing capability:

#### `FlowCanvas` — low-level React Flow wrapper
Extends `ReactFlowProps` (minus `nodes`/`edges`/`nodeTypes`/`edgeTypes`/`children`).

| Prop | Type | Notes |
| --- | --- | --- |
| `nodes` | `RFNode[]` | React Flow node objects |
| `edges` | `RFEdge[]` | |
| `readOnly?` | `boolean` | Disables drag/connect |
| `showMiniMap?` / `showControls?` / `showBackground?` | `boolean` | |
| `colors?` | `FlowCanvasColors` | Per-element color overrides (canvas bg, controls, minimap) |

#### `FlowVisualizer` — read-only renderer
Extends `FlowCanvasProps` (minus `nodes`/`edges`/click handlers). Give it a `FlowDefinition` and it adapts, lays out, and draws.

| Prop | Type | Notes |
| --- | --- | --- |
| `definition` | `FlowDefinition` | |
| `layoutOptions?` | `LayoutOptions` | `{ direction?: 'LR'\|'TB'\|'RL'\|'BT'; nodeWidth?; nodeHeight?; rankSep?; nodeSep? }` |
| `autoLayout?` | `boolean` | Force dagre even if `definition.layout` has positions |
| `onNodeClick?` | `(node: FlowNode) => void` | Hands back the *original* domain node |
| `onEdgeClick?` | `(edge: FlowEdge) => void` | |

#### `FlowEditor` — full editing experience
A `NodePalette` (left), the canvas (center), and a context-sensitive inspector (right), backed by a [zustand](https://zustand.docs.pmnd.rs/) store.

| Prop | Type | Notes |
| --- | --- | --- |
| `store?` | `FlowEditorStoreInstance` | Optional pre-built store; otherwise created from `definition` + `meta` |
| `definition?` | `FlowDefinition` | |
| `meta?` | `Partial<FlowEditorMeta>` | `{ name; description; isActive }` |
| `catalogs?` | `FlowEditorCatalogs` | Populates inspector dropdowns (see below) |
| `colors?` | `FlowCanvasColors` | |
| `layoutOptions?` | `LayoutOptions` | |
| `hidePalette?` / `hideInspector?` | `boolean` | |

`FlowEditorCatalogs` supplies, without fetching: `agents` (`{ id; name; model?; required_sources?; system_tool_names? }`), `connectors` (each with `operations`), `contextSources` (`{ name; description?; id_implicit?; schema? }`), `dedupCheckers` (`{ name; label; description?; required_fields }`), and `systemTools`. These drive the per-node inspectors.

**Node types** (`FlowNodeType`) and what their inspector configures:

| Node | Inspector configures |
| --- | --- |
| **Trigger** | `manual` / `schedule` / `webhook` and its config |
| **Action** | Exactly one of an operation (`op:<uuid>`) or a system tool (`sys:<name>`), plus a JSON input mapping |
| **AI Agent** | Agent selection, prompt (with a `${inputs.*}` / `${iteration.item.*}` variable inserter), history inheritance, context bindings — plus the **iteration** and **stash/dedup** configs below |
| **Condition** | Read-only view of outgoing edge conditions (`field operator value`); edit by selecting the edge |
| **Human checkpoint** | The message shown to the human approver |
| **Output** | The dotted paths to project into `state.outputs` |

**Iteration & scratchpad** — AI agent nodes can loop. The editor exposes luna-core's full iteration model: `source` (`agent_yield` — the agent drives via a synthesized `yield_iteration` tool — or `scratchpad` — the runtime walks records a prior node stashed), a typed `carry_schema`, `max_iterations`, and parallel execution (`concurrency`, `on_iteration_error`). A companion **stash** config declares the record schema written via `stash_records` and an optional **dedup** binding against a host-registered checker.

**Store, hooks & helpers** (all exported):

- **Store factory:** `createFlowEditorStore({ definition?, meta? })`, `FlowEditorStoreProvider`, and hooks `useFlowEditor(selector)`, `useFlowEditorActions()`, `useFlowEditorStoreApi()`.
- **State:** `FlowEditorState` = `{ meta, entryPoint, trigger, inputs, nodes, edges, layout, selectedNodeId, selectedEdgeKey, dirty }`.
- **Actions** (`FlowEditorActions`): `setName/Description/IsActive`, `setEntryPoint`, `setTrigger`, `setInputs`/`addInput`/`updateInput`/`removeInput`, `addNode(type, position?) → id`, `updateNode(id, patch)`, `renameNode(old, new)` (cascades to edges + layout), `removeNode`, `setNodePosition`, `setLayout`, `addEdge(from, to)` (rejects self-loops/dupes), `updateEdgeCondition(key, condition | null)`, `removeEdge`, `selectNode`/`selectEdge` (mutually exclusive), `hydrate(def, meta)`, `markClean`, `toDefinition() → FlowDefinition`.
- **Adapter:** `flowDefinitionToReactFlow(definition)`, `reactFlowToFlowDefinition(result, base)`, `applyDagreLayout(result, options?)`, plus `flowNodeTypes`, `flowEdgeTypes`, `BaseNode`, and the `edgeKey(edge, index)` helper.
- **Validation:** `validateFlowDefinition(definition) → FlowValidationError[]` (`{ message; nodeId?; edgeIndex? }`) — mirrors the backend's structural checks (dangling edges, missing entry point, action/agent constraints).
- **Sub-components:** `NodePalette` (`onAutoLayout?`), `FlowInputsEditor`, `NodeInspector` (`{ nodeId; catalogs?; storeApi }`), `EdgeInspector` (`{ edgeKey }`).

---

### Run observability

Turn a flat stream of luna-core `RunEvent`s into a readable narrative. The heart is **`groupEvents(events) → ConversationItem[]`**, a pure reducer that folds the event stream into a nested conversation tree:

- streaming **text** and **thinking** deltas (same `message_id`) collapse into one agent message bubble;
- `tool_called` + `tool_result` pair by id into one tool card (carrying operation/connector metadata when present);
- `iteration_started/completed/failed` envelopes wrap the sub-events emitted inside each loop (matched by `iteration_id`);
- everything sorts and nests under the node that produced it.

#### `RunConversation` — primary, human-readable timeline
| Prop | Type | Notes |
| --- | --- | --- |
| `events` | `RunEvent[]` | The raw stream (REST snapshot + WS frames) |
| `loading?` | `boolean` | Skeletons |
| `streaming?` | `boolean` | Appends a pulsing "live" indicator |
| `iterationSubscriber?` | `IterationSubscriber` | `{ subscribe(id); unsubscribe(id) }` — wire iteration expand/collapse to a WS subscription so parallel iteration streams aren't all flowing in at once |
| `autoScroll?` | `boolean \| (UseAutoScrollOptions & Pick<AutoScrollContainerProps, 'showJumpToBottom' \| 'jumpToBottomLabel' \| 'viewportClassName'>)` | Follow-the-stream scrolling; fills the parent's height when enabled |

#### `RunTimeline` — flat debug view
`events: RunEvent[]`, `loading?`, `autoScroll?` (same shape as above). One `RunEventItem` per event, no grouping.

#### Other run components
| Component | Props |
| --- | --- |
| `RunEventItem` | `event: RunEvent`, `isLast?: boolean` |
| `AgentMessageView` | `item: AgentMessageItem` |
| `ToolCallView` | `item: ToolCallItem` |
| `ThinkingDisclosure` | `text: string`, `live: boolean` (auto-open while streaming, then sticky) |
| `JsonDisclosure` | `label: string`, `data: unknown`, `tone?: 'danger'` |
| `FlowRunHistory` | `runs: FlowRun[]`, `loading?`, `hasMore?`, `loadingMore?`, `onLoadMore?`, `onRunClick?: (run) => void` |
| `FlowRunRow` | `run: FlowRun`, `onClick?: (run) => void` |

**Exported result types** for building your own views: `groupEvents`, `ConversationItem`, `NodeBlock`, `NodeChild`, `AgentMessageItem`, `ToolCallItem` (+ `ToolCallOperation`, `ToolCallConnector`), `OneShotItem`, `IterationBlock`.

---

### Chat subsystem

A generic, agent-agnostic conversation UI that reuses the run-inspector blocks for visual parity.

#### `ChatPanel`
Full-height container: auto-scrolling message list + composer + streaming indicator. Extends `ChatPanelLabels` (`composerPlaceholder?`, `sendLabel?`, `streamingLabel?`, `jumpToBottomLabel?`).

| Prop | Type | Notes |
| --- | --- | --- |
| `messages` | `ChatMessage[]` | |
| `onSendMessage` | `(text: string) => void \| Promise<void>` | Awaited; composer disables while pending |
| `isStreaming?` | `boolean` | Shows a "thinking…" indicator |
| `composerDisabled?` | `boolean` | Force-disable the composer |
| `header?` | `React.ReactNode` | e.g. a context summary |
| `emptyState?` | `React.ReactNode` | `null` renders nothing |
| `showToolBlocks?` | `boolean` | Render `tool_use`/`tool_result` via `ToolCallView` |

#### `ChatMessageItem`
`message: ChatMessage`, `showToolBlocks?: boolean`. User turns render as right-aligned bubbles; assistant/system turns defer to `AgentMessageView`.

#### `ChatComposer`
`onSend: (text) => void | Promise<void>`, `placeholder?`, `sendLabel?`, `disabled?`, `maxLength?` (default 4000, mirroring the API bound). Enter sends, Shift+Enter newlines.

**Types** (mirror Anthropic's content-block shape so backend payloads deserialize directly): `ChatRole`, `ChatContentBlockType`, `ChatMessage` (`{ id; role; content; createdAt; isPartial? }`), `ChatContentBlock` = `ChatTextBlock | ChatToolUseBlock | ChatToolResultBlock`, `ChatPanelLabels`.

---

### Hooks & helpers

#### `useAutoScroll`
The follow-the-stream scroll hook behind `AutoScrollContainer`.

```ts
const { scrollRef, contentRef, pinned, scrollToBottom } = useAutoScroll(options)
```

`UseAutoScrollOptions = { enabled?; threshold?; behavior?; initialPinned?; onPinnedChange? }`. Uses a `ResizeObserver` to stay glued to the bottom while content grows, and detaches the instant the user scrolls up. Returns refs for the viewport and inner content, the current `pinned` state, and an imperative `scrollToBottom()`.

#### The `cn` helper
```ts
import { cn } from 'luna-ui'
cn('px-2 py-1', condition && 'bg-accent', props.className)
```
`clsx` + `tailwind-merge`. Every component composes its classes through `cn`, so your `className` overrides always win — no `!important`.

#### Schedule helpers
Map between the UI `ScheduleRule` model and the backend cron representation, so users never type cron:

| Function | Signature | Notes |
| --- | --- | --- |
| `ruleToCron` | `(rule: ScheduleRule) => string \| null` | 5-field cron, authored in the rule's timezone |
| `cronToRule` | `(cron: string, tz: string) => ScheduleRule` | Best-effort reverse for legacy flows |
| `ruleToBackend` | `(rule: ScheduleRule) => ScheduleRuleBackend \| null` | Wraps `{ cron, tz, value }`; the `value` blob round-trips the rich rule losslessly |
| `backendToRule` | `(s: ScheduleRuleBackend) => ScheduleRule` | Unwraps it (prefers `value`, falls back to `cronToRule`) |
| `configToBackend` | `(config: ScheduleConfig) => …` | Multi-rule → backend schedules + primary cron |
| `describeRule` / `describeConfig` | `→ string` | e.g. `"Weekly on Mon, Wed, Fri at 09:00 (UTC)"` |
| `defaultRule` | `(mode: ScheduleMode) => ScheduleRule` | Sensible factory |
| `defaultTz` | `() => string` | Browser timezone, falls back to `UTC` |

---

## Recipes

End-to-end examples wiring components to a luna-core backend. They assume a small `api` helper around `fetch` (you bring your own data layer — React Query, SWR, etc.).

### Edit an agent

`AgentForm` is controlled by its callbacks. You feed it catalogs (providers, connectors, system tools, context sources), it hands you a normalized `AgentFormSubmit`.

```tsx
import { AgentForm, type AgentFormSubmit } from 'luna-ui'

function EditAgent({ agentId }: { agentId: string }) {
  const { providers, connectors, systemTools, contextSources, agent } = useAgentCatalogs(agentId)

  async function handleSubmit(values: AgentFormSubmit) {
    // values already includes requiredSources, extracted live from the instructions
    await api.put(`/agents/${agentId}`, {
      name: values.name,
      role: values.role,
      llm_provider_id: values.llmProviderId,
      model: values.model,
      temperature: values.temperature,
      instructions: values.instructions,
      output_schema: values.outputSchema,
      operation_ids: values.operationIds,
      system_tool_names: values.systemToolNames,
    })
  }

  return (
    <AgentForm
      mode="edit"
      initialValues={agent}
      providers={providers}
      connectors={connectors}
      systemTools={systemTools}
      contextSources={contextSources}
      // Called whenever the provider dropdown changes; result is cached per provider
      loadModels={(providerId) => api.get(`/llm-providers/${providerId}/models`)}
      // Optional: renders a "Preview" button that resolves ${context.*} server-side
      onPreviewInstructions={(text) =>
        api.post('/agents/preview-instructions', { instructions: text })
      }
      onSubmit={handleSubmit}
    />
  )
}
```

### Define an operation with a live test panel

Passing `onTest` lights up a Test button. The form re-reads its draft on every Run, so edits propagate without reopening the dialog.

```tsx
import { OperationForm, type OperationFormSubmit, type OperationTestResult } from 'luna-ui'

function NewOperation({ connectorId }: { connectorId: string }) {
  async function runTest(
    draft: OperationFormSubmit,
    input: Record<string, unknown>,
  ): Promise<OperationTestResult> {
    // Non-2xx still resolves (ok:false) — the dialog renders it; reject only on transport errors.
    return api.post(`/connectors/${connectorId}/operations/test`, { draft, input })
  }

  return (
    <OperationForm
      mode="create"
      onTest={runTest}
      onSubmit={(values) => api.post(`/connectors/${connectorId}/operations`, values)}
    />
  )
}
```

### Stream a live run over WebSocket

`RunConversation` consumes the **same `RunEvent` shape** from the REST snapshot and the WS stream, so you hydrate from `GET /runs/{id}/events`, then append frames from `WS /runs/{id}/stream`. The optional `iterationSubscriber` tells the server which iteration accordion is expanded so only that loop's sub-events come over the wire — essential for parallel iterations that would otherwise flood the page.

```tsx
import * as React from 'react'
import { RunConversation, type RunEvent, type IterationSubscriber } from 'luna-ui'

function LiveRun({ runId }: { runId: string }) {
  const [events, setEvents] = React.useState<RunEvent[]>([])
  const [streaming, setStreaming] = React.useState(true)
  const wsRef = React.useRef<WebSocket | null>(null)

  React.useEffect(() => {
    let ws: WebSocket
    // 1. Hydrate the backlog, then 2. attach the live stream.
    api.get(`/runs/${runId}/events`).then((backlog: RunEvent[]) => {
      setEvents(backlog)
      ws = new WebSocket(`wss://api.example.com/runs/${runId}/stream`)
      wsRef.current = ws
      ws.onmessage = (msg) => {
        const ev = JSON.parse(msg.data) as RunEvent
        // De-dupe by sequence — groupEvents sorts, but the snapshot may overlap the first frames.
        setEvents((prev) =>
          prev.some((e) => e.sequence === ev.sequence) ? prev : [...prev, ev],
        )
      }
      ws.onclose = () => setStreaming(false)
    })
    return () => ws?.close()
  }, [runId])

  // Tell the server to forward / drop one iteration's sub-events as the user expands/collapses it.
  const iterationSubscriber: IterationSubscriber = React.useMemo(
    () => ({
      subscribe: (id) => wsRef.current?.send(JSON.stringify({ op: 'subscribe_iteration', id })),
      unsubscribe: (id) => wsRef.current?.send(JSON.stringify({ op: 'unsubscribe_iteration', id })),
    }),
    [],
  )

  return (
    <div className="h-[600px]">
      <RunConversation
        events={events}
        streaming={streaming}
        iterationSubscriber={iterationSubscriber}
        autoScroll // follows the tail; detaches when the user scrolls up
      />
    </div>
  )
}
```

### Build & save a flow

`FlowEditor` can own its store, or you can create one externally and read it on save. The external-store pattern lets your toolbar's "Save" button pull the current `FlowDefinition` out.

```tsx
import {
  FlowEditor,
  createFlowEditorStore,
  validateFlowDefinition,
  Button,
} from 'luna-ui'

function FlowBuilder({ flow, catalogs }) {
  // Create the store once from the loaded definition + meta.
  const [store] = React.useState(() =>
    createFlowEditorStore({
      definition: flow.definition,
      meta: { name: flow.name, description: flow.description, isActive: flow.is_active },
    }),
  )

  async function save() {
    const definition = store.getState().toDefinition()
    const errors = validateFlowDefinition(definition) // mirrors the backend's structural checks
    if (errors.length) {
      alert(errors.map((e) => e.message).join('\n'))
      return
    }
    await api.put(`/flows/${flow.id}`, { definition })
    store.getState().markClean()
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-end p-2 border-b border-border">
        <Button onClick={save}>Save flow</Button>
      </div>
      <div className="flex-1">
        <FlowEditor store={store} catalogs={catalogs} />
      </div>
    </div>
  )
}
```

For a **read-only** render (e.g. a flow detail page), skip the editor entirely:

```tsx
import { FlowVisualizer } from 'luna-ui'

<FlowVisualizer
  definition={flow.definition}
  onNodeClick={(node) => console.log('clicked', node.id)}
/>
```

### Author a schedule (no cron)

`SchedulePicker` edits a `ScheduleConfig`; the helpers turn it into the backend's cron-based shape on save and back again on load.

```tsx
import { SchedulePicker, configToBackend, type ScheduleConfig } from 'luna-ui'

function ScheduleField({ value, onChange }: {
  value: ScheduleConfig
  onChange: (next: ScheduleConfig) => void
}) {
  return <SchedulePicker value={value} onChange={onChange} />
}

// On save — convert the UI rules into the backend trigger payload:
const { schedules, cron } = configToBackend(scheduleConfig)
await api.put(`/flows/${flowId}`, {
  definition: { ...definition, trigger: { type: 'schedule', schedules, cron } },
})
```

### A streaming chat panel

`ChatPanel` reuses the run-inspector blocks. Mark the in-flight assistant turn with `isPartial` while tokens arrive and flip `isStreaming` for the "thinking…" indicator.

```tsx
import { ChatPanel, ChatRole, ChatContentBlockType, type ChatMessage } from 'luna-ui'

function AssistantChat() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [streaming, setStreaming] = React.useState(false)

  async function send(text: string) {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: ChatRole.User,
      content: [{ type: ChatContentBlockType.Text, text }],
      createdAt: new Date().toISOString(),
    }
    setMessages((m) => [...m, userMsg])
    setStreaming(true)
    // …open your SSE/WS, append an assistant ChatMessage with isPartial:true,
    // mutate its text as deltas land, then clear isPartial + setStreaming(false).
  }

  return (
    <div className="h-[600px]">
      <ChatPanel
        messages={messages}
        onSendMessage={send}
        isStreaming={streaming}
        header={<span className="text-sm text-text-muted">Assistant</span>}
      />
    </div>
  )
}
```

---

## Domain model & types

All TypeScript types and enums are exported from the root and are a **faithful mirror of luna-core's Pydantic schemas** (see [next section](#relationship-with-luna-core)), so an API response often drops straight into a component with no adapter.

- **Agents** — `Agent`, `AgentProvider` (`kimi · anthropic · openai · ollama`).
- **Connectors & operations** — `Connector`, `Operation`, `ParameterDef`, `RetryPolicy`; enums `ConnectorAuthType`, `HttpMethod`, `ApiKeyScheme`, `ParameterType`, `ParameterIn`; form value/submit shapes; and `parametersToInputSchema()` — a client-side mirror of the backend's parameter → JSON-Schema derivation.
- **Flows** — `Flow`, `FlowRun`, `FlowDefinition`, `FlowNode`, `FlowEdge`, `FlowTrigger`, `FlowInputDef`, iteration/stash types (`IterationConfig`, `IterationCarryField`, `StashConfig`, `StashDedupConfig`); enums `FlowStatus`, `TriggerType`, `FlowNodeType`, `FlowConditionOperator`, `FlowTriggerKind`, `FlowInputType`, `IterationSource`, `IterationExecution`, `IterationCarryType`, `IterationOnError`, `IterationOnNoYield`.
- **Runs** — `RunEvent`, `RunEventType`, and typed payload accessors (`AgentTextDeltaPayload`, `ToolCalledPayload`, `IterationStartedPayload`, …).
- **LLM providers** — `LLMProvider`, `LLMProviderModel`, form shapes.
- **Schedules** — `ScheduleMode`, `ScheduleRule`, `ScheduleConfig`, `ScheduleRuleBackend`.
- **Context** — `ContextSource` (`{ name; description; schema; id_implicit? }`).

> Enums use the `as const` object + union idiom, e.g. `HttpMethod.Get === 'GET'` — tree-shakeable and usable as both value and type.

---

## Relationship with luna-core

[**luna-core**](../luna-core) is the Python backend Luna UI is built to drive: a FastAPI + LangGraph + Celery library that owns authentication, persistence, the flow engine, connectors, and the run-event stream. Luna UI is its reference frontend.

The connection is **type-level, not code-level** — there's no shared package or codegen. Instead, the TypeScript types in [`src/types`](src/types) and [`src/flow/core/types.ts`](src/flow/core/types.ts) are **hand-mirrored from luna-core's Pydantic schemas**, with source comments pointing back to the exact backend module. This lets the same JSON flow over both REST and WebSocket and be consumed by a component with **no adapter layer**. The contract points:

| Luna UI type | luna-core source | Contract |
| --- | --- | --- |
| `RunEvent` / `RunEventType` | `luna_core/models/event.py`, `schemas/event.py` | `event_type` strings and the snake_case payload shape are identical on `GET /runs/{id}/events` (REST snapshot) and `WS /runs/{id}/stream` (live frames) — so `groupEvents` consumes both interchangeably. |
| `FlowDefinition` & node/edge/trigger/input types | `schemas/flow.py` | The editor serializes to *exactly* the body `POST /flows` validates; `validateFlowDefinition` mirrors the backend's structural checks. |
| `IterationConfig`, `IterationCarryType`, `StashConfig` | `luna_core/engine/iteration.py` | Enum members and the carry/stash field model match the runtime's constants (`CARRY_PRIMITIVE_TYPES`, `ITERATION_SOURCE_*`). |
| `ParameterDef` + `parametersToInputSchema()` | connector schemas + `parameters_to_input_schema` | The client reproduces the server's parameter → JSON-Schema view so the operation test panel needs no round-trip. |
| `ContextSource.schema` | `schemas/context_source.py` | The Instructions editor validates `@context` paths against the Pydantic `.model_json_schema()` output. |
| `ScheduleRule` ⇄ `ScheduleRuleBackend` | `schemas/flow.py` `ScheduleRule` | The `{ cron, tz, value }` backend shape carries a `value` blob that round-trips the rich UI rule losslessly. |
| Credential semantics (`undefined`/`null`/object) | connector & provider routers | Form submit shapes encode keep / clear / replace to match the backend's partial-update contract. |

> **Keeping them in sync:** luna-core is the **source of truth** for every shared enum and wire shape. When the backend adds a value, mirror it here exactly — never invent UI-only members. If the two drift, the backend wins.

For the full backend surface (routes, auth, the flow engine, Celery scheduling), see [luna-core's README](../luna-core/README.md).

---

## Design principles

1. **Presentational & controlled.** Components render props and emit callbacks. They never fetch, never own server state, and never assume a router or data library.
2. **Headless theming.** No baked-in colors — eleven CSS variables theme everything; `cn` (`tailwind-merge`) guarantees your overrides win.
3. **Wire-type fidelity.** Types mirror luna-core so REST/WS JSON flows in without adapters. Where the backend derives something (parameter schemas, cron), the client provides a matching pure function.
4. **Streaming-first.** Run and chat views are built around incremental deltas, live thinking traces, and auto-scroll that yields to the user.
5. **Accessible by default.** Radix primitives, semantic HTML, ARIA labels, full keyboard support.
6. **Fully typed.** Ships its own `.d.ts` (generated by `vite-plugin-dts`); every export is typed.

---

## Building from source

```bash
npm install
npm run build      # tsc -p tsconfig.build.json && vite build → dist/
npm run typecheck  # tsc --noEmit
npm run dev        # vite build --watch (for local linking)
```

The build emits an ES module (`dist/index.js`), type declarations (`dist/index.d.ts`), and the utility stylesheet (`dist/style.css`, imported as `luna-ui/styles.css`). `react`, `react-dom`, and `react/jsx-runtime` are externalized.

**Stack:** React 18 · TypeScript 5 · Vite 5 (library mode) · Tailwind CSS 3 · Radix UI · Tiptap 2 · React Flow 12 · Monaco · zustand 5 · dagre · lucide-react.

---

## License

MIT © Luna Interfaces. See [LICENSE](LICENSE).
