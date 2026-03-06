# Claude Code Instructions for this Project

## Azure DevOps Integration

**Project**: Todo-App (Tadeu Marques)
**Organization**: zartis-digital

All work items (user stories, tasks, bugs) must be created in this Azure DevOps project.

---

## MANDATORY Development Workflow

**CRITICAL**: This workflow applies to ALL features, changes, and implementations. No exceptions.

### Workflow Overview

```
User Request
    ↓
1. Product Manager (ENTRY POINT & ORCHESTRATOR) ⭐ ALWAYS START HERE
    ↓
   [Product Manager decides approach and delegates to:]
    ↓
├─→ Business Analyst (if diagrams/story maps needed)
├─→ z-discovery skill (if automated workflow preferred)
└─→ Creates PRD and stories directly
    ↓
2. Ask User About Azure DevOps Story Creation (REQUIRED)
    ↓
3. Architecture Review (REQUIRED)
    ↓
4. Implementation (REQUIRED)
    ↓
5. Testing & Quality (REQUIRED)
    ↓
6. License Compliance (if dependencies added)
```

### Step-by-Step Process

#### 1. Product Manager - Entry Point & Orchestrator (ALWAYS START HERE) ⭐

**Use Agent**: `z-cora:product-manager`

This is the **MANDATORY ENTRY POINT** for all features, changes, and implementations.

**The Product Manager agent is the orchestrator who:**
- Receives and understands the user request
- Gathers and clarifies requirements
- Makes decisions about the approach
- **Delegates to other agents/skills as needed**
- Coordinates the overall workflow
- Ensures nothing is missed

**What the Product Manager will do:**
1. Understand your request (may ask clarifying questions)
2. Decide the best approach:
   - Use `z-cora:z-discovery` skill for automated end-to-end workflow
   - Use `z-cora:business-analyst` for visual diagrams/story maps
   - Create PRD and stories directly
3. Coordinate with other specialists (architect, developers, QA)

**Example**:
```
User: "I want to add user authentication"
You: *Immediately invoke z-cora:product-manager agent*
Product Manager: *Gathers requirements, creates PRD, breaks into stories*
Product Manager: *May delegate to z-discovery or business-analyst as needed*
```

**Why Product Manager is the entry point:**
- Ensures requirements are properly understood before any work begins
- Makes strategic decisions about implementation approach
- Coordinates the team effectively
- Prevents skipping important steps

**Never skip this step** - even for "simple" requests. The Product Manager will efficiently handle simple requests and ensure complex ones are properly broken down.

#### 2. Ask User About Azure DevOps Story Creation (REQUIRED)

**BEFORE creating stories in Azure DevOps, you MUST ask the user:**

```
"Should I create user stories in Azure DevOps for this work?
The stories will be created in the 'Todo-App (Tadeu Marques)' project."
```

**If user says YES:**
- Proceed with story creation via the discovery workflow or ado-sync skill
- Link all subsequent work to these stories

**If user says NO:**
- Document the stories in the conversation
- Still follow the rest of the workflow (architecture, implementation, testing)

#### 3. Architecture Review (REQUIRED)

**Use Agent**: `z-cora:system-architect`

**For**:
- All architecture decisions
- Technology and library choices
- Data model changes
- System design
- Scalability considerations
- Any decision that impacts how the system works

**Never skip this step** - even if the change seems simple.

#### 4. Implementation Phase (REQUIRED)

**Use Skill**: `z-cora:z-implement-story` (preferred)
**Or Use Agent**: `z-cora:senior-developer`

**For**:
- Writing all production code
- Implementing features
- Bug fixes
- Refactoring
- Code changes

The z-implement-story skill will:
- Create an implementation plan first
- Ask for user approval
- Implement with tests included
- Follow best practices automatically

**Never write production code directly** - always delegate to these agents/skills.

#### 5. Testing & Quality Phase (REQUIRED)

**Use Skill**: `z-cora:z-test-story` (preferred)
**Or Use Agent**: `z-cora:qa-specialist`

**For**:
- Creating test cases
- Writing Gherkin/BDD scenarios
- Integration tests
- Quality validation
- Test coverage verification

The z-test-story skill will:
- Create Gherkin test cases in Azure DevOps
- Write missing integration tests
- Validate test coverage
- Ensure quality gates are met

**Never skip testing** - quality gates must be met for all work.

#### 6. License Compliance (WHEN APPLICABLE)

**Use Skill**: `z-cora:z-dependency-audit`
**Or Use Agent**: `z-cora:license-guardian`

**When**: Before adding ANY new dependency to package.json

**For**:
- Checking license compliance
- Auditing all project dependencies
- Flagging copyleft/commercial licenses
- Ensuring compliance with organizational policy

---

## Available Z-Cora Components

### Task Agents (invoke via Task tool)

1. **z-cora:product-manager** ⭐ ENTRY POINT - ALWAYS START HERE
   - **Role**: Entry point and orchestrator for ALL feature work
   - **Responsibilities**: Requirements gathering, PRDs, user stories, coordinating other agents
   - **Use when**: ALWAYS - at the beginning of any feature request, change, or enhancement
   - **What they do**: Understand requirements, make strategic decisions, delegate to specialists
   - **Note**: This is NOT optional - product-manager coordinates the entire workflow

2. **z-cora:business-analyst**
   - Visual diagrams, story maps, process flows, user journeys
   - Use when: Need to visualize workflows or create story maps

3. **z-cora:senior-developer**
   - Production-ready code with comprehensive tests
   - Use when: Implementing features, fixing bugs, refactoring
   - **Automatically fetches current library documentation**

4. **z-cora:system-architect**
   - System design, architecture reviews, technical decisions
   - Use when: Making architectural decisions or reviewing system design

5. **z-cora:qa-specialist**
   - Test automation, BDD/Gherkin scenarios, quality assurance
   - Use when: Need comprehensive testing strategy or test automation

6. **z-cora:license-guardian**
   - License compliance audits and enforcement
   - Use when: Need to audit all dependencies or check specific licenses

### Skills (invoke via Skill tool)

**Note**: Skills are typically invoked by the product-manager agent as part of their workflow coordination.

**Discovery & Planning:**
- `z-cora:z-discovery` - Complete automated workflow from idea to stories in ADO (product-manager may delegate to this)
- `z-cora:z-market-to-idea` - Transform research into validated idea
- `z-cora:z-idea-to-prd` - Create PRD from idea
- `z-cora:z-prd-to-epics` - Break PRD into Epics
- `z-cora:z-prd-to-stories` - Generate user stories from PRD
- `z-cora:z-create-story-map` - Generate story map from PRD

**Implementation:**
- `z-cora:z-implement-story` - Plan and implement user story (creates plan first) ⭐
- `z-cora:context-aware-coding` - Fetch current library docs before coding

**Testing:**
- `z-cora:z-test-story` - Complete testing workflow for a story ⭐
- `z-cora:z-generate-gherkin` - Convert stories to Gherkin for BDD

**Bug Fixes:**
- `z-cora:z-bug-fix` - Complete bug fix workflow (read from ADO, fix, test, PR)

**Compliance:**
- `z-cora:z-dependency-audit` - Audit all dependencies for license compliance
- `z-cora:z-check-license` - Check specific dependency license

**Azure DevOps:**
- `z-cora:ado-sync` - Create work items in Azure DevOps
- `z-cora:story-generator` - Generate INVEST-compliant stories

**Visualization:**
- `z-cora:z-business-diagram` - Generate business diagrams (journeys, flows, trees)

**Sprint Management:**
- `z-cora:z-sprint-summary` - Generate sprint summaries with metrics

---

## Decision Rules

### When do I use a Skill vs an Agent?

**Use Skills when:**
- You want an automated, end-to-end workflow
- You want work items created in Azure DevOps
- You want a complete process (discovery, implementation, testing)
- **Example**: z-cora:z-discovery, z-cora:z-implement-story, z-cora:z-test-story

**Use Agents when:**
- You need expert consultation or review
- You want more control over the process
- You need specialized analysis
- **Example**: z-cora:system-architect for design review, z-cora:senior-developer for code review

**When in doubt, prefer Skills** - they provide complete workflows.

### What if the user's request is simple?

**Follow the workflow anyway.** Even "simple" changes benefit from:
- Proper requirements documentation
- Architecture review
- Tests
- Quality validation

**Examples of "simple" requests that still need the full workflow:**
- "Add a delete button" → Architecture review needed (where? what happens? error handling?)
- "Change a color" → Could impact accessibility, user experience
- "Add a field" → Database schema change, migration needed, tests required

---

## Enforcement Rules

**You MUST:**
1. ✅ **ALWAYS start with `z-cora:product-manager` agent as the entry point** - No exceptions
2. ✅ Always ask user before creating stories in Azure DevOps
3. ✅ Let product-manager coordinate and delegate to other agents/skills
4. ✅ Always consult `z-cora:system-architect` before architectural decisions (product-manager may delegate this)
5. ✅ Always use `z-cora:senior-developer` or `z-cora:z-implement-story` for code
6. ✅ Always use `z-cora:qa-specialist` or `z-cora:z-test-story` for testing
7. ✅ Always check licenses before adding dependencies

**You MUST NOT:**
1. ❌ Skip the product-manager entry point, even for "simple" requests
2. ❌ Write production code directly without using agents/skills
3. ❌ Skip architecture review, even for "simple" changes
4. ❌ Skip testing and quality validation
5. ❌ Create Azure DevOps work items without asking user first
6. ❌ Rationalize that something is "too simple" for the workflow
7. ❌ Go directly to z-discovery, system-architect, or senior-developer without product-manager first

---

## Project Overview

**Todo List Application** - A modern, responsive web application for managing tasks and staying organized.

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **Form Handling**: React Hook Form
- **Data Fetching**: Next.js Server Components & Server Actions

### Key Features

- Create, read, update, and delete todos
- Mark todos as complete/incomplete
- Set priority levels (low, medium, high)
- Add due dates to tasks
- Organize tasks by active and completed status
- Responsive design for mobile and desktop

## Project Structure

```
tadeu-todo-app/
├── app/
│   ├── actions/
│   │   └── todos.ts              # Server Actions for CRUD operations
│   ├── components/
│   │   ├── TodoForm.tsx          # Form for creating new todos
│   │   ├── TodoItem.tsx          # Individual todo item display
│   │   └── TodoList.tsx          # List container for todos
│   ├── generated/
│   │   └── prisma/               # Generated Prisma Client
│   ├── layout.tsx                # Root layout with metadata
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── lib/
│   └── prisma.ts                 # Prisma client singleton
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Database migrations
├── public/                       # Static assets
├── .env                          # Environment variables (gitignored)
└── package.json                  # Project dependencies
```

## Database Schema

### Todo Model

| Field       | Type      | Description                          |
|-------------|-----------|--------------------------------------|
| id          | String    | Unique identifier (CUID)             |
| title       | String    | Todo title (required)                |
| description | String?   | Optional detailed description        |
| completed   | Boolean   | Completion status (default: false)   |
| priority    | String    | Priority level: low/medium/high      |
| dueDate     | DateTime? | Optional due date                    |
| createdAt   | DateTime  | Creation timestamp                   |
| updatedAt   | DateTime  | Last update timestamp                |

## Development Guidelines

### Running the Application

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Database Operations

```bash
# Create a migration
npx prisma migrate dev --name <migration_name>

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Code Organization

- **Server Actions** (`app/actions/`): Handle all database operations and mutations
- **Components** (`app/components/`): Reusable UI components (client components)
- **Pages** (`app/page.tsx`): Server components that fetch and display data
- **Lib** (`lib/`): Shared utilities and configurations

### Styling Conventions

- Use Tailwind CSS utility classes
- Follow responsive-first design (mobile → desktop)
- Maintain consistent color scheme (blue/indigo primary colors)
- Use semantic spacing and sizing units

## Future Considerations

As the project evolves, consider:
- User authentication and multi-user support
- Task categories/tags
- Search and filtering capabilities
- Task sorting options
- Data export functionality
- Progressive Web App (PWA) features
- Migration from SQLite to PostgreSQL for production
