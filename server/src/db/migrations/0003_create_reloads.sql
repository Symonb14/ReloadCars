CREATE TABLE "reload" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"charge_point_id" text,
	"charge_point_name" text NOT NULL,
	"charge_point_address" text,
	"charged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_minutes" integer NOT NULL,
	"energy_kwh" numeric(8, 2) NOT NULL,
	"energy_estimated" boolean NOT NULL,
	"price_per_kwh_cents" integer,
	"total_cents" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reload_duration_check" CHECK ("reload"."duration_minutes" between 1 and 1440),
	CONSTRAINT "reload_energy_check" CHECK ("reload"."energy_kwh" > 0),
	CONSTRAINT "reload_price_check" CHECK ("reload"."price_per_kwh_cents" is null or "reload"."price_per_kwh_cents" >= 0),
	CONSTRAINT "reload_total_check" CHECK (("reload"."total_cents" is null) = ("reload"."price_per_kwh_cents" is null))
);
--> statement-breakpoint
ALTER TABLE "reload" ADD CONSTRAINT "reload_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reload" ADD CONSTRAINT "reload_charge_point_id_charge_point_id_fk" FOREIGN KEY ("charge_point_id") REFERENCES "public"."charge_point"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reload_user_charged_at_idx" ON "reload" USING btree ("user_id","charged_at" DESC NULLS LAST);