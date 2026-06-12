import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const JWT_EXPIRY = "7d";

/**
 * 비밀번호를 해시합니다
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 비밀번호를 검증합니다
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * JWT 토큰을 생성합니다
 */
export function generateToken(
  userId: string,
  nickname: string
): string {
  return jwt.sign(
    { userId, nickname },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * JWT 토큰을 검증합니다
 */
export function verifyToken(token: string): {
  userId: string;
  nickname: string;
} | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      nickname: string;
    };
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Authorization 헤더에서 토큰을 추출합니다
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}
