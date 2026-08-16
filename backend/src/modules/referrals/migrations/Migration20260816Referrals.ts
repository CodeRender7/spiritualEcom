import { Migration } from "@mikro-orm/migrations"

/**
 * Adds the `referral` + `referral_attribution` tables that back the
 * DivineKart referral / invite-link acquisition program (T5):
 *
 * - `referral`: one row per referrer customer, holding their shareable code
 *   and the reward coupon issued after their first successful invite.
 * - `referral_attribution`: one row per invitee, recording which code they
 *   came through, their first-order completion, and reward status.
 *
 * Rows are written by src/subscribers/referrals.ts (customer.created →
 * issue code; order.placed → attribute + reward) and read by the account
 * page via the store API route.
 */
export class Migration20260816Referrals extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "referral" (
        "id" text not null,
        "code" text not null,
        "referrer_customer_id" text not null,
        "source" text not null default 'storefront',
        "reward_code" text null,
        "reward_status" text not null default 'pending',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "referral_pkey" primary key ("id")
      )
    `)
    this.addSql(`create unique index if not exists "IDX_referral_code" on "referral" ("code")`)
    this.addSql(
      `create unique index if not exists "IDX_referral_referrer_customer_id" on "referral" ("referrer_customer_id")`
    )

    this.addSql(`
      create table if not exists "referral_attribution" (
        "id" text not null,
        "referral_id" text not null,
        "invitee_email" text not null,
        "invitee_customer_id" text null,
        "attributed_order_id" text null,
        "first_order_completed_at" timestamptz null,
        "subscription_activated_at" timestamptz null,
        "reward_status" text not null default 'pending',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "referral_attribution_pkey" primary key ("id")
      )
    `)
    this.addSql(
      `create index if not exists "IDX_referral_attribution_referral_id" on "referral_attribution" ("referral_id")`
    )
    this.addSql(
      `create index if not exists "IDX_referral_attribution_invitee_email" on "referral_attribution" ("invitee_email")`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "referral_attribution"`)
    this.addSql(`drop table if exists "referral"`)
  }
}