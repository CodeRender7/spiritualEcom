import { Migration } from "@mikro-orm/migrations"

/**
 * Creates the seven BRM (Business Revenue Management) billing tables backing
 * the T9-approved schema (`.scratch/advanced-commerce/issues/09-brm-engine.md`):
 *
 *   offer_template, way_group, plan_line, add_on_template, subscription,
 *   subscription_item, renewal_event
 *
 * Telecom invariants kept: price-plan ≠ charge-plan (subscription snapshots
 * plan prices into subscription_item; renewals re-rate from the snapshot);
 * recharge ≠ top-up (add_on_template never affects the base subscription_item).
 *
 * Amounts are minor units (paise) — repo-wide T1 convention.
 * `created_at`/`updated_at`/`deleted_at` are added by Medusa's DML layer.
 */
export class Migration20260816Brm extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "offer_template" (
        "id" text not null,
        "code" text not null,
        "name" text not null,
        "kind" text not null default 'subscription',
        "way_group_id" text null,
        "status" text not null default 'active',
        "billing_model" text not null default 'prepaid',
        "interval" text not null default 'month',
        "interval_count" integer not null default 1,
        "trial_days" integer not null default 0,
        "billing_anchor" timestamptz null,
        "auto_renew" boolean not null default true,
        "max_cycles" integer null,
        "validity_days" integer null,
        "proration" text not null default 'none',
        "grace_days" integer not null default 3,
        "retry_attempts" integer not null default 3,
        "retry_interval_days" jsonb null,
        "discount_rule_id" text null,
        "effective_from" timestamptz null,
        "effective_to" timestamptz null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "offer_template_pkey" primary key ("id")
      )
    `)
    this.addSql(`create unique index if not exists "IDX_offer_template_code" on "offer_template" ("code")`)
    this.addSql(`create index if not exists "IDX_offer_template_way_group_id" on "offer_template" ("way_group_id")`)

    this.addSql(`
      create table if not exists "way_group" (
        "id" text not null,
        "code" text not null,
        "name" text not null,
        "provider" text null,
        "plan_family" text null,
        "payment_method" text null,
        "region" text null,
        "priority" integer not null default 100,
        "status" text not null default 'active',
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "way_group_pkey" primary key ("id")
      )
    `)
    this.addSql(`create unique index if not exists "IDX_way_group_code" on "way_group" ("code")`)

    this.addSql(`
      create table if not exists "plan_line" (
        "id" text not null,
        "offer_template_id" text not null,
        "product_id" text null,
        "quantity" integer not null default 1,
        "included_qty" integer not null default 0,
        "unit_price" integer not null default 0,
        "price_mode" text not null default 'flat',
        "charge_type" text not null default 'recurring',
        "billing_cycle_override" integer null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "plan_line_pkey" primary key ("id")
      )
    `)
    this.addSql(
      `create index if not exists "IDX_plan_line_offer_template_id" on "plan_line" ("offer_template_id")`
    )

    this.addSql(`
      create table if not exists "add_on_template" (
        "id" text not null,
        "code" text not null,
        "name" text not null,
        "offer_template_id" text not null,
        "product_id" text null,
        "charge_type" text not null default 'one_time',
        "unit_price" integer not null default 0,
        "quantity" integer not null default 1,
        "billing_cycles" integer null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "add_on_template_pkey" primary key ("id")
      )
    `)
    this.addSql(`create unique index if not exists "IDX_add_on_template_code" on "add_on_template" ("code")`)
    this.addSql(
      `create index if not exists "IDX_add_on_template_offer_template_id" on "add_on_template" ("offer_template_id")`
    )

    this.addSql(`
      create table if not exists "subscription" (
        "id" text not null,
        "customer_id" text not null,
        "offer_template_id" text not null,
        "way_group_id" text null,
        "status" text not null default 'future',
        "current_period_start" timestamptz null,
        "current_period_end" timestamptz null,
        "billing_anchor_date" timestamptz null,
        "cycles_remaining" integer null,
        "auto_renew" boolean not null default true,
        "grace_until" timestamptz null,
        "currency" text not null default 'inr',
        "payment_method_id" text null,
        "provider_payment_customer" text null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "subscription_pkey" primary key ("id")
      )
    `)
    this.addSql(`create index if not exists "IDX_subscription_customer_id" on "subscription" ("customer_id")`)
    this.addSql(`create index if not exists "IDX_subscription_status" on "subscription" ("status")`)
    this.addSql(
      `create index if not exists "IDX_subscription_offer_template_id" on "subscription" ("offer_template_id")`
    )

    this.addSql(`
      create table if not exists "subscription_item" (
        "id" text not null,
        "subscription_id" text not null,
        "plan_line_id" text null,
        "product_id" text null,
        "quantity" integer not null default 1,
        "unit_price" integer not null default 0,
        "included_qty" integer not null default 0,
        "used_qty" integer not null default 0,
        "next_charge_at" timestamptz null,
        "status" text not null default 'active',
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "subscription_item_pkey" primary key ("id")
      )
    `)
    this.addSql(
      `create index if not exists "IDX_subscription_item_subscription_id" on "subscription_item" ("subscription_id")`
    )

    this.addSql(`
      create table if not exists "renewal_event" (
        "id" text not null,
        "subscription_id" text not null,
        "period_start" timestamptz null,
        "period_end" timestamptz null,
        "amount" integer not null default 0,
        "kind" text not null default 'renewal',
        "payment_id" text null,
        "attempt" integer not null default 1,
        "status" text not null default 'pending',
        "error" text null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "renewal_event_pkey" primary key ("id")
      )
    `)
    this.addSql(
      `create index if not exists "IDX_renewal_event_subscription_id" on "renewal_event" ("subscription_id")`
    )
    this.addSql(`create index if not exists "IDX_renewal_event_status" on "renewal_event" ("status")`)
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "renewal_event"`)
    this.addSql(`drop table if exists "subscription_item"`)
    this.addSql(`drop table if exists "subscription"`)
    this.addSql(`drop table if exists "add_on_template"`)
    this.addSql(`drop table if exists "plan_line"`)
    this.addSql(`drop table if exists "way_group"`)
    this.addSql(`drop table if exists "offer_template"`)
  }
}