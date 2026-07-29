/**
 * llm.js — OPTIONAL. The app is fully functional without any of this.
 *
 * If the user pastes an OpenAI-compatible key it is kept in memory only for
 * this device only and used for two things: wittier captions, and a
 * high-fidelity re-ink of the *exported* strip (never the live loop).
 */

const STYLE_LOCK =
  "pen and ink comic panel, black and white, cross-hatching, hand-drawn border, single panel, subject: {class_label}, caption: '{caption}', no color, no photorealism";

export function styleLockPrompt(label, caption) {
  return STYLE_LOCK.replace('{class_label}', label).replace('{caption}', caption);
}

export async function llmCaption({ apiKey, baseUrl = 'https://api.openai.com/v1', model = 'gpt-4o-mini', label, confidence, history = [] }) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      max_tokens: 60,
      messages: [
        {
          role: 'system',
          content:
            'You write captions for a deadpan pen-and-ink comic strip narrated by an ink-stained artist in a beret. Reply with ONE caption under 12 words. No quotes, no emoji, no explanation.',
        },
        {
          role: 'user',
          content: `Detected class: "${label}" at ${Math.round(confidence * 100)}% confidence. Previous panels: ${history.slice(-5).join(' → ') || 'none'}. Write the caption.`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`caption request failed (${res.status})`);
  const json = await res.json();
  return (json.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '');
}

export async function llmPanelImage({ apiKey, baseUrl = 'https://api.openai.com/v1', model = 'gpt-image-1', label, caption, size = '1024x1024' }) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt: styleLockPrompt(label, caption), size, n: 1 }),
  });
  if (!res.ok) throw new Error(`image request failed (${res.status})`);
  const json = await res.json();
  const item = json.data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item?.url) return item.url;
  throw new Error('no image returned');
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
