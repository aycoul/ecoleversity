/**
 * OpenAI text-embedding-3-small wrapper. 1536 dims, ~€0.02 per million
 * tokens — cheap enough to embed every chunk of every recording at
 * write time without thinking about it.
 *
 * Batches up to 96 inputs per call to reduce HTTP overhead; OpenAI
 * accepts batches but rejects individual items >8192 tokens, so we
 * trim aggressively on the caller side (chunks should be ~500 chars).
 */

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const MODEL = "text-embedding-3-small";
const BATCH_SIZE = 96;

export async function embedBatch(inputs: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  if (inputs.length === 0) return [];

  const out: number[][] = [];
  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);
    const res = await fetch(OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, input: batch }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`OpenAI embeddings ${res.status}: ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    for (const item of data.data) out.push(item.embedding);
  }
  return out;
}

export async function embedQuery(input: string): Promise<number[]> {
  const [first] = await embedBatch([input]);
  if (!first) throw new Error("embedQuery returned empty");
  return first;
}
