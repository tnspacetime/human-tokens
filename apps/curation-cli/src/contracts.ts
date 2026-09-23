import { z } from "zod";

const uuid = z.string().uuid();

export const guestSchema = z.object({
	id: uuid,
	name: z.string(),
	description: z.string(),
});

export type Guest = z.infer<typeof guestSchema>;

export const guestContributionSchema = z
	.discriminatedUnion("status", [
		z.object({ status: z.literal("awaiting") }),
		z.object({
			status: z.literal("submitted"),
			submittedAt: z.string().datetime(),
		}),
	])
	.nullable();

export const interviewStatusSchema = z.enum([
	"draft",
	"ready",
	"invited",
	"submitted",
	"published",
	"archived",
]);

export const interviewListItemSchema = z.object({
	id: uuid,
	publicId: z.string(),
	title: z.string(),
	status: interviewStatusSchema,
	guest: z
		.object({
			id: uuid,
			name: z.string(),
		})
		.nullable(),
	guestContribution: guestContributionSchema,
	updatedAt: z.string().datetime(),
});

export type InterviewListItem = z.infer<typeof interviewListItemSchema>;

export const interviewDetailSchema = z.object({
	id: uuid,
	publicId: z.string(),
	title: z.string(),
	summary: z.string(),
	contentMarkdown: z.string(),
	portraitImageId: z.string().nullable(),
	status: interviewStatusSchema,
	backgroundReadingId: uuid.nullable(),
	publicationDate: z.string().nullable(),
	guest: guestSchema.nullable(),
	guestContribution: guestContributionSchema,
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export type InterviewDetail = z.infer<typeof interviewDetailSchema>;

export const createDraftResponseSchema = z.object({
	version: z.literal("1"),
	draftUrl: z.string().url(),
	expiresAt: z.string().datetime(),
	interviewId: uuid.optional(),
});

export const shareSnapshotKindSchema = z.enum([
	"interview",
	"background_reading",
]);

export type ShareSnapshotKind = z.infer<typeof shareSnapshotKindSchema>;

export const createShareSnapshotResponseSchema = z.object({
	version: z.literal("1"),
	snapshotId: uuid,
	kind: shareSnapshotKindSchema,
	shareUrl: z.string().url(),
	createdAt: z.string().datetime(),
});

export const revokeShareSnapshotResponseSchema = z.object({
	version: z.literal("1"),
	status: z.literal("revoked"),
	revokedAt: z.string().datetime(),
});

export const createGuestResponseSchema = z.object({
	version: z.literal("1"),
	item: guestSchema,
});

export const guestListResponseSchema = z.object({
	version: z.literal("1"),
	items: z.array(guestSchema),
	nextCursor: z.string().nullable(),
});

export const interviewListResponseSchema = z.object({
	version: z.literal("1"),
	items: z.array(interviewListItemSchema),
	nextCursor: z.string().nullable(),
});

export const interviewResponseSchema = z.object({
	version: z.literal("1"),
	item: interviewDetailSchema,
});

export const attachGuestResponseSchema = z.object({
	version: z.literal("1"),
	item: z.object({
		interviewId: uuid,
		guest: guestSchema,
		updatedAt: z.string().datetime(),
	}),
});

export const publishedPairSchema = z.object({
	publicId: z.string(),
	publicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	guest: guestSchema,
	interview: z.object({
		title: z.string(),
		summary: z.string(),
		contentMarkdown: z.string(),
		portraitUrl: z.string().nullable(),
	}),
	backgroundReading: z.object({
		title: z.string(),
		summary: z.string(),
		contentMarkdown: z.string(),
	}),
});

export type PublishedPair = z.infer<typeof publishedPairSchema>;

export const publishPairResponseSchema = z.object({
	version: z.literal("1"),
	item: publishedPairSchema,
});

export const publicPairResponseSchema = publishPairResponseSchema;

export const apiErrorResponseSchema = z.object({
	version: z.literal("1"),
	error: z.object({
		code: z.string(),
		message: z.string(),
	}),
});
