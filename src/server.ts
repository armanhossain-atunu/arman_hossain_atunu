import express, { type NextFunction, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { ZodError, z, type ZodType } from "zod";
import { env, isProduction } from "./config.js";
import { prisma } from "./db.js";
import { clearAuthCookie, requireAdmin, setAuthCookie, signAdminToken, type AdminRequest } from "./security.js";
import {
  loginSchema, profileSchema, projectSchema, skillSchema, experienceSchema,
  educationSchema, contactSchema, messageReadSchema
} from "./validation.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", isProduction ? 1 : false);
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(cookieParser());

// Better Auth is not used here, so JSON parsing is safe globally.
app.use(express.json({ limit: "100kb" }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "RATE_LIMITED", message: "Too many login attempts. Try again later." }
});
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "RATE_LIMITED", message: "Too many messages. Please try again later." }
});

function validate<T>(schema: ZodType<T>, source: "body" | "params" = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        issues: result.error.issues.map(issue => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
      return;
    }
    if (source === "body") req.body = result.data;
    next();
  };
}

const idSchema = z.object({ id: z.string().min(1).max(100) });
const idParams = (req: Request, res: Response, next: NextFunction) => {
  const result = idSchema.safeParse(req.params);
  if (!result.success) {
    res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid resource ID." });
    return;
  }
  next();
};

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "portfolio-api" }));

// Authentication
app.post("/api/auth/login", loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const admin = await prisma.admin.findUnique({ where: { email } });
    const valid = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
    if (!admin || !valid) {
      res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Email or password is incorrect." });
      return;
    }
    setAuthCookie(res, signAdminToken(admin.id));
    res.json({ admin: { id: admin.id, email: admin.email } });
  } catch (error) { next(error); }
});

app.get("/api/auth/me", requireAdmin, async (req: AdminRequest, res, next) => {
  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.adminId }, select: { id: true, email: true } });
    if (!admin) {
      clearAuthCookie(res);
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }
    res.json({ admin });
  } catch (error) { next(error); }
});

app.post("/api/auth/logout", requireAdmin, (_req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

// Public profile; admin can update it.
app.get("/api/profile", async (_req, res, next) => {
  try { res.json({ profile: await prisma.profile.findUnique({ where: { id: "main" } }) }); }
  catch (error) { next(error); }
});
app.put("/api/profile", requireAdmin, validate(profileSchema), async (req, res, next) => {
  try {
    const profile = await prisma.profile.upsert({
      where: { id: "main" },
      create: { id: "main", ...req.body },
      update: req.body
    });
    res.json({ profile });
  } catch (error) { next(error); }
});

// Projects
app.get("/api/projects", async (_req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
    });
    res.json({ projects });
  } catch (error) { next(error); }
});
app.get("/api/admin/projects", requireAdmin, async (_req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
    });
    res.json({ projects });
  } catch (error) { next(error); }
});
app.post("/api/projects", requireAdmin, validate(projectSchema), async (req, res, next) => {
  try { res.status(201).json({ project: await prisma.project.create({ data: req.body }) }); }
  catch (error) { next(error); }
});
app.put("/api/projects/:id", requireAdmin, idParams, validate(projectSchema), async (req, res, next) => {
  try { res.json({ project: await prisma.project.update({ where: { id: req.params.id }, data: req.body }) }); }
  catch (error) { next(error); }
});
app.delete("/api/projects/:id", requireAdmin, idParams, async (req, res, next) => {
  try { await prisma.project.delete({ where: { id: req.params.id } }); res.status(204).send(); }
  catch (error) { next(error); }
});

// Skills
app.get("/api/skills", async (_req, res, next) => {
  try { res.json({ skills: await prisma.skill.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }) }); }
  catch (error) { next(error); }
});
app.post("/api/skills", requireAdmin, validate(skillSchema), async (req, res, next) => {
  try { res.status(201).json({ skill: await prisma.skill.create({ data: req.body }) }); }
  catch (error) { next(error); }
});
app.put("/api/skills/:id", requireAdmin, idParams, validate(skillSchema), async (req, res, next) => {
  try { res.json({ skill: await prisma.skill.update({ where: { id: req.params.id }, data: req.body }) }); }
  catch (error) { next(error); }
});
app.delete("/api/skills/:id", requireAdmin, idParams, async (req, res, next) => {
  try { await prisma.skill.delete({ where: { id: req.params.id } }); res.status(204).send(); }
  catch (error) { next(error); }
});

// Experience
app.get("/api/experience", async (_req, res, next) => {
  try { res.json({ experience: await prisma.experience.findMany({ orderBy: [{ sortOrder: "asc" }, { startDate: "desc" }] }) }); }
  catch (error) { next(error); }
});
app.post("/api/experience", requireAdmin, validate(experienceSchema), async (req, res, next) => {
  try { res.status(201).json({ experience: await prisma.experience.create({ data: req.body }) }); }
  catch (error) { next(error); }
});
app.put("/api/experience/:id", requireAdmin, idParams, validate(experienceSchema), async (req, res, next) => {
  try { res.json({ experience: await prisma.experience.update({ where: { id: req.params.id }, data: req.body }) }); }
  catch (error) { next(error); }
});
app.delete("/api/experience/:id", requireAdmin, idParams, async (req, res, next) => {
  try { await prisma.experience.delete({ where: { id: req.params.id } }); res.status(204).send(); }
  catch (error) { next(error); }
});

// Education
app.get("/api/education", async (_req, res, next) => {
  try { res.json({ education: await prisma.education.findMany({ orderBy: [{ sortOrder: "asc" }, { endDate: "desc" }] }) }); }
  catch (error) { next(error); }
});
app.post("/api/education", requireAdmin, validate(educationSchema), async (req, res, next) => {
  try { res.status(201).json({ education: await prisma.education.create({ data: req.body }) }); }
  catch (error) { next(error); }
});
app.put("/api/education/:id", requireAdmin, idParams, validate(educationSchema), async (req, res, next) => {
  try { res.json({ education: await prisma.education.update({ where: { id: req.params.id }, data: req.body }) }); }
  catch (error) { next(error); }
});
app.delete("/api/education/:id", requireAdmin, idParams, async (req, res, next) => {
  try { await prisma.education.delete({ where: { id: req.params.id } }); res.status(204).send(); }
  catch (error) { next(error); }
});

// Contact form
app.post("/api/contact", contactLimiter, validate(contactSchema), async (req, res, next) => {
  try {
    const message = await prisma.contactMessage.create({ data: req.body });
    res.status(201).json({ message: "Your message has been received.", id: message.id });
  } catch (error) { next(error); }
});
app.get("/api/contact", requireAdmin, async (req, res, next) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const messages = await prisma.contactMessage.findMany({
      where: unreadOnly ? { isRead: false } : {},
      orderBy: { createdAt: "desc" }
    });
    res.json({ messages });
  } catch (error) { next(error); }
});
app.patch("/api/contact/:id", requireAdmin, idParams, validate(messageReadSchema), async (req, res, next) => {
  try { res.json({ message: await prisma.contactMessage.update({ where: { id: req.params.id }, data: req.body }) }); }
  catch (error) { next(error); }
});
app.delete("/api/contact/:id", requireAdmin, idParams, async (req, res, next) => {
  try { await prisma.contactMessage.delete({ where: { id: req.params.id } }); res.status(204).send(); }
  catch (error) { next(error); }
});

// Not-found and centralized errors. Do not leak database errors in production.
app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND", message: "Route not found." }));
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "VALIDATION_ERROR", issues: error.issues });
    return;
  }
  const code = (error as { code?: string })?.code;
  if (code === "P2002") {
    res.status(409).json({ error: "CONFLICT", message: "A record with this unique value already exists." });
    return;
  }
  if (code === "P2025") {
    res.status(404).json({ error: "NOT_FOUND", message: "Record not found." });
    return;
  }
  console.error(error);
  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: isProduction ? "An unexpected error occurred." : String((error as Error)?.message ?? error)
  });
});

const server = app.listen(env.PORT, () => {
  console.log(`Portfolio API listening on http://localhost:${env.PORT}`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
