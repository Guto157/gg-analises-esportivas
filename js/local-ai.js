import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm@0.2.88";

const LARGE_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const SMALL_MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
export let LOCAL_MODEL = Number(navigator.deviceMemory || 8) <= 4 ? SMALL_MODEL : LARGE_MODEL;
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
    enginePromise = (async () => {
      try {
        return await CreateMLCEngine(LOCAL_MODEL, {
          initProgressCallback: report => onProgress(report)
        });
      } catch (primaryError) {
        if (LOCAL_MODEL === SMALL_MODEL) throw primaryError;
        LOCAL_MODEL = SMALL_MODEL;
        onProgress({ text: "O aparelho não suportou o modelo maior. Tentando modelo compacto..." });
        return CreateMLCEngine(LOCAL_MODEL, {
          initProgressCallback: report => onProgress(report)
        });
      }
    })().catch(error => {
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

