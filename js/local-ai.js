import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm@0.2.88";

const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
let enginePromise = null;

export async function loadLocalAI(onProgress = () => {}) {
  if (!navigator.gpu) {
    throw new Error("Este navegador não oferece WebGPU. Abra o projeto no Chrome atualizado em um aparelho compatível.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("A GPU do aparelho não disponibilizou WebGPU para executar a IA local.");
  }

  if (!enginePromise) {
    enginePromise = CreateMLCEngine(MODEL_ID, {
      initProgressCallback: report => onProgress(report)
    }).catch(error => {
      enginePromise = null;
      throw error;
    });
  }

  return enginePromise;
}

export async function runLocalAgent(engine, system, prompt) {
  const result = await engine.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ],
    temperature: 0.15,
    max_tokens: 650
  });

  const text = result?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("A IA local não retornou um relatório.");
  return text;
}

export const LOCAL_MODEL = MODEL_ID;
