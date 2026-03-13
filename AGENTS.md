## Agent Guidelines

## Research Guidelines

IMPORTANT: Do not just assume you have knowledge about specific features, if you encounter new requirements or patterns. During the research phase, when in doubt, look up the latest information using the locally cloned and available repositories. If certain patterns are already in the codebase, reuse those patterns. Use the following index to find the entry points for your research of the tech:

| Tech                   | Path                                |
| ---------------------- | ----------------------------------- |
| Svelte                 | ./references/svelte                 |
| SvelteKit              | ./references/kit                    |
| Zod                    | ./references/zod                    |
| Superforms             | ./references/sveltekit-superforms   |
| TailwindCSS            | ./references/tailwindcss            |
| shadcn-svelte          | ./references/shadcn-svelte          |
| runed                  | ./references/runed                  |
| mode-watcher           | ./references/mode-watcher           |
| inlang/paraglide       | ./references/paraglide-js           |
| capacitor              | ./references/capacitor              |
| capacitor-haptics      | ./references/capacitor-haptics      |
| capacitor core plugins | ./references/capacitor-plugins      |
| capacitor native audio | ./references/capacitor-native-audio |
| fastlane               | ./references/fastlane               |
| driver.js              | ./references/driver.js              |
| Drag'n'Drop            | ./references/dnd-kit                |
| Capacitor Updater      | ./references/capacitor-updater      |

!!!VERY VERY IMPORTANT: I have a complete reference project, that has the exact same techstack like this project. It is already in production, which proves its validity. You can find it under `./references/yahtzee`. ALWAYS do a research on not yet encountered patterns in that project

Also under `./references/capacitor-live-updates` is a full stack reference app with database, auth etc.
!!!

## Tooling Guidelines

This repository uses `pnpm`, so ALWAYS use `pnpm` instead of `npm`!!!

## Local Dev Server

Do not start the dev server yourself. If a task needs a dev server, tell the user to run it and wait for their confirmation.

## Code Style Alignment

When the user applies fixes or provides updated components, treat their edits as the source of truth for style and structure. Match their formatting and patterns going forward.

## Svelte Guidelines

ALWAYS use Svelte 5 Runes syntax!!! Look up how in the documentation when in doubt!!!

WHENEVER possible, use utilities from the `runed` library. For example `debounce` and `throttle` and `Context Management` is easier with `runed`.

Use `sveltekit-superforms` in SPA mode for ALL mutating actions. ALWAYS refactor forms into their own components, even if they are used only once to avoid inlining forms. For the forms themselves, use the shadcn-svelte form components to profit from formsnap.

| Task                                  | Do                                          | Don't                                                 |
| ------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| Get global page state                 | Use `page` from `$app/state`                | Use `page` from `$app/stores`                         |
| Get page load data                    | Use `let { data } = $props()`               | Use $page.data                                        |
| Icons Library                         | Import from `@lucide/svelte`                | Import from `lucide-svelte`                           |
| Styling pages                         | Use `tailwindcss`                           | Write vanilla CSS                                     |
| Conditional classes                   | `cn` utility function from `@repo/ui/utils` | `$derived` statements                                 |
| Non-Route Component File Names        | PascalCase                                  | snake-case, camelCase                                 |
| Specifying zod adapter for superforms | Use `zod4` and `zod4Client`                 | Use `zod` and `zodClient`                             |
| Defining zod schemas                  | Use `zod4` syntax, like `z.uuid()`          | Use deprecated `zod3`syntax, like `z.string().uuid()` |

## UI Composition Guidelines

WHENEVER it is possible, use shadcn-svelte components to compose UI!!!

## i18n

Use the provided paraglide setup to handle all i18n tasks.
ALWAYS maintain the baseLocale keys whenever new UI is added to the project, so that it doesn't need to be handled by future agents/developers and become technical debt. ALWAYS add remaining translations at the end of each Phase one additional Plan per supported Locale to keep tasks focused and context window managable. These plans can run in parallel since they only work on their respective locale json.

IMPORTANT: When translating, do not just translate the single strings in isolation, but look at the usage of the key to get the context-specific meanings.

For German use "Umlaute" properly, so "ae" -> "ä", "oe" -> "ö" and "ue" -> "ü".
For languages with accent marks, take care add them directly properly to avoid later fixes.

### Base Locale

**IMPORTANT: The base locale for this project is `de` (German), NOT `en` (English).**

This is configured in app's respective `project.inlang/settings.json`:

```json
{
	"baseLocale": "de"
}
```

### Staleness, missing generated files or functions

ALWAYS trust that if the keys are available and exist int the locale json, the required code will be generated at next build. If you really need to make sure, you can always run `pnpm paraglide:compile`. DO NOT do any unnecessary sanity checks. IGNORE LSP errors regarding i18n issues, these ALWAYS come from staleness.

### Source of Truth

**`de.json` is the source of truth for all translations.**

When working with i18n files:

- ✅ **DO**: Use `de.json` as the reference for all keys
- ✅ **DO**: Add new keys to `de.json` first, then translate to other languages
- ✅ **DO**: Synchronize all other language files (`en.json`, `es.json`, `fr.json`, `it.json`) with `de.json`
- ❌ **DON'T**: Remove keys from `de.json` just because they're missing in other languages
- ❌ **DON'T**: Treat `en.json` as the base locale

### Synchronization Rules

All language files must have:

1. **Same keys** as `de.json` (no missing keys, no extra keys)
2. **Same parameter names** (e.g., if `de.json` uses `{current}/{total}`, all languages must use the same)
3. **Semantically equivalent translations** (meaning should match across languages)

### Verification

To verify synchronization:

```bash
cd apps/$APP_NAME/messages

# Check key counts
for file in *.json; do
  echo -n "$file: " && jq 'keys | length' "$file"
done

# Check for missing keys
for lang in en es fr it; do
  echo "Checking $lang vs de:"
  jq -r 'keys[]' de.json | sort > /tmp/de_keys.txt
  jq -r 'keys[]' $lang.json | sort > /tmp/${lang}_keys.txt
  diff /tmp/de_keys.txt /tmp/${lang}_keys.txt
done
```

### Common Issues

#### Parameter Mismatches

If `de.json` has:

```json
"roguelike_boss_number": "Boss {current}/{total}"
```

All other languages must use `{current}` and `{total}`, not `{number}` or any other parameter name.

#### Missing Keys

If a key exists in `de.json` but is missing in other languages, **add it** to the other languages with proper translations.

#### Extra Keys

If a key exists in a non-base language but not in `de.json`, it should be **removed** from that language file (unless it needs to be added to `de.json` first).

## Store Distribution

IMPORTANT: DO NOT USE emojis for metadata texts. These are not supported by the stores. An example for an emoji is 🎲.