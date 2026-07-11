CREATE TABLE IF NOT EXISTS "frames" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"t" double precision NOT NULL,
	"engagement" double precision,
	"valence" double precision,
	"attention" double precision,
	"signals" jsonb,
	"confidence" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"context" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "frames" ADD CONSTRAINT "frames_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_frames_session_t" ON "frames" USING btree ("session_id","t");