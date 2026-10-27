import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env, isProduction } from "./config.js";

export type AdminRequest = Request & { adminId?: string };

export function signAdminToken(adminId: string): string {
  return jwt.sign({ sub: adminId, purpose: "portfolio-admin" }, env.JWT_SECRET, {
    expiresIn: "2h",
    issuer: "portfolio-api",
    audience: "portfolio-admin"
  });
}

export function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[env.COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Please log in." });
    return;
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: "portfolio-api",
      audience: "portfolio-admin"
    }) as jwt.JwtPayload;
    if (payload.purpose !== "portfolio-admin" || typeof payload.sub !== "string") {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid session." });
      return;
    }
    req.adminId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "UNAUTHORIZED", message: "Session expired. Please log in again." });
  }
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 2 * 60 * 60 * 1000
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/"
  });
}
