const NON_CHAT = /whisper|tts|guard|embed|orpheus|image|moderation|rerank/i;

export function isChatModelId(id: string): boolean {
  return !NON_CHAT.test(id);
}

async function getJson(
  url: string,
  fetchImpl: typeof fetch,
  headers?: Record<string, string>,
): Promise<any> {
  const res = await fetchImpl(url, headers ? { headers } : undefined);
  if (!res.ok) throw new Error(`models ${res.status}`);
  return res.json();
}

export async function listGeminiModels(
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const json = await getJson(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=200`,
    fetchImpl,
  );
  return (json.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((m: any) => String(m.name).replace(/^models\//, ""));
}

export async function listGroqModels(
  key: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  const json = await getJson("https://api.groq.com/openai/v1/models", fetchImpl, {
    Authorization: `Bearer ${key}`,
  });
  return (json.data ?? []).map((m: any) => String(m.id)).filter(isChatModelId);
}

export async function listOpenRouterModels(fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const json = await getJson("https://openrouter.ai/api/v1/models", fetchImpl);
  return (json.data ?? []).map((m: any) => String(m.id));
}
