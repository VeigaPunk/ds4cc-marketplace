import { FAIL_REQ_ATTEMPT_COUNT, FAIL_REQ_ATTEMPT_DELAY_MS } from "./settings";

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

export async function attempt<T>(
  callback: () => Promise<T>,
  onFail?: (message: string) => void,
  onError?: (message: string) => void,
  onComplete?: () => void
): Promise<T | undefined> {
  for (let index = 0; index < FAIL_REQ_ATTEMPT_COUNT; index++) {
    try {
      const result = await callback();

      if (onComplete) {
        onComplete();
      }

      return result;
    } catch (error: unknown) {
      if (onFail) {
        onFail(`Request failed, trying again ${index + 1}/${FAIL_REQ_ATTEMPT_COUNT}`);
      }
      await delay(FAIL_REQ_ATTEMPT_DELAY_MS);
      if (index + 1 === FAIL_REQ_ATTEMPT_COUNT && onError) {
          onError((error as Error)?.message);
        }
    }
  }
  return undefined;
}

export function clearText(text: string): string {
  return text
    .split("\n")[0]
    .replaceAll(/<script[^>]*>[\s\S]*?<\/script>/g, "")
    .replaceAll(/<[^>]+>/g, "")
    .trim();
}
