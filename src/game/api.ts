export interface StoryEvent {
  eventName: string;
  narrative: string;
}

export interface ValidationResult {
  positive: boolean;
  outcomeText: string;
}

async function errorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  return typeof body.error === "string" ? body.error : fallback;
}

export async function loadEvents(): Promise<StoryEvent[]> {
  const response = await fetch("/api/events");
  if (!response.ok) throw new Error(await errorMessage(response, `Failed to load events (${response.status}).`));
  return response.json();
}

export async function validateAnswer(eventName: string, word: string): Promise<ValidationResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch("/api/validate", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: eventName, word })
    });
    if (!response.ok) throw new Error(await errorMessage(response, `Validation failed (${response.status}).`));
    const result = await response.json();
    return { positive: result.positive === true, outcomeText: result.outcomeText || "" };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("Validation timed out.");
    if (error instanceof TypeError) throw new Error("The validation server could not be reached.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function editImage(eventName: string, word: string): Promise<Blob> {
  const response = await fetch("/api/edit-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: eventName, word })
  });
  if (!response.ok) throw new Error(await errorMessage(response, `Image edit failed (${response.status}).`));
  return response.blob();
}

export function eventImageUrl(eventName: string, role: string) {
  return `/api/event-image?event=${encodeURIComponent(eventName)}&role=${encodeURIComponent(role)}`;
}
