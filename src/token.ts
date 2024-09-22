import GPT3Tokenizer from "gpt3-tokenizer";

/**
 * 计算文本的token数量
 * @param text - 要计算的文本
 * @returns token数量
 */
export async function countTokens(text: string): Promise<number> {
  const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
  const encoded = tokenizer.encode(text);
  return encoded.bpe.length;
}
