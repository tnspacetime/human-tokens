import { relations, sql } from "drizzle-orm";
import {
	check,
	customType,
	date,
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const INTERVIEW_STATUSES = [
	"draft",
	"ready",
	"invited",
	"submitted",
	"published",
	"archived",
] as const;

export const BACKGROUND_READING_STATUSES = [
	"draft",
	"ready",
	"published",
] as const;

export const AUTHORING_LINK_SCOPES = ["draft", "guest"] as const;

export const SHARE_SNAPSHOT_KINDS = [
	"interview",
	"background_reading",
] as const;

export const interviewStatusEnum = pgEnum(
	"interview_status",
	INTERVIEW_STATUSES,
);

export const backgroundReadingStatusEnum = pgEnum(
	"background_reading_status",
	BACKGROUND_READING_STATUSES,
);

export const authoringLinkScopeEnum = pgEnum(
	"authoring_link_scope",
	AUTHORING_LINK_SCOPES,
);

export const shareSnapshotKindEnum = pgEnum(
	"share_snapshot_kind",
	SHARE_SNAPSHOT_KINDS,
);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
	dataType: () => "bytea",
});

export const guests = pgTable(
	"guests",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		name: text("name").notNull(),
		description: text("description").notNull(),
	},
	(table) => [
		index("guests_name_idx").on(table.name),
		check("guests_name_not_blank", sql`char_length(btrim(${table.name})) > 0`),
		check(
			"guests_description_not_blank",
			sql`char_length(btrim(${table.description})) > 0`,
		),
	],
);

export const backgroundReadings = pgTable(
	"background_readings",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		title: text("title").default("").notNull(),
		summary: text("summary").default("").notNull(),
		contentMarkdown: text("content_markdown").default("").notNull(),
		status: backgroundReadingStatusEnum("status").default("draft").notNull(),
		publicationDate: date("publication_date", { mode: "string" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("background_readings_published_publication_date_idx")
			.on(table.publicationDate.desc())
			.where(sql`${table.status} = 'published'`),
		check(
			"background_readings_published_title_required",
			sql`${table.status} <> 'published' OR char_length(btrim(${table.title})) > 0`,
		),
		check(
			"background_readings_published_summary_required",
			sql`${table.status} <> 'published' OR char_length(btrim(${table.summary})) > 0`,
		),
		check(
			"background_readings_published_date_required",
			sql`${table.status} <> 'published' OR ${table.publicationDate} IS NOT NULL`,
		),
		check(
			"background_readings_published_content_required",
			sql`${table.status} <> 'published' OR char_length(btrim(${table.contentMarkdown})) > 0`,
		),
		check(
			"background_readings_updated_after_created",
			sql`${table.updatedAt} >= ${table.createdAt}`,
		),
	],
);

export const interviews = pgTable(
	"interviews",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		guestId: uuid("guest_id").references(() => guests.id, {
			onDelete: "restrict",
		}),
		backgroundReadingId: uuid("background_reading_id").references(
			() => backgroundReadings.id,
			{
				onDelete: "set null",
				onUpdate: "cascade",
			},
		),
		publicId: text("public_id").notNull().unique("interviews_public_id_unique"),
		portraitImageId: text("portrait_image_id"),
		title: text("title").default("").notNull(),
		summary: text("summary").default("").notNull(),
		contentMarkdown: text("content_markdown").default("").notNull(),
		status: interviewStatusEnum("status").default("draft").notNull(),
		publicationDate: date("publication_date", { mode: "string" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
			.defaultNow()
			.notNull(),
		contentUpdatedAt: timestamp("content_updated_at", {
			withTimezone: true,
			mode: "date",
		})
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("interviews_guest_id_idx").on(table.guestId),
		index("interviews_background_reading_id_idx").on(table.backgroundReadingId),
		index("interviews_published_publication_date_idx")
			.on(table.publicationDate.desc())
			.where(sql`${table.status} = 'published'`),
		check(
			"interviews_public_id_format",
			sql`char_length(${table.publicId}) >= 22 AND ${table.publicId} ~ '^[A-Za-z0-9_-]+$'`,
		),
		check(
			"interviews_published_title_required",
			sql`${table.status} <> 'published' OR char_length(btrim(${table.title})) > 0`,
		),
		check(
			"interviews_published_summary_required",
			sql`${table.status} <> 'published' OR char_length(btrim(${table.summary})) > 0`,
		),
		check(
			"interviews_published_date_required",
			sql`${table.status} <> 'published' OR ${table.publicationDate} IS NOT NULL`,
		),
		check(
			"interviews_published_content_required",
			sql`${table.status} <> 'published' OR char_length(btrim(${table.contentMarkdown})) > 0`,
		),
		check(
			"interviews_published_guest_required",
			sql`${table.status} <> 'published' OR ${table.guestId} IS NOT NULL`,
		),
		check(
			"interviews_updated_after_created",
			sql`${table.updatedAt} >= ${table.createdAt}`,
		),
		check(
			"interviews_content_updated_after_created",
			sql`${table.contentUpdatedAt} >= ${table.createdAt}`,
		),
	],
);

export const authoringLinks = pgTable(
	"authoring_links",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		interviewId: uuid("interview_id").references(() => interviews.id, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
		backgroundReadingId: uuid("background_reading_id").references(
			() => backgroundReadings.id,
			{
				onDelete: "cascade",
				onUpdate: "cascade",
			},
		),
		scope: authoringLinkScopeEnum("scope").notNull(),
		tokenHash: bytea("token_hash")
			.notNull()
			.unique("authoring_links_token_hash_unique"),
		rawToken: text("raw_token"),
		expiresAt: timestamp("expires_at", {
			withTimezone: true,
			mode: "date",
		}).notNull(),
		revokedAt: timestamp("revoked_at", {
			withTimezone: true,
			mode: "date",
		}),
		submittedAt: timestamp("submitted_at", {
			withTimezone: true,
			mode: "date",
		}),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("authoring_links_interview_id_idx").on(table.interviewId),
		index("authoring_links_background_reading_id_idx").on(
			table.backgroundReadingId,
		),
		index("authoring_links_expires_at_idx").on(table.expiresAt),
		uniqueIndex("authoring_links_one_active_scope_per_interview_idx")
			.on(table.interviewId, table.scope)
			.where(
				sql`${table.interviewId} IS NOT NULL AND ${table.revokedAt} IS NULL`,
			),
		uniqueIndex("authoring_links_one_active_scope_per_background_idx")
			.on(table.backgroundReadingId, table.scope)
			.where(
				sql`${table.backgroundReadingId} IS NOT NULL AND ${table.revokedAt} IS NULL`,
			),
		check(
			"authoring_links_exactly_one_target",
			sql`(${table.interviewId} IS NOT NULL AND ${table.backgroundReadingId} IS NULL) OR (${table.interviewId} IS NULL AND ${table.backgroundReadingId} IS NOT NULL)`,
		),
		check(
			"authoring_links_guest_targets_interview",
			sql`${table.scope} <> 'guest' OR ${table.interviewId} IS NOT NULL`,
		),
		check(
			"authoring_links_sha256_length",
			sql`octet_length(${table.tokenHash}) = 32`,
		),
		check(
			"authoring_links_expiry_after_creation",
			sql`${table.expiresAt} > ${table.createdAt}`,
		),
		check(
			"authoring_links_revocation_after_creation",
			sql`${table.revokedAt} IS NULL OR ${table.revokedAt} >= ${table.createdAt}`,
		),
	],
);

export const shareSnapshots = pgTable(
	"share_snapshots",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		shareId: text("share_id")
			.notNull()
			.unique("share_snapshots_share_id_unique"),
		kind: shareSnapshotKindEnum("kind").notNull(),
		sourceRecordId: uuid("source_record_id").notNull(),
		title: text("title").notNull(),
		summary: text("summary").notNull(),
		contentMarkdown: text("content_markdown").notNull(),
		guestName: text("guest_name"),
		guestDescription: text("guest_description"),
		portraitImageId: text("portrait_image_id"),
		revokedAt: timestamp("revoked_at", {
			withTimezone: true,
			mode: "date",
		}),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("share_snapshots_source_idx").on(table.kind, table.sourceRecordId),
		check(
			"share_snapshots_share_id_format",
			sql`char_length(${table.shareId}) >= 22 AND ${table.shareId} ~ '^[A-Za-z0-9_-]+$'`,
		),
		check(
			"share_snapshots_title_not_blank",
			sql`char_length(btrim(${table.title})) > 0`,
		),
		check(
			"share_snapshots_summary_not_blank",
			sql`char_length(btrim(${table.summary})) > 0`,
		),
		check(
			"share_snapshots_content_not_blank",
			sql`char_length(btrim(${table.contentMarkdown})) > 0`,
		),
		check(
			"share_snapshots_background_has_no_interview_metadata",
			sql`${table.kind} <> 'background_reading' OR (${table.guestName} IS NULL AND ${table.guestDescription} IS NULL AND ${table.portraitImageId} IS NULL)`,
		),
		check(
			"share_snapshots_revocation_after_creation",
			sql`${table.revokedAt} IS NULL OR ${table.revokedAt} >= ${table.createdAt}`,
		),
	],
);

export const guestsRelations = relations(guests, ({ many }) => ({
	interviews: many(interviews),
}));

export const interviewsRelations = relations(interviews, ({ many, one }) => ({
	guest: one(guests, {
		fields: [interviews.guestId],
		references: [guests.id],
	}),
	backgroundReading: one(backgroundReadings, {
		fields: [interviews.backgroundReadingId],
		references: [backgroundReadings.id],
	}),
	authoringLinks: many(authoringLinks),
}));

export const backgroundReadingsRelations = relations(
	backgroundReadings,
	({ many }) => ({
		interviews: many(interviews),
		authoringLinks: many(authoringLinks),
	}),
);

export const authoringLinksRelations = relations(authoringLinks, ({ one }) => ({
	interview: one(interviews, {
		fields: [authoringLinks.interviewId],
		references: [interviews.id],
	}),
	backgroundReading: one(backgroundReadings, {
		fields: [authoringLinks.backgroundReadingId],
		references: [backgroundReadings.id],
	}),
}));

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;
export type Interview = typeof interviews.$inferSelect;
export type NewInterview = typeof interviews.$inferInsert;
export type BackgroundReading = typeof backgroundReadings.$inferSelect;
export type NewBackgroundReading = typeof backgroundReadings.$inferInsert;
export type AuthoringLink = typeof authoringLinks.$inferSelect;
export type NewAuthoringLink = typeof authoringLinks.$inferInsert;
export type ShareSnapshot = typeof shareSnapshots.$inferSelect;
export type NewShareSnapshot = typeof shareSnapshots.$inferInsert;
