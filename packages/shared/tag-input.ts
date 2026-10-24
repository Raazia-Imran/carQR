const tokenPattern = /^[A-Za-z0-9_-]{22,100}$/;
const instruction =
  "Enter the tag code or a complete /q/ sticker URL from this website.";

// This only normalizes form input. Authorization and the sealed secret stay server-side.
export function normalizeTagInput(raw: string, origin: string): string {
  const value = raw.trim();
  if (tokenPattern.test(value)) return value;
  try {
    const url = new URL(value);
    const match = /^\/q\/([A-Za-z0-9_-]{22,100})\/?$/.exec(url.pathname);
    if (
      ["http:", "https:"].includes(url.protocol) &&
      url.origin === new URL(origin).origin &&
      !url.username &&
      !url.password &&
      match
    )
      return match[1];
  } catch {
    // Never echo pasted credentials or URLs into the error message.
  }
  throw new Error(instruction);
}
