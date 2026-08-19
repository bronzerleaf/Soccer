# PitchLink

PitchLink is a youth club soccer networking platform for adult parents, coaches, trainers, organizations, and team administrators. Parents own and manage player profiles; children never have PitchLink accounts.

## Current product model

### Player profiles

Parents can create and edit a player profile at any time. The soccer profile focuses on information useful to the club environment:

- first name + last initial
- birth year
- detailed position(s)
- preferred foot
- city
- club and team
- years playing
- level of play
- short soccer bio
- Instagram / YouTube profile links
- external highlight clip links

PitchLink does not use weight, speed-test results, or goal totals as core player-profile fields.

### Private professional discovery

A parent controls a private setting: **Allow verified professionals to find this profile**.

The underlying database field remains `players.open_to_opportunities` for compatibility with the existing RLS model, but the product does not display an “available” or “open to opportunities” badge on player profiles. It is a search-access control, not a public status.

Verified coaches can discover consented profiles only when that private setting is enabled. A family may keep a player non-searchable and still explicitly express interest in an individual opportunity post.

### Player clips

PitchLink stores links, not video files. Supported links can point to YouTube, Instagram, Hudl, Veo, or other external providers.

Every clip can include:

- a parent-written caption
- a soccer theme
- `Profile only` visibility, or
- `Profile + feed` visibility

When an external provider exposes an oEmbed thumbnail, PitchLink uses it. Otherwise the UI renders a provider-specific visual fallback. Feed-published clips support likes and comments while the underlying player profile remains protected by its own RLS rules.

### Opportunity interest

Parents can explicitly raise their hand on roster spots, guest-play requests, training opportunities, and organization events. They choose which consent-verified player is interested and may include a note.

The post author can see only families who explicitly expressed interest in that post. Verified coaches, trainers, and organizations can start an adult-to-adult PitchLink conversation from that explicit interest. This does not make the player globally searchable.

### Trainers and organizations

Trainer accounts require manual verification before publishing training sessions or clinics. Organization accounts retain manual verification for event posts. Both use an admin approval queue.

### Teams and GotSport

PitchLink owns its own team records and verified membership relationships. A verified team manager can optionally add a GotSport Team ID and official GotSport team URL as an external cross-reference.

PitchLink does not scrape, copy, or automatically ingest GotSport rosters/rankings. Any future automated GotSport data integration requires authorized API/data access.

## Stack

- Next.js App Router + TypeScript
- React
- Supabase Postgres, Auth, RLS, and Storage
- Tailwind CSS
- Resend
- Stripe scaffolding

## Safety principles

- adults only hold accounts
- parents own player profiles
- parental consent gates player-data sharing
- player discovery is private and permissioned
- messages always route between adult accounts
- player video is never hosted by PitchLink
- verified team rosters are limited to verified team relationships
- professional contact from a trainer/organization requires explicit family interest in that professional's opportunity

See the Supabase migrations and database tests for the enforcement layer.