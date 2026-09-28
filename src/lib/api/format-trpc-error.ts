interface ErrorLike {
  message?: unknown;
  data?: {
    zodError?: unknown;
  } | null;
}

function collectTreeMessages(node: unknown, out: string[]): void {
  if (!node || typeof node !== "object") return;
  const record = node as Record<string, unknown>;
  if (Array.isArray(record.errors)) {
    for (const issue of record.errors) {
      if (typeof issue === "string" && issue.trim() !== "") {
        out.push(issue);
      } else if (issue && typeof issue === "object") {
        const message = (issue as Record<string, unknown>).message;
        if (typeof message === "string" && message.trim() !== "") {
          out.push(message);
        }
      }
    }
  }
  for (const [key, value] of Object.entries(record)) {
    if (key === "errors") continue;
    collectTreeMessages(value, out);
  }
}

function collectIssuesJsonMessages(message: string): string[] {
  try {
    const parsed = JSON.parse(message) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((issue) =>
        issue && typeof issue === "object"
          ? (issue as Record<string, unknown>).message
          : undefined,
      )
      .filter((m): m is string => typeof m === "string" && m.trim() !== "");
  } catch {
    return [];
  }
}

export function formatTrpcErrorMessage(
  error: unknown,
  fallback = "Erro desconhecido.",
): string {
  if (error && typeof error === "object") {
    const data = (error as ErrorLike).data;
    if (data && typeof data === "object" && "zodError" in data) {
      const messages: string[] = [];
      collectTreeMessages(data.zodError, messages);
      if (messages.length > 0) {
        return messages.join("; ");
      }
    }
  }

  const rawMessage =
    error instanceof Error
      ? error.message
      : error &&
          typeof error === "object" &&
          typeof (error as ErrorLike).message === "string"
        ? ((error as ErrorLike).message as string)
        : typeof error === "string"
          ? error
          : "";

  if (rawMessage.trim() === "") {
    return fallback;
  }

  const issueMessages = collectIssuesJsonMessages(rawMessage);
  if (issueMessages.length > 0) {
    return issueMessages.join("; ");
  }

  return rawMessage;
}
