# Project Brief: Club Soccer Roster Matching Platform (working name: OpenRoster)

## 1. What we're building

A LinkedIn-style marketplace for youth club soccer player movement — connecting families whose kids are open to joining a new club team with coaches and clubs who have open roster spots.

This is not a college recruiting platform. Competitors (SportsRecruits, NCSA, CaptainU, SoccerWire) all target the college signing moment for high school juniors and seniors. We target the years before that: U9–U16 club-to-club movement, which today happens through group chats, tryout rumors, and coaches texting each other.

Launch market: Dallas–Fort Worth. Do not build for national scale in v1.

### The core loop

1. Parent creates a profile for their player, flags them "Open to opportunities"
2. Club coach posts an open roster spot for a specific age group
3. Coach searches/filters the player pool and messages the parent — OR the parent sees the roster post and reaches out
4. They arrange a tryout off-platform

### Who pays

- **Parents/players:** free in v1. Freemium later (profile view analytics, featured placement).
- **Clubs/coaches:** free during DFW launch to seed supply. Paid roster posts + player pool access once there is density. Build the Stripe scaffolding but leave it behind a feature flag.

## 2. Non-negotiable constraints

These are hard rules. Do not design around them or propose alternatives that soften them.

### Child safety and COPPA

- Only adults hold accounts. A parent/guardian creates and owns the player profile. The child is a subject of the profile, never a user. There is no child login, no child email, no child password — at any age.
- Verifiable parental consent is required before any player data is collected. Implement via a nominal card authorization ($0.50, immediately voided) through Stripe Identity or equivalent. Log consent timestamp, method, and IP immutably.
- All messaging routes to the parent inbox. There is no path, ever, by which a coach can message a child directly. Every message is logged and retained.
- Profiles are private by default and visible only to verified coach accounts. Never publicly indexable. Add `noindex` on all profile routes.
- Coach verification is mandatory before a coach account can search players or send messages: club affiliation, club-domain email or admin confirmation, and a manual approval step. Manual review is acceptable and expected in v1.
- Minimize data. Collect first name, last initial, birth year (not full DOB), position, current club/team, city. No home address, no school name, no full DOB.
- Include a one-click parental data deletion that hard-deletes, not soft-deletes.

### Storage

- We do not host video. Ever. Players link out to Hudl, Veo, YouTube, Instagram. Store URLs and render embeds/thumbnails only.
- One profile photo per player, max 2MB, resized on upload. That is the only binary asset we store.

### Data sourcing

- Do not scrape GotSport, Demosphere, or any league site. No API exists and it creates legal and maintenance risk we're not taking in v1.
- Team affiliation is parent-entered from a curated dropdown of DFW clubs, seeded manually. Expect a few hundred entries.
- No rankings integration in v1.

## 3. Scope

### In scope for v1

- Parent account signup + verified consent flow
- Player profile: photo, birth year, position(s), preferred foot, current club/team, city, social/video links, short bio, "Open to opportunities" toggle
- Coach/club account signup + verification queue with admin approval
- Club/team profile pages
- Open roster posts (age group, position needed, tryout date, description, expiry)
- Player search for verified coaches: filter by birth year, position, city, open-to-opportunities status
- Two-way messaging: coach ↔ parent, and parent → coach in response to roster posts
- Email notifications for new messages and matching roster posts
- Admin dashboard: approve coaches, moderate posts, view flagged messages, manage the club dropdown

### Explicitly out of scope for v1

Do not build these even if they seem easy: trainer marketplace, rankings integration, college recruiting features, stats tracking, video hosting, native mobile apps, team management/scheduling, in-app payments to trainers, public profile sharing, AI matching.

## 4. Stack

- Next.js (App Router, TypeScript)
- Supabase — Postgres, Auth, Row Level Security, Storage for profile photos
- Tailwind CSS
- Resend for transactional email
- Stripe for consent verification now, subscriptions later (feature-flagged)
- Vercel for hosting

Enforce access control at the database layer with RLS policies, not just in the app. A misconfigured client query must not be able to leak a minor's profile.

## 5. Data model (starting point)

- `profiles` — one row per adult user; `role` is `parent` | `coach` | `admin`
- `players` — belongs to a parent profile; the minor's data; `open_to_opportunities` boolean
- `clubs` — curated list; name, city, age groups fielded
- `coach_verifications` — coach profile, claimed club, evidence, status, reviewed_by, reviewed_at
- `roster_posts` — belongs to a club + coach; birth year, positions, tryout date, expires_at
- `conversations` / `messages` — participants are always adult profiles; `player_id` as optional context
- `consent_records` — player_id, parent_id, method, timestamp, ip, immutable

## 6. Build order

Work in this sequence and stop for review after each milestone.

1. **Auth + roles + RLS.** Parent and coach signup, role separation, database policies. Verify with tests that a coach cannot read an unverified-visibility player row.
2. **Player profiles + consent flow.** Parent creates player, consent gate blocks profile activation until complete.
3. **Coach verification + admin queue.** Manual approval. No coach can search until approved.
4. **Player search.** Filters, results, profile detail view for verified coaches.
5. **Roster posts.** Create, browse, expire.
6. **Messaging + notifications.** Parent inbox, coach inbox, email alerts.
7. **Admin moderation tools.**

## 7. Design direction

The audience is club soccer parents on their phones, usually between work and practice. Mobile-first is not a nicety — most sessions will be on a phone in a parking lot.

Tone: competent and calm. This is a serious decision about a kid's development, not a social app. Avoid the neon-gradient sports-tech look and avoid anything that feels like a dating app — the "open to opportunities" mechanic makes that a real risk. Look closer to a professional network than a marketplace.

Copy rules: name things by what people do. "Open to opportunities," not "Set availability status." "Message the family," not "Contact user." Never refer to a child as a "listing," "candidate," or "asset."

Empty states carry a lot of weight in a cold-start product — write them as invitations with a clear next action, not apologies.

## 8. Working notes for Claude Code

- Ask before adding dependencies.
- Write RLS policy tests alongside every table that touches player data.
- Flag anything that looks like it creates a path from an adult to a child outside the parent inbox. That is the highest-severity bug class in this codebase.
- Prefer boring, well-documented patterns. This will be maintained part-time by one person.

## 9. Local Feed (v1.1 — pending sign-off)

A radius-based feed layered on top of the v1 core loop. Every rule in Section 2 still applies without exception; this section only adds to it.

### Location

- Location is a city choice, not a coordinate. Resolve the browser's geolocation prompt to a city from the existing curated DFW list and store nothing more precise than that plus a radius in miles.
- Never store a raw lat/long against a profile. Never show a location, precise or coarse, to another user — it is a filter, not a field.
- Radius and city are user-editable at any time, including a manual override for travel.

### Organizations

- A fourth role: `organization`. Verified the same way a coach is — manual admin approval, no exceptions.
- An organization account can only create `org_event` posts. It has no access to player search, player profiles, or messaging. It is not a coach and must never be treated as one in RLS.

### Feed posts

- `looking_for_team` and `guest_play` posts carry exactly what a player profile already carries in search — birth year, position, city. Never a name or photo in the feed card. A coach who wants to say more must message the parent, same as today.
- Likes and shares apply only to `feed_posts`. Never to a player profile. Never to a message. A shared link still requires an account to open.
- No public comment threads. A reply is a message, logged and retained under the existing rules in Section 2.

### Data model addition

- `profiles.home_city_id` / `profiles.radius_miles` — feed location preference, opt-in (null = not participating).
- `organization_verifications` — mirrors `coach_verifications`: org name, evidence, status, reviewed_by, reviewed_at.
- `feed_posts` — `post_type` (`roster_spot` / `looking_for_team` / `guest_play` / `org_event`), author_id, city_id, birth_year, positions, description, expires_at, and a nullable player_id (set only for looking_for_team/guest_play, never exposed in the card).
- `feed_post_likes` — post_id, profile_id, created_at, unique per pair.

### Build order

1. Migration: `home_city_id` / `radius_miles` on profiles, RLS for self-only read/write.
2. Migration: `organization_verifications` + admin queue, mirroring the coach flow. pgTAP: an org cannot self-approve.
3. Migration: `feed_posts` + `feed_post_likes`, RLS scoped by post type and radius. pgTAP: identity never leaks for looking_for_team/guest_play; an org can only write org_event.
4. UI: radius picker + "traveling" override, feed card list, composer per post type.
5. UI: like / share, login-gated share links.
6. Admin: extend the existing flag/remove tooling to cover feed_posts.
7. Run pgTAP + build/lint, update README, commit, push.
