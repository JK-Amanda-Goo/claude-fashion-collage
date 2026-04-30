import { Client } from "langsmith";

let _client: Client | null = null;

export function getLangsmith(): Client {
  if (!_client) {
    _client = new Client({
      apiKey: process.env.LANGSMITH_API_KEY!,
    });
  }
  return _client;
}

export const LANGSMITH_PROJECT = process.env.LANGSMITH_PROJECT ?? "claude-fashion-collage";
