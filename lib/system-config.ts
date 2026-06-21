import prisma from "@/lib/prisma";

const cache: Record<string, { value: string; ts: number }> = {};
const TTL = 60_000; // 60s cache to avoid hammering DB on every request

export async function getSystemConfig(key: string): Promise<string> {
  const now = Date.now();
  if (cache[key] && now - cache[key].ts < TTL) return cache[key].value;

  const row = await prisma.systemConfig.findUnique({ where: { key } });
  const value = row?.value ?? process.env[key] ?? "";

  cache[key] = { value, ts: now };
  return value;
}

export function invalidateConfigCache(key?: string) {
  if (key) delete cache[key];
  else Object.keys(cache).forEach((k) => delete cache[k]);
}
