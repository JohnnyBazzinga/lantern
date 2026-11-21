# Lantern

**When the hospital's systems go dark, the ward keeps writing. Lantern turns what they wrote into records you can trust.**

During an IT outage, wards record care on paper and improvised spreadsheets that circulate by email. When the systems come back, someone (usually a clinical secretary) has to re-enter everything, from several conflicting versions, with no method and no safety net. Lantern is a web app that does that reconciliation **on the device**: it maps whatever columns the ward invented, links every act to its source cell, and helps the reviewer decide row by row what goes back into the electronic record.

Built for Google's **#BuildHybridAI 2026** hackathon with **Firebase AI Logic hybrid inference** (Gemini Nano in Chrome + Gemini in the cloud).

> Status: work in progress (day 1: the on-device feasibility "Lab"). Synthetic data only. Lantern is a documentation aid, not a medical device: it makes no diagnosis, dosing or triage decisions and never writes into any EHR.

## How Lantern uses hybrid inference

| Route | Firebase AI Logic mode | Used for |
|---|---|---|
| Imported files (may contain patient data) | `ONLY_ON_DEVICE`, behind Lantern's own availability guard | column mapping, field extraction, first match judgment |
| Bundled synthetic drill | `PREFER_ON_DEVICE` | same tasks; machines without Gemini Nano fall back to the cloud automatically, and the ledger labels it |
| Second opinion on disputed matches | `ONLY_IN_CLOUD` | bundled synthetic data only, never user text |

Every call is recorded in a local provenance ledger: where it ran (`inferenceSource`), which model and prompt version, latency, and how many requests reached a Gemini endpoint.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your Firebase web config + reCAPTCHA Enterprise site key
npm run dev                  # http://localhost:5173  (#/lab for the feasibility tests)
npm test
```

On-device inference needs desktop Chrome with Gemini Nano (see [Chrome's hardware requirements](https://developer.chrome.com/docs/ai/get-started)). Other browsers still run the synthetic drill through the cloud fallback.

## License

[Apache-2.0](LICENSE)
