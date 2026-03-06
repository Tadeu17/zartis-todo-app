# Product Requirements Document (PRD)
## Personal Todo List Application

**Document Version:** 1.0
**Last Updated:** 2026-01-15
**Status:** RETROACTIVE (Post-Implementation Documentation)
**Product Owner:** Tadeu Marques
**Target Release:** v1.0 (Already Deployed)

---

## Executive Summary

A personal productivity tool that enables users to create, organize, and track their daily tasks with priority-based organization and deadline management. Built as a single-user web application focusing on simplicity, speed, and accessibility.

**Key Value Proposition:** Zero-friction task management with modern UX and reliable local-first data persistence.

---

## Problem Statement

### User Pain Points
- **Cognitive Overload:** Users struggle to remember multiple tasks and priorities throughout the day
- **Task Prioritization:** Difficulty distinguishing between urgent and non-urgent work
- **Deadline Management:** Missing important deadlines due to lack of visibility
- **Context Switching:** Need a lightweight tool that doesn't require complex setup or navigation

### Target Audience
- **Primary:** Individual knowledge workers who need personal task tracking
- **Secondary:** Students, freelancers, and anyone managing daily responsibilities
- **User Characteristics:**
  - Comfortable with web applications
  - Value speed and simplicity over advanced features
  - Need quick access to task list throughout the day

### Success Metrics
- Time to create a todo: < 5 seconds
- User can organize 50+ tasks without performance degradation
- 100% accessibility compliance (WCAG AA)
- Zero data loss on browser refresh

---

## Product Goals & Objectives

### Primary Goals
1. **Frictionless Task Capture:** Users can add tasks in seconds with minimal input required
2. **Visual Clarity:** Clear distinction between active and completed tasks with priority indicators
3. **Deadline Awareness:** Visual due date tracking to prevent missed deadlines
4. **Data Reliability:** Tasks persist reliably across sessions

### Non-Goals (Out of Scope for v1.0)
- Multi-user collaboration or sharing
- Mobile native applications (iOS/Android)
- Cloud sync across devices
- Task categories or projects
- Recurring tasks
- Task dependencies
- Time tracking
- Notifications or reminders
- Task attachments
- Third-party integrations

---

## User Stories & Use Cases

### Core User Journeys

**Journey 1: Quick Task Capture**
```
As a busy professional
I want to quickly add a task with minimal fields
So that I can capture thoughts without disrupting my workflow
```

**Journey 2: Priority Management**
```
As a user managing multiple responsibilities
I want to assign priority levels to tasks
So that I can focus on what's most important
```

**Journey 3: Deadline Tracking**
```
As someone with time-sensitive work
I want to set due dates on tasks
So that I don't miss important deadlines
```

**Journey 4: Task Completion**
```
As a user completing work
I want to mark tasks as complete
So that I can see my progress and maintain focus on remaining work
```

---

## Functional Requirements

### FR-1: Task Creation
- **FR-1.1:** User can create a task with title (required)
- **FR-1.2:** User can add optional description (multi-line text)
- **FR-1.3:** User can select priority level (low/medium/high)
- **FR-1.4:** User can set optional due date
- **FR-1.5:** Form validates required fields before submission
- **FR-1.6:** Form provides immediate feedback on submission state

### FR-2: Task Display
- **FR-2.1:** Tasks are displayed in two sections: Active and Completed
- **FR-2.2:** Active tasks display before completed tasks
- **FR-2.3:** Within each section, incomplete tasks sort by creation date (newest first)
- **FR-2.4:** Each task displays: title, description, priority badge, due date
- **FR-2.5:** Priority is color-coded (low=blue, medium=amber, high=red)
- **FR-2.6:** Completed tasks show visual indication (strikethrough text, muted colors)

### FR-3: Task Management
- **FR-3.1:** User can toggle task completion status with checkbox
- **FR-3.2:** User can delete tasks with confirmation prompt
- **FR-3.3:** Changes are immediately reflected in the UI
- **FR-3.4:** Loading states are shown during async operations

### FR-4: Data Persistence
- **FR-4.1:** All tasks are stored in local SQLite database
- **FR-4.2:** Tasks persist across browser sessions
- **FR-4.3:** Database operations are transactional (no partial updates)
- **FR-4.4:** Each task has unique identifier (CUID)
- **FR-4.5:** Timestamps track creation and last update time

### FR-5: User Interface
- **FR-5.1:** Responsive design works on mobile (320px+) and desktop (1920px+)
- **FR-5.2:** Two-column layout on desktop, stacked on mobile
- **FR-5.3:** Form in left column, task list in right column (desktop)
- **FR-5.4:** Empty state message when no tasks exist
- **FR-5.5:** Visual feedback for interactive elements (hover, focus, active states)

---

## Non-Functional Requirements

### NFR-1: Performance
- Page load time < 2 seconds on 4G connection
- Form submission feedback < 500ms
- Smooth animations and transitions (60fps)
- Support for 1000+ tasks without degradation

### NFR-2: Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation for all functionality
- Screen reader compatible
- Sufficient color contrast (4.5:1 for normal text)
- Focus indicators on all interactive elements

### NFR-3: Browser Support
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- No IE11 support required

### NFR-4: Security
- No authentication required (single-user, local-only)
- SQL injection prevention through ORM
- XSS prevention through React escaping
- CSRF protection via framework defaults

### NFR-5: Reliability
- Zero data loss on browser refresh
- Graceful error handling with user feedback
- Database integrity maintained through transactions
- Automatic reconnection on connection loss

### NFR-6: Maintainability
- TypeScript for type safety
- Component-based architecture
- Server actions for data mutations
- Clear separation of concerns (UI/Data/Business Logic)

---

## Technical Architecture

### Technology Stack
- **Frontend Framework:** Next.js 16 (React 19) with App Router
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Form Management:** React Hook Form 7
- **Database:** SQLite (via libSQL adapter)
- **ORM:** Prisma 7
- **Performance:** React Compiler enabled

### System Components

```
┌─────────────────────────────────────────────┐
│           Browser (Client)                   │
│  ┌─────────────────────────────────────┐   │
│  │  React Components (Client)          │   │
│  │  - TodoForm (form state)            │   │
│  │  - TodoList (display logic)         │   │
│  │  - TodoItem (interactions)          │   │
│  └─────────────────────────────────────┘   │
│                    │                         │
│                    │ Server Actions          │
│                    ▼                         │
│  ┌─────────────────────────────────────┐   │
│  │  Server Components & Actions        │   │
│  │  - Page (SSR data fetching)         │   │
│  │  - todos.ts (CRUD operations)       │   │
│  └─────────────────────────────────────┘   │
│                    │                         │
│                    │ Prisma Client           │
│                    ▼                         │
│  ┌─────────────────────────────────────┐   │
│  │  Data Layer                         │   │
│  │  - Prisma ORM (type-safe queries)  │   │
│  │  - libSQL adapter                   │   │
│  └─────────────────────────────────────┘   │
│                    │                         │
│                    ▼                         │
│  ┌─────────────────────────────────────┐   │
│  │  SQLite Database (dev.db)           │   │
│  │  - Todo table                       │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Data Model

```prisma
model Todo {
  id          String   @id @default(cuid())
  title       String                              // Required task name
  description String?                             // Optional details
  completed   Boolean  @default(false)            // Completion status
  priority    String   @default("medium")         // low|medium|high
  dueDate     DateTime?                           // Optional deadline
  createdAt   DateTime @default(now())            // Audit trail
  updatedAt   DateTime @updatedAt                 // Auto-update
}
```

### API Surface (Server Actions)

| Action | Parameters | Returns | Purpose |
|--------|-----------|---------|---------|
| `getTodos()` | None | `Todo[]` | Fetch all tasks |
| `createTodo()` | `CreateTodoInput` | `Todo` | Create new task |
| `updateTodo()` | `UpdateTodoInput` | `Todo` | Update existing task |
| `deleteTodo()` | `id: string` | `void` | Delete task |
| `toggleTodo()` | `id: string` | `Todo` | Toggle completion |

---

## User Experience Requirements

### UX-1: Visual Design
- Clean, minimal interface with breathing room
- Gradient background (blue-to-indigo) for visual interest
- Card-based layout with subtle shadows
- Professional typography and spacing

### UX-2: Interaction Patterns
- Immediate visual feedback on all actions
- Optimistic UI updates where appropriate
- Confirmation prompts for destructive actions
- Loading indicators during async operations
- Disabled states prevent duplicate submissions

### UX-3: Information Architecture
- Form and list side-by-side on desktop
- Clear section headers ("Active Tasks" vs "Completed")
- Priority badges as visual anchors
- Due dates displayed in human-readable format

### UX-4: Error Handling
- Inline validation errors on form fields
- Toast/alert notifications for server errors
- Graceful degradation if database unavailable
- Clear error messages in plain language

---

## Dependencies & Integrations

### External Dependencies
- **Next.js:** Web framework and routing
- **Prisma:** Database ORM and migrations
- **Tailwind CSS:** Utility-first styling
- **React Hook Form:** Form state management
- **libSQL:** SQLite adapter for Prisma

### No External Integrations
This is a standalone application with no external API calls or third-party services.

---

## Constraints & Assumptions

### Technical Constraints
- Single-user only (no authentication layer)
- Local database (no cloud sync)
- Browser-based only (no native mobile)
- Requires JavaScript enabled

### Business Constraints
- Zero budget (no paid services)
- Solo developer project
- No customer support infrastructure

### Assumptions
- User has modern browser with JavaScript enabled
- User wants local-first data (privacy-focused)
- User manages < 1000 tasks at a time
- User doesn't need task sharing or collaboration

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data loss due to database corruption | HIGH | LOW | Prisma transactions, consider backup strategy |
| Browser compatibility issues | MEDIUM | LOW | Test on major browsers, use stable APIs |
| Performance degradation with many tasks | MEDIUM | MEDIUM | Implement pagination if needed (future) |
| User expects mobile app | LOW | HIGH | Clear documentation of web-only support |
| Loss of data on device loss | MEDIUM | MEDIUM | Document export feature for future |

---

## Quality Assurance Requirements

### Testing Strategy (NOT YET IMPLEMENTED)
- **Unit Tests:** Server actions, utility functions
- **Integration Tests:** Database operations, form submissions
- **E2E Tests:** Critical user flows (create, complete, delete)
- **Accessibility Tests:** WCAG compliance automation
- **Performance Tests:** Load time, interaction responsiveness

### Acceptance Criteria (Global)
- All functional requirements implemented
- No console errors or warnings in production
- Passes accessibility audit (Lighthouse/axe)
- Works on all supported browsers
- Responsive on mobile and desktop

---

## Launch Criteria & Rollout

### Definition of Done for v1.0
- [x] All functional requirements implemented
- [ ] Unit test coverage > 80%
- [ ] E2E tests for critical paths
- [ ] Accessibility audit passed
- [ ] Performance audit passed (Lighthouse > 90)
- [ ] Documentation complete
- [ ] Code review completed
- [ ] Security review completed

### Post-Launch Monitoring
- Monitor for console errors (if analytics added)
- Collect user feedback (if feedback mechanism added)
- Track performance metrics

---

## Future Considerations (v2.0+)

### Potential Enhancements
1. **Task Categories/Projects:** Group related tasks
2. **Search & Filter:** Find tasks by keyword or criteria
3. **Recurring Tasks:** Auto-create repeating tasks
4. **Task Notes:** Add detailed notes or checklists
5. **Export/Import:** Backup and restore data
6. **Keyboard Shortcuts:** Power-user features
7. **Dark Mode:** User preference support
8. **Task Templates:** Quick-add common tasks
9. **Analytics Dashboard:** Productivity insights
10. **Cloud Sync:** Optional account for multi-device

---

## Appendix

### Glossary
- **CUID:** Collision-resistant unique identifier
- **Server Action:** Next.js server-side function callable from client
- **SSR:** Server-side rendering
- **Optimistic UI:** Immediate UI update before server confirmation

### References
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Change Log
- **2026-01-15:** Retroactive PRD created post-implementation
- **[Future]:** To be updated as requirements evolve

---

## PRD Quality Checklist

- [x] Problem statement clearly defined
- [x] Target audience identified
- [x] Success metrics specified
- [x] Functional requirements detailed
- [x] Non-functional requirements specified
- [x] Technical architecture documented
- [x] User experience requirements defined
- [x] Dependencies identified
- [x] Risks assessed with mitigation strategies
- [x] Quality requirements outlined
- [x] Future considerations documented
- [ ] Stakeholder approval obtained (N/A - retroactive)
- [ ] Technical feasibility confirmed (Already built)

---

**Document Status:** This PRD was created retroactively to document an already-implemented application. It represents the requirements that should have been defined before development began.
