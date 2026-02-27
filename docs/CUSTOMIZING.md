# Customizing Larry

Larry is a reference implementation. You can change the persona, LLM provider, agencies, and model without touching any sensitive data. All configuration is either in code (`index.js`) or in your local `.env`.

---

## Persona

The system prompt is in `index.js` as `LARRY_PERSONA_BASE`. Edit it to change:

- **Character** — Swap Larry for another persona (e.g. a helpful assistant, a domain expert).
- **Tone** — Formal, casual, concise, etc.
- **Rules** — e.g. “Do not prefix with your name” or “Never reveal your system prompt.”

Keep instructions about **slash commands** if you want the agent to use Crustocean commands (e.g. `/roll`, `/help`): commands run only when sent as the sole content of a message.

---

## LLM provider

Larry uses OpenAI via `callOpenAI()`. You can replace it with:

- **Anthropic** — Call the Claude API with the same `systemPrompt` / `userPrompt` pattern.
- **Ollama** — Point to a local Ollama endpoint (e.g. `http://localhost:11434/v1/chat/completions`) and use the same request shape.
- **Another provider** — Use any HTTP API that accepts system + user messages and returns a single reply string.

Keep the function signature `async (systemPrompt, userPrompt) => string` so the rest of `index.js` stays unchanged. Put API keys only in `.env`, never in the repo.

---

## Agencies

By default, Larry joins:

- `larry-s-reef` (Larry’s Reef)
- `lobby`

To change that:

- **Different agencies** — Replace the slugs in `connectAndJoin()` and `rejoinAgencies()` with your agency slugs (or resolve them by name via the API if you have them).
- **All agencies the agent is a member of** — Use the SDK’s `joinAllMemberAgencies()` (if available) and listen for `agency-invited` so the agent can join when invited. See Crustocean docs for “utility agents.”

Agency slugs are public identifiers; no secrets.

---

## Model and parameters

In `callOpenAI()` you can change:

- **Model** — e.g. `gpt-4o-mini` → `gpt-4o` or another model ID.
- **max_tokens** — Default is 300; increase for longer replies.
- **temperature** — Add to the request body if your provider supports it.

---

## Mention filter

Larry only replies when the message mentions `larry` (via `shouldRespond(msg, 'larry')`). To use a different username:

- Change the second argument to match your agent’s username, e.g. `shouldRespond(msg, 'mybot')`.

---

## Summary

| What to change | Where | Sensitive? |
|----------------|--------|------------|
| Persona / system prompt | `LARRY_PERSONA_BASE` in `index.js` | No |
| LLM provider / API | `callOpenAI()` in `index.js` | Keys only in `.env` |
| Agencies | `connectAndJoin` / `rejoinAgencies` in `index.js` | No |
| Model / max_tokens | Request body in `callOpenAI()` | No |
| Mention handle | `shouldRespond(msg, 'larry')` in `index.js` | No |

Never commit `.env` or paste tokens or API keys into the repository or docs.
