// Re-export logic from file-processing to keep it clean if needed
// or implementing the wrapper if we need specific tokenization logic
import GPTTokenizer from 'gpt-tokenizer';

export const countTokens = (text: string): number => {
    try {
        const { encode } = GPTTokenizer;
        return encode(text).length;
    } catch (error) {
        console.error("Failed to count tokens", error);
        return 0;
    }
}
