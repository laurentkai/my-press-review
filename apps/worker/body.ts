export async function limitedBody(
  request: Request,
  maximum: number,
): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  let length = 0;
  const decoder = new TextDecoder();
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return text + decoder.decode();
      length += value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new RangeError("Body too large");
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
