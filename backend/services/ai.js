'use strict';

const AI_PROVIDER = (process.env.AI_PROVIDER || 'mock').toLowerCase();
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || '';

// Rate limiting: 20 calls/hour per user
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const userCallHistory = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  let timestamps = userCallHistory.get(userId) || [];

  // Prune calls older than 1 hour
  timestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (timestamps.length >= RATE_LIMIT_MAX) {
    userCallHistory.set(userId, timestamps);
    return {
      allowed: false,
      error: 'AI rate limit exceeded (maximum 20 calls per hour)',
    };
  }

  timestamps.push(now);
  userCallHistory.set(userId, timestamps);
  return { allowed: true };
}

function _clearRateLimits() {
  userCallHistory.clear();
}

function logAction(action, userId) {
  // Safe logging: never log keys or note text
  console.log(`[AI] action=${action} provider=${AI_PROVIDER} user=${userId}`);
}

// -------------------------------------------------------------
// Provider implementations
// -------------------------------------------------------------

async function callProvider(prompt, systemInstruction = '', options = {}) {
  const timeoutMs = options.timeoutMs || 20000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (AI_PROVIDER === 'mock') {
      return executeMock(prompt, systemInstruction, options);
    }

    if (AI_PROVIDER === 'gemini') {
      const model = AI_MODEL || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${AI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: (systemInstruction ? systemInstruction + '\n\n' : '') + prompt }] }],
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Gemini API error (${res.status})`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (AI_PROVIDER === 'openai') {
      const model = AI_MODEL || 'gpt-4o-mini';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `OpenAI API error (${res.status})`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '';
    }

    if (AI_PROVIDER === 'anthropic') {
      const model = AI_MODEL || 'claude-3-haiku-20240307';
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': AI_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          ...(systemInstruction ? { system: systemInstruction } : {}),
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Anthropic API error (${res.status})`);
      }
      const data = await res.json();
      return data.content?.[0]?.text || '';
    }

    throw new Error(`Unsupported AI provider: ${AI_PROVIDER}`);
  } finally {
    clearTimeout(timer);
  }
}

function executeMock(prompt, systemInstruction, options) {
  const type = options.type;

  if (type === 'summarize') {
    const title = options.title || 'Note';
    return `Summary of "${title}": This note outlines key details, structured action items, and context.`;
  }

  if (type === 'suggest-tags') {
    return JSON.stringify(['notes', 'productivity', 'workspace', 'ideas']);
  }

  if (type === 'improve') {
    const action = options.action || 'proofread';
    const text = options.text || '';
    if (action === 'shorten') {
      return text.length > 50 ? text.slice(0, 50) + '...' : text;
    }
    if (action === 'expand') {
      return text + '\n\nAdditional detailed insights and thorough explanations have been appended.';
    }
    return `[Improved via ${action}]: ` + text;
  }

  if (type === 'ask') {
    const question = options.question || '';
    return `Based on the provided note, here is the answer to "${question}": The content confirms all key requirements are addressed.`;
  }

  return 'Mock AI response completed.';
}

// -------------------------------------------------------------
// Core Service API
// -------------------------------------------------------------

async function summarizeNote(userId, title, body) {
  const limit = checkRateLimit(userId);
  if (!limit.allowed) throw { status: 429, message: limit.error };

  logAction('summarize', userId);
  const prompt = `Please provide a concise summary of this note:\nTitle: ${title}\nBody: ${body}`;
  const summary = await callProvider(prompt, 'You are an AI assistant that summarizes notes accurately.', {
    type: 'summarize',
    title,
    body,
  });

  return summary.trim();
}

async function suggestTags(userId, title, body) {
  const limit = checkRateLimit(userId);
  if (!limit.allowed) throw { status: 429, message: limit.error };

  logAction('suggest-tags', userId);
  const prompt = `Suggest 3-5 lowercase single-word tags for the following note. Return ONLY a JSON array of strings, e.g. ["work", "ideas"]:\nTitle: ${title}\nBody: ${body}`;
  const response = await callProvider(prompt, 'You are an assistant that suggests concise, relevant tags.', {
    type: 'suggest-tags',
    title,
    body,
  });

  try {
    const jsonMatch = response.match(/\[.*?\]/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
      }
    }
  } catch (e) {
    // fallback
  }

  return ['notes', 'general'];
}

async function improveText(userId, text, action = 'proofread') {
  const limit = checkRateLimit(userId);
  if (!limit.allowed) throw { status: 429, message: limit.error };

  logAction(`improve:${action}`, userId);
  const prompt = `Please ${action} the following text:\n\n${text}`;
  const result = await callProvider(prompt, 'You are an expert editor improving user notes.', {
    type: 'improve',
    action,
    text,
  });

  return result.trim();
}

async function askNote(userId, question, context) {
  const limit = checkRateLimit(userId);
  if (!limit.allowed) throw { status: 429, message: limit.error };

  logAction('ask', userId);
  const prompt = `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer based on the context:`;
  const answer = await callProvider(prompt, 'You are an assistant that answers questions accurately using the note content.', {
    type: 'ask',
    question,
    context,
  });

  return answer.trim();
}

module.exports = {
  summarizeNote,
  suggestTags,
  improveText,
  askNote,
  checkRateLimit,
  _clearRateLimits,
};
