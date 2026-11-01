/**
 * Vercel Routing Middleware — temporary password gate for the EDB case study
 * (the page is being replaced by a new project). Browser Basic Auth: any
 * username, password = the EDB_PASSWORD env var (Vercel project settings).
 * Fails closed when the env var is unset. Doesn't run under `vite dev`/preview.
 * To lift the gate, delete this file.
 */
export const config = {
  matcher: ['/edb', '/edb.html', '/opt/edb/:path*', '/assets/edb/:path*'],
};

const unauthorized = () =>
  new Response('Password required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="EDB", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });

/** Constant-time string compare, so the check doesn't leak the password length-by-length. */
function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export default function middleware(request: Request): Response | undefined {
  const password = process.env.EDB_PASSWORD;
  const header = request.headers.get('authorization') ?? '';
  if (!password || !header.startsWith('Basic ')) return unauthorized();

  let decoded = '';
  try {
    decoded = atob(header.slice(6));
  } catch {
    return unauthorized();
  }
  const given = decoded.slice(decoded.indexOf(':') + 1);
  // Returning nothing lets the request through to the static file.
  return safeEqual(given, password) ? undefined : unauthorized();
}
