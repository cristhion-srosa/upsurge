ALTER TABLE "payments" ADD COLUMN "stripe_payment_intent_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_unique_idx" ON "payments" USING btree ("stripe_payment_intent_id");
