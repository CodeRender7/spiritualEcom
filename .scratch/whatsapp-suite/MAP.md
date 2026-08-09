# Wayfinder Map: WhatsApp Business Suite for DivineKart

**Status**: Planning  
**Created**: 2026-08-04  
**Destination**: Complete WhatsApp integration with OpenWA, multi-session management, comprehensive event automation, broadcast capabilities, and admin control panel

## Destination

A production-ready WhatsApp Business Suite that enables DivineKart admin to:
- Manage multiple WhatsApp sessions (QR login, start/stop/monitor)
- Automate customer communications across the entire order lifecycle
- Send broadcast campaigns and personalized offers
- Provide real-time chat support
- Track all messaging activity with detailed analytics

This is admin-only functionality with a dedicated management panel in the Medusa admin dashboard.

## Notes

**Domain**: E-commerce messaging automation, customer engagement, WhatsApp Business API alternative  
**Skills to use**: `/prototype` for UI mockups, `/grilling` for architecture decisions, `/domain-modeling` for event taxonomy  
**Execution pattern**: Harness (linear pipeline through phases)  
**Complexity**: Multi-service (OpenWA container + backend modules + admin UI), real-time (webhooks + websockets), stateful (session persistence)

**Key constraints**:
- OpenWA container must run isolated with volume persistence for session data
- Multi-session support requires session registry + routing layer
- Real-time features need WebSocket connection from admin UI to backend
- All WhatsApp actions admin-only (storefront has zero WhatsApp access)
- Message delivery must be queued/retryable (not fire-and-forget)

## Decisions so far

*(Empty — map is being charted)*

## Not yet specified

**Phase 1 Fog** (OpenWA + Session Management):
- OpenWA Docker image selection (official vs community forks)
- Session data persistence strategy (volume layout, backup)
- QR code delivery mechanism (SSE vs WebSocket vs polling)
- Session lifecycle hooks (on connect, on disconnect, on QR refresh)

**Phase 2 Fog** (Backend Integration):
- Message queue choice (BullMQ on Redis vs in-memory during MVP)
- Webhook security (signature verification, replay protection)
- Session routing (how backend maps order → correct WhatsApp session)
- Rate limiting strategy (per-session, global, by message type)

**Phase 3 Fog** (Admin UI):
- React component library (stay with @medusajs/ui or add shadcn/Mantine)
- Multi-session view (table vs cards vs timeline)
- Real-time updates transport (WebSocket, SSE, or polling)
- QR scan UX (modal, side panel, dedicated page)

**Phase 4 Fog** (Event Automation):
- Cart abandonment detection heuristic (time threshold, trigger conditions)
- Payment link generation (integration with existing Razorpay flow)
- Order tracking granularity (just status changes or minute-by-minute)
- Template variable syntax (mustache, handlebars, or custom)

**Phase 5 Fog** (Broadcast + Personalization):
- Broadcast scheduling (immediate, scheduled, recurring)
- Customer segmentation rules (order history, cart value, last interaction)
- Catalog format (text + images, WhatsApp native catalog, PDF)
- A/B testing support (for offer campaigns)

**Phase 6 Fog** (Chat Support):
- Inbound message routing (queue, assignment logic)
- Admin notification mechanism (desktop, sound, badge counts)
- Conversation history storage (DB schema, search/filter)
- Canned responses / quick replies management

**Cross-cutting Fog**:
- Analytics schema (messages sent/delivered/read, session uptime, response times)
- Admin permissions model (who can start sessions, send broadcasts, access chats)
- Audit logging (all WhatsApp actions with timestamps + actor)
- Error handling + alerting (session drops, send failures, webhook timeouts)

## Out of scope

- **Customer-facing WhatsApp UI**: Storefront never shows WhatsApp controls; customers only receive messages
- **WhatsApp Web/Desktop client replacement**: We're not building a full-featured chat app, only business automation
- **WhatsApp Group management**: Focus is 1:1 customer communication
- **Voice/Video calls**: Text and media messages only
- **WhatsApp Payments integration**: Use existing Razorpay; WhatsApp just sends payment links
- **AI chatbot / NLP**: Phase 1 is human-driven chat support; automation is template-based
- **Multi-language templates**: English + emoji for MVP; i18n is future work

---

## Implementation Phases (High-Level)

### Phase 1: OpenWA Container + Basic Session Management
**Goal**: QR login, single-session connection, health monitoring  
**Deliverables**: Docker service, backend session model, basic admin UI for QR scan

### Phase 2: Multi-Session Architecture
**Goal**: Multiple WhatsApp accounts, session registry, message routing  
**Deliverables**: Session manager service, webhook endpoints, routing logic

### Phase 3: Order Lifecycle Events
**Goal**: Automate order confirmation, shipping, delivery notifications  
**Deliverables**: Subscribers for order.placed/shipped/delivered, template engine

### Phase 4: Cart & Payment Events
**Goal**: Abandoned cart recovery, payment link sending, payment status tracking  
**Deliverables**: Cart monitor, payment subscribers, link generator

### Phase 5: Broadcast & Personalization
**Goal**: Send offers to segments, product catalogs, personalized campaigns  
**Deliverables**: Broadcast scheduler, segmentation engine, catalog builder

### Phase 6: Live Chat Support
**Goal**: Real-time inbound message handling, admin chat interface  
**Deliverables**: Inbound webhook, chat UI, conversation storage

### Phase 7: Admin Management Panel
**Goal**: Unified WhatsApp dashboard with analytics, templates, settings  
**Deliverables**: React admin panel, session controls, message logs, analytics

---

## Tickets (To Be Created)

Will be created during wayfinder execution based on frontier decisions.

## Risk Assessment

**High Risk**:
- OpenWA session stability (WhatsApp can ban aggressive automation)
- Multi-session state management (race conditions, session leaks)
- Real-time admin UI updates (WebSocket scaling, reconnection)

**Medium Risk**:
- Message delivery guarantees (queue persistence, retry logic)
- Webhook replay attacks (signature verification complexity)
- Template variable injection (XSS, code injection via user data)

**Low Risk**:
- Docker container orchestration (standard compose service)
- Database schema design (extends existing store/order models)
- Admin UI components (Medusa UI library is mature)

---

## Estimated Scope

- **Code volume**: ~3500-4500 lines (backend modules + admin UI + Docker config)
- **New files**: ~25-30 (services, routes, components, migrations)
- **External dependencies**: `@open-wa/wa-automate`, `bullmq`, `socket.io`, `date-fns`
- **Database tables**: 4-6 new (sessions, message_log, broadcasts, chat_conversations)
- **Timeline**: 3-5 full development days for MVP (all 7 phases)

---

## Next Steps

1. **User review**: Confirm destination, scope, phase priorities
2. **Ticket creation**: Chart Phase 1 tickets (OpenWA + session basics)
3. **Prototype**: Mock admin UI for session management panel
4. **Research**: Investigate OpenWA Docker best practices, session persistence
5. **Begin implementation**: Phase 1 foundation (container + basic backend)