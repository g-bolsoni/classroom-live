import "dotenv/config";

function required(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: required("CORS_ORIGIN", "http://localhost:5173"),
};
