import crypto from 'node:crypto';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

export interface SessionClaims {
  uid: string;
  role: 'reader' | 'author';
  iat: number;
  exp: number;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = crypto.scryptSync(password, salt, 64);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf-8').toString('base64url');
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

export function signSessionToken(uid: string, role: 'reader' | 'author'): string {
  const now = Date.now();
  const payload: SessionClaims = {
    uid,
    role,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const body = toBase64Url(JSON.stringify(payload));
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionClaims | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(body)
      .digest('base64url');
    const sigBuf = Buffer.from(sig, 'utf-8');
    const expectedBuf = Buffer.from(expectedSig, 'utf-8');
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const claims = JSON.parse(fromBase64Url(body)) as Partial<SessionClaims>;
    if (
      typeof claims.uid !== 'string' ||
      (claims.role !== 'reader' && claims.role !== 'author') ||
      typeof claims.exp !== 'number' ||
      claims.exp <= Date.now()
    ) {
      return null;
    }

    return {
      uid: claims.uid,
      role: claims.role,
      iat: Number(claims.iat ?? 0),
      exp: claims.exp,
    };
  } catch {
    return null;
  }
}
