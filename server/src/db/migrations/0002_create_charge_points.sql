CREATE TABLE "charge_point" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"partner_id" text,
	"external_id" text,
	"name" text NOT NULL,
	"description" text,
	"address" text,
	"location" geometry(Point, 4326) NOT NULL,
	"power_kw" numeric(6, 1),
	"price_per_kwh_cents" integer,
	"connectors" text[] DEFAULT '{}'::text[] NOT NULL,
	"opening_hours" text,
	"attribution" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "charge_point_externalId_unique" UNIQUE("external_id"),
	CONSTRAINT "charge_point_source_check" CHECK (("charge_point"."source" = 'partner' and "charge_point"."partner_id" is not null)
        or ("charge_point"."source" = 'ocm' and "charge_point"."external_id" is not null)),
	CONSTRAINT "charge_point_price_check" CHECK ("charge_point"."price_per_kwh_cents" is null or "charge_point"."price_per_kwh_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "partner" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"document" text,
	"email" text,
	"phone" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "charge_point" ADD CONSTRAINT "charge_point_partner_id_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partner"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "charge_point_location_geog_idx" ON "charge_point" USING gist (("location"::geography));