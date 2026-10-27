import { z } from "zod";

const optionalUrl = z.union([z.string().url(), z.literal("")]).optional().transform(v => v || undefined);
const optionalText = z.string().trim().max(2000).optional().transform(v => v || undefined);

export const loginSchema = z.object({
  email: z.string().email().transform(v => v.toLowerCase()),
  password: z.string().min(1).max(200)
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  headline: z.string().trim().min(1).max(180),
  bio: z.string().trim().min(1).max(5000),
  location: optionalText,
  avatarUrl: optionalUrl,
  resumeUrl: optionalUrl,
  email: z.union([z.string().email(), z.literal("")]).optional().transform(v => v || undefined),
  phone: optionalText,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  websiteUrl: optionalUrl
}).strict();

export const projectSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().trim().min(1).max(1000),
  description: z.string().trim().max(10000).optional(),
  imageUrl: optionalUrl,
  liveUrl: optionalUrl,
  githubUrl: optionalUrl,
  techStack: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10000).default(0)
}).strict();

export const skillSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(80),
  level: z.string().trim().max(40).optional(),
  sortOrder: z.number().int().min(0).max(10000).default(0)
}).strict();

export const experienceSchema = z.object({
  company: z.string().trim().min(1).max(160),
  position: z.string().trim().min(1).max(160),
  location: optionalText,
  employmentType: optionalText,
  startDate: z.coerce.date(),
  endDate: z.union([z.coerce.date(), z.null()]).optional(),
  current: z.boolean().default(false),
  description: z.string().trim().min(1).max(10000),
  sortOrder: z.number().int().min(0).max(10000).default(0)
}).strict();

export const educationSchema = z.object({
  institution: z.string().trim().min(1).max(200),
  degree: z.string().trim().min(1).max(160),
  field: optionalText,
  startDate: z.union([z.coerce.date(), z.null()]).optional(),
  endDate: z.union([z.coerce.date(), z.null()]).optional(),
  description: z.string().trim().max(5000).optional(),
  sortOrder: z.number().int().min(0).max(10000).default(0)
}).strict();

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(2).max(160),
  message: z.string().trim().min(10).max(5000)
}).strict();

export const messageReadSchema = z.object({ isRead: z.boolean() }).strict();
