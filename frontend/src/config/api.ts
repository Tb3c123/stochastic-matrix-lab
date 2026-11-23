const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_BASE_URL: string =
  envUrl ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8088`
    : "http://localhost:8088");
