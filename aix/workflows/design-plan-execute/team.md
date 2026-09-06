# Design, Plan, Execute Team

The metadata below is the workflow's compact delegation roster. The surrounding
Markdown is human-readable guidance; the metadata is the machine-validated
contract consumed by the project-manager.

The roster is the first lookup for delegation. `name` is the stable activation
name, `displayName` is the user-facing label, `directory` is the role bundle
location, and the remaining fields describe the role's bounded operating
contract. Workflow roles use the conventional `roles/project-dev/<name>` path;
the standalone project-manager is explicitly located at
`aix/roles/project-manager`.

## Team roster

| Role | Display name | Role directory | What they do |
| --- | --- | --- | --- |
| `implementation-engineer` | Implementation Engineer | `roles/project-dev/implementation-engineer` | Implements scoped source and test changes and reports verification evidence. |
| `documentation-specialist` | Documentation Specialist | `roles/project-dev/documentation-specialist` | Maintains project documentation, plans, and knowledge-base content when assigned. |
| `technical-architect` | Technical Architect | `roles/project-dev/technical-architect` | Reviews architecture boundaries, runtime contracts, and maintainability risks. |
| `requirements-engineer` | Requirements Engineer | `roles/project-dev/requirements-engineer` | Defines requirements, acceptance signals, scope boundaries, and open questions. |
| `quality-engineer` | Quality Engineer | `roles/project-dev/quality-engineer` | Defines and performs verification, regression review, and quality-evidence collection. |
| `security-engineer` | Security Engineer | `roles/project-dev/security-engineer` | Reviews trust boundaries, credentials, destructive operations, and dependency risks. |
| `product-designer` | Product Designer | `roles/project-dev/product-designer` | Reviews user flows, interaction states, accessibility, and terminal UX. |
| `product-owner` | Product Owner | `roles/project-dev/product-owner` | Owns product intent, backlog ordering, acceptance, scope, prioritization, and product tradeoffs. |
| `release-engineer` | Release Engineer | `roles/project-dev/release-engineer` | Protects CI, builds, packages, supported hosts, compatibility, diagnostics, and release safety. |
| `ux-writer` | UX Writer | `roles/project-dev/ux-writer` | Reviews CLI copy, errors, onboarding, and workflow language. |

The project-manager is the workflow's orchestration role. The remaining roles
are bounded specialists selected for the task at hand. The implementation
engineer is the only role that normally changes source code; other write
domains remain constrained by each role's delegation contract. Role directories
for workflow specialists are relative to the workflow package; the project
manager is a separately installed role dependency.

<!-- aix:team
{
  "workflow": "design-plan-execute",
  "version": "2",
  "requiredCapabilities": [
    "native-worker-creation",
    "correlated-results"
  ],
  "roles": [
    {
      "name": "implementation-engineer",
      "displayName": "Implementation Engineer",
      "directory": "roles/project-dev/implementation-engineer",
      "responsibilities": ["source changes", "test changes", "implementation verification"],
      "taskModes": ["implementation", "verification", "review"],
      "deliveryModes": ["report-only", "isolated-change"],
      "writeDomains": ["src/", "tests/", "bin/"],
      "deniedAreas": [".aix/pm/", "AGENTS.md", "_docs/kb/"],
      "requiredCapabilities": ["workspace-write"],
      "requiredEvidence": ["files changed", "verification commands", "risks"],
      "sharedArtifacts": ["src/pm/types.ts", "src/pm/orchestrator.ts", "tests/fixtures/"], "readOnly": false, "serialization": "group"
    },
    {
      "name": "documentation-specialist",
      "displayName": "Documentation Specialist",
      "directory": "roles/project-dev/documentation-specialist",
      "responsibilities": ["project documentation", "plan and knowledge-base maintenance"],
      "taskModes": ["implementation", "review", "verification"],
      "deliveryModes": ["report-only", "isolated-change"],
      "writeDomains": ["_docs/", "README.md"],
      "deniedAreas": ["src/", "tests/", ".aix/pm/"],
      "requiredCapabilities": ["workspace-write"],
      "requiredEvidence": ["links checked", "documents changed", "unresolved gaps"],
      "sharedArtifacts": ["_docs/plans/"], "readOnly": false, "serialization": "group"
    },
    {
      "name": "technical-architect",
      "displayName": "Technical Architect",
      "directory": "roles/project-dev/technical-architect",
      "responsibilities": ["architecture boundaries", "runtime contracts", "maintainability review"],
      "taskModes": ["scout", "review", "verification"],
      "deliveryModes": ["report-only"],
      "writeDomains": [],
      "deniedAreas": ["src/", "tests/", "_docs/"],
      "requiredCapabilities": ["correlated-results"],
      "requiredEvidence": ["findings", "tradeoffs", "risks"],
      "sharedArtifacts": [], "readOnly": true, "serialization": "none"
    },
    {
      "name": "requirements-engineer",
      "displayName": "Requirements Engineer",
      "directory": "roles/project-dev/requirements-engineer",
      "responsibilities": ["requirements", "acceptance signals", "scope review"],
      "taskModes": ["scout", "review", "verification"],
      "deliveryModes": ["report-only"],
      "writeDomains": [],
      "deniedAreas": ["src/", "tests/", "_docs/"],
      "requiredCapabilities": ["correlated-results"],
      "requiredEvidence": ["requirements", "acceptance signals", "open questions"],
      "sharedArtifacts": [], "readOnly": true, "serialization": "none"
    },
    {
      "name": "quality-engineer",
      "displayName": "Quality Engineer",
      "directory": "roles/project-dev/quality-engineer",
      "responsibilities": ["verification strategy", "regression review", "quality evidence"],
      "taskModes": ["scout", "review", "verification"],
      "deliveryModes": ["report-only", "isolated-change"],
      "writeDomains": ["tests/"],
      "deniedAreas": ["src/", ".aix/pm/", "_docs/kb/"],
      "requiredCapabilities": ["correlated-results"],
      "requiredEvidence": ["commands run", "results", "validation gaps"],
      "sharedArtifacts": ["tests/fixtures/"], "readOnly": false, "serialization": "shared-artifact"
    },
    {
      "name": "security-engineer",
      "displayName": "Security Engineer",
      "directory": "roles/project-dev/security-engineer",
      "responsibilities": ["trust boundaries", "credentials", "destructive-operation review"],
      "taskModes": ["scout", "review", "verification"],
      "deliveryModes": ["report-only"],
      "writeDomains": [],
      "deniedAreas": ["src/", "tests/", "_docs/"],
      "requiredCapabilities": ["correlated-results"],
      "requiredEvidence": ["findings", "threats", "mitigations"],
      "sharedArtifacts": [], "readOnly": true, "serialization": "none"
    },
    {
      "name": "product-designer",
      "displayName": "Product Designer",
      "directory": "roles/project-dev/product-designer",
      "responsibilities": ["user flows", "interaction states", "terminal UX"],
      "taskModes": ["scout", "review", "verification"],
      "deliveryModes": ["report-only"],
      "writeDomains": [],
      "deniedAreas": ["src/", "tests/", "_docs/"],
      "requiredCapabilities": ["correlated-results"],
      "requiredEvidence": ["flow findings", "edge states", "accessibility risks"],
      "sharedArtifacts": [], "readOnly": true, "serialization": "none"
    },
    {
      "name": "product-owner",
      "displayName": "Product Owner",
      "directory": "roles/project-dev/product-owner",
      "responsibilities": ["product intent", "backlog ordering", "acceptance criteria", "product value", "prioritization", "scope decisions"],
      "taskModes": ["scout", "review", "verification"],
      "deliveryModes": ["report-only"],
      "writeDomains": [],
      "deniedAreas": ["src/", "tests/", "_docs/", "aix.json", "aix.lock.json", "AGENTS.md"],
      "requiredCapabilities": ["correlated-results"],
      "requiredEvidence": ["recommendation", "acceptance criteria", "tradeoffs", "scope risks"],
      "sharedArtifacts": [], "readOnly": true, "serialization": "none"
    },
    {
      "name": "release-engineer",
      "displayName": "Release Engineer",
      "directory": "roles/project-dev/release-engineer",
      "responsibilities": ["CI/CD", "build and package validation", "artifact integrity", "supported hosts", "cross-platform compatibility", "release diagnostics"],
      "taskModes": ["scout", "implementation", "review", "verification"],
      "deliveryModes": ["report-only", "isolated-change"],
      "writeDomains": [".github/", "scripts/", "RELEASE.md", "package.json", "package-lock.json"],
      "deniedAreas": ["src/", "tests/", ".aix/pm/", "aix.json", "aix.lock.json", "AGENTS.md", "publishing", "registry", "global-install", "unrestricted external release"],
      "requiredCapabilities": ["correlated-results", "workspace-write"],
      "requiredEvidence": ["commands run", "artifact contents", "platform findings", "rollback notes", "risks"],
      "sharedArtifacts": ["package.json", "package-lock.json"], "readOnly": false, "serialization": "group"
    },
    {
      "name": "ux-writer",
      "displayName": "UX Writer",
      "directory": "roles/project-dev/ux-writer",
      "responsibilities": ["CLI copy", "errors", "onboarding and workflow wording"],
      "taskModes": ["implementation", "review", "verification"],
      "deliveryModes": ["report-only", "isolated-change"],
      "writeDomains": ["README.md", "src/cli/"],
      "deniedAreas": ["src/pm/", ".aix/pm/", "_docs/kb/"],
      "requiredCapabilities": ["correlated-results"],
      "requiredEvidence": ["copy changed", "command examples", "clarity gaps"],
      "sharedArtifacts": ["src/cli/"], "readOnly": false, "serialization": "group"
    }
  ],
  "triggerRouting": {
    "normalization": "conversational and slash inputs normalize to canonical object-verb intents",
    "precedence": ["explicit slash/object-verb", "exact canonical phrase", "exact alias", "unambiguous natural language"],
    "ambiguity": "fail closed and ask for clarification listing matched intents",
    "contextFields": ["plan", "planRevision", "baseRevision", "workMode", "phase", "task", "sectionOwner", "acceptedDecisions", "constraints"],
    "routes": [
      {"intent": "brainstorm.explore", "aliases": ["brainstorm", "explore ideas", "what should we build?"], "slash": "/brainstorm", "procedure": "brainstorming-skill", "role": "product-owner"},
      {"intent": "vision.clarify", "aliases": ["define the goal", "capture the why", "set scope"], "slash": "/vision", "procedure": "requirements-clarify", "role": "product-owner"},
      {"intent": "design.shape", "aliases": ["design intent", "define boundaries", "design this"], "slash": "/design", "procedure": "design-intent", "role": "requirements-engineer"},
      {"intent": "plan.create", "aliases": ["plan phases", "break into tasks", "sequence the work"], "slash": "/plan", "procedure": "plan-create", "role": "project-manager"},
      {"intent": "plan.review", "aliases": ["review this plan", "plan readiness"], "slash": "/plan-review", "procedure": "plan-review", "role": "quality-engineer"},
      {"intent": "plan.activate", "aliases": ["activate this plan", "start implementation"], "slash": "/activate", "procedure": "plan-activate", "role": "project-manager"},
      {"intent": "phase.start", "aliases": ["execute Phase <n>", "start Phase <n>"], "slash": "/phase start <n>", "procedure": "phase-execute", "role": "project-manager"},
      {"intent": "task.start", "aliases": ["start this task", "work on task <id>"], "slash": "/task start <id>", "procedure": "task-execute", "role": "assigned-task-owner"},
      {"intent": "work.verify", "aliases": ["verify the work", "run the quality gate"], "slash": "/verify", "procedure": "work-verify", "role": "quality-engineer"},
      {"intent": "docs.promote", "aliases": ["promote the design", "refresh the KB"], "slash": "/docs refresh", "procedure": "design-promote", "role": "documentation-specialist"},
      {"intent": "plan.close", "aliases": ["complete the plan", "close out", "archive"], "slash": "/close", "procedure": "plan-complete", "role": "project-manager"}
    ],
    "approvalIntents": ["plan.approve-vision", "plan.approve-design", "plan.approve", "plan.activate", "plan.approve-closeout"],
    "authorityBoundary": "routing selects work only; activation, approval, safety waivers, publishing, and archival require existing authority gates"
  },
  "delegationPacket": {
    "requiredFields": ["packetId", "plan", "planRevision", "baseRevision", "phase", "task", "sectionOwner", "assignedRole", "assignedActor", "workMode", "acceptedDecisions", "constraints", "nonGoals", "expectedOutput", "dependencies", "gateAuthority", "evidenceRequirements"],
    "evidenceRequirements": ["status transition", "changed files or artifacts", "commands and results", "validation when applicable", "documentation impact", "residual risks", "conflict/base-revision reference"],
    "workerBoundary": "only packet-scoped task status and evidence; project-manager reconciles authoritative plan state",
    "invalidPacket": "reject and escalate; never infer omitted authority or context"
  },
  "planningContract": {
    "authority": "This contract is canonical for plan ownership and bounded plan writes. The active plan remains authoritative for current task state and evidence.",
    "sectionOwners": [
      {"section": "Status and lifecycle state", "owner": "project-manager", "collaborators": ["all active roles", "Boss"], "writeDomain": "plan lifecycle metadata and reconciliation", "approvalAuthority": "Boss for activation and acceptance", "requiredEvidence": ["status transition", "actor", "timestamp", "decision or rationale"]},
      {"section": "Context", "owner": "product-owner", "collaborators": ["requirements-engineer", "technical-architect", "project-manager"], "writeDomain": "plan context", "approvalAuthority": "Boss", "requiredEvidence": ["problem context", "constraints", "sources reviewed"]},
      {"section": "High-Level Goal", "owner": "product-owner", "collaborators": ["requirements-engineer", "implementation-engineer"], "writeDomain": "goal and success intent", "approvalAuthority": "Boss", "requiredEvidence": ["accepted goal", "scope", "success signals"]},
      {"section": "Design Intent", "owner": "product-owner", "collaborators": ["requirements-engineer", "technical-architect", "security-engineer", "quality-engineer"], "writeDomain": "design direction and acceptance intent", "approvalAuthority": "Boss", "requiredEvidence": ["accepted intent", "boundaries", "invariants", "tradeoffs"]},
      {"section": "Non-Goals", "owner": "product-owner", "collaborators": ["requirements-engineer", "technical-architect"], "writeDomain": "scope exclusions", "approvalAuthority": "product-owner; Boss for material scope changes", "requiredEvidence": ["explicit exclusions", "scope rationale"]},
      {"section": "Boundaries and Invariants", "owner": "technical-architect", "collaborators": ["security-engineer", "requirements-engineer", "quality-engineer"], "writeDomain": "architecture constraints and invariants", "approvalAuthority": "technical-architect; Boss for accepted-intent changes", "requiredEvidence": ["boundary analysis", "invariants", "integration risks"]},
      {"section": "Implementation Phases", "owner": "project-manager", "collaborators": ["technical-architect", "requirements-engineer", "implementation-engineer", "quality-engineer"], "writeDomain": "phase and task decomposition", "approvalAuthority": "Boss for sequencing before activation", "requiredEvidence": ["ordered phases", "dependencies", "ownership", "verification"]},
      {"section": "Phase status and acceptance", "owner": "project-manager", "collaborators": ["phase contributors", "quality-engineer", "security-engineer", "Boss"], "writeDomain": "phase status and acceptance record", "approvalAuthority": "project-manager; Boss when scope or material risk changes", "requiredEvidence": ["task completion", "success goals", "verification", "residual risks"]},
      {"section": "Task status and execution report", "owner": "project-manager", "collaborators": ["assigned task owner", "quality-engineer", "relevant specialists"], "writeDomain": "task-scoped status and evidence; PM reconciliation", "approvalAuthority": "assigned owner for evidence; project-manager for authoritative state", "requiredEvidence": ["owner", "assigned actor", "files or artifacts", "commands and results", "risks"]},
      {"section": "Task scope and acceptance conditions", "owner": "project-manager", "collaborators": ["requirements-engineer", "implementation-engineer", "quality-engineer"], "writeDomain": "task scope and acceptance", "approvalAuthority": "project-manager; Boss for accepted-scope changes", "requiredEvidence": ["bounded files", "acceptance conditions", "dependencies"]},
      {"section": "Open Questions / Decisions", "owner": "project-manager", "collaborators": ["product-owner", "technical-architect", "requirements-engineer", "Boss"], "writeDomain": "decision and approval records", "approvalAuthority": "Boss for human decisions and approvals", "requiredEvidence": ["decision ID", "options", "recommendation", "response", "plan update"]},
      {"section": "Documentation Impact", "owner": "documentation-specialist", "collaborators": ["project-manager", "affected specialist roles"], "writeDomain": "plan documentation-impact notes", "approvalAuthority": "documentation-specialist; domain owner for technical truth", "requiredEvidence": ["docs reviewed", "changed or deferred docs", "links or placement"]},
      {"section": "Product Readiness", "owner": "product-owner", "collaborators": ["release-engineer", "quality-engineer", "Boss"], "writeDomain": "readiness assessment", "approvalAuthority": "Boss for final acceptance", "requiredEvidence": ["readiness category", "acceptance signals", "known gaps"]},
      {"section": "Operator Closeout Summary", "owner": "project-manager", "collaborators": ["quality-engineer", "security-engineer", "documentation-specialist"], "writeDomain": "execution closeout summary", "approvalAuthority": "project-manager; Boss for closeout", "requiredEvidence": ["behavior changed", "boundaries", "failure modes", "verification", "manual needs"]},
      {"section": "Risks", "owner": "project-manager", "collaborators": ["security-engineer", "quality-engineer", "technical-architect", "affected owners"], "writeDomain": "plan risks and follow-on work", "approvalAuthority": "project-manager; Boss for material residual risk", "requiredEvidence": ["risk", "impact", "mitigation", "owner", "follow-up"]},
      {"section": "Security Review", "owner": "security-engineer", "collaborators": ["technical-architect", "quality-engineer", "project-manager"], "writeDomain": "security findings and mitigations in plan", "approvalAuthority": "security-engineer; Boss for waivers", "requiredEvidence": ["findings", "threats", "mitigations", "unresolved risk"]},
      {"section": "Lessons To Carry Forward", "owner": "project-manager", "collaborators": ["any contributing role"], "writeDomain": "reusable lessons", "approvalAuthority": "project-manager", "requiredEvidence": ["reusable lesson", "affected workflow or practice"]},
      {"section": "Completion Checklist", "owner": "project-manager", "collaborators": ["quality-engineer", "security-engineer", "documentation-specialist", "Boss"], "writeDomain": "completion evidence and checklist", "approvalAuthority": "Boss for final closeout", "requiredEvidence": ["all tasks", "verification", "documentation promotion", "human acceptance"]}
    ],
    "gateOwners": [
      {"gate": "Routing", "owner": "project-manager", "collaborators": ["relevant roles"], "authority": "agent-controlled", "approvalAuthority": "none", "requiredEvidence": ["work mode", "selected plan", "role routing"]},
      {"gate": "Vision", "owner": "product-owner", "collaborators": ["requirements-engineer", "project-manager"], "authority": "human-approval", "approvalAuthority": "Boss", "requiredEvidence": ["approval ID", "approver", "timestamp", "decision", "scope conditions"]},
      {"gate": "Design Intent", "owner": "product-owner", "collaborators": ["requirements-engineer", "technical-architect", "security-engineer", "quality-engineer"], "authority": "human-approval", "approvalAuthority": "Boss", "requiredEvidence": ["accepted intent", "approval record", "review findings"]},
      {"gate": "Plan", "owner": "project-manager", "collaborators": ["technical-architect", "requirements-engineer", "quality-engineer"], "authority": "human-approval", "approvalAuthority": "Boss", "requiredEvidence": ["ordered tasks", "dependencies", "owners", "verification"]},
      {"gate": "Activation", "owner": "project-manager", "collaborators": ["Boss"], "authority": "human-approval", "approvalAuthority": "Boss", "requiredEvidence": ["explicit activation", "approval record", "scope conditions"]},
      {"gate": "Task Start", "owner": "assigned task owner", "collaborators": ["project-manager"], "authority": "agent-controlled", "approvalAuthority": "none", "requiredEvidence": ["🟨 marker", "owner", "assigned actor", "start timestamp"]},
      {"gate": "Task Completion", "owner": "assigned task owner", "collaborators": ["quality-engineer", "project-manager"], "authority": "agent-controlled", "approvalAuthority": "none", "requiredEvidence": ["implementation evidence", "verification results", "✅ or ⚠️ marker", "completion timestamp"]},
      {"gate": "Phase Close", "owner": "project-manager", "collaborators": ["quality-engineer", "security-engineer", "phase contributors"], "authority": "agent-controlled", "approvalAuthority": "none unless scope or material risk changes", "requiredEvidence": ["all tasks", "success goals", "verification", "follow-on risks"]},
      {"gate": "Plan Close", "owner": "project-manager", "collaborators": ["quality-engineer", "security-engineer", "documentation-specialist", "Boss"], "authority": "human-approval", "approvalAuthority": "Boss", "requiredEvidence": ["human validation", "design promotion", "documentation refresh", "closeout approval"]}
    ],
    "handoffConflictContract": {
      "phaseDrafting": {
        "owner": "project-manager",
        "delegatedContributorMay": ["propose bounded phase sequencing", "draft task boundaries and verification expectations", "report assumptions and unresolved questions"],
        "delegatedContributorMayNot": ["change accepted intent", "change phase or gate status", "edit unrelated sections", "advance Phase 2+ mechanics during Phase 1"],
        "handoffRecord": ["plan and phase identifier", "section owner", "assigned contributor or run ID", "accepted constraints", "expected outputs", "evidence requirements"]
      },
      "taskReporting": {
        "owner": "assigned-task-owner",
        "allowedUpdate": ["assigned task marker", "assignment metadata", "execution evidence", "verification results", "documentation impact", "residual risk"],
        "requiredEvidence": ["owner", "assigned actor", "status transition", "timestamp", "files or artifacts", "commands and results", "residual risks"]
      },
      "validation": {
        "owner": "quality-engineer",
        "may": ["review task evidence", "record validation result and timestamp", "identify gaps or recommend blocked status"],
        "mayNot": ["expand task scope", "rewrite accepted intent", "silently accept material residual risk"]
      },
      "reconciliation": {
        "owner": "project-manager",
        "responsibilities": ["compare delegated report with task scope and validation", "resolve dependencies and authoritative plan state", "preserve conflicting records and rationale"],
        "conflictResolution": ["fail closed on overlapping or stale edits", "request clarification or use a recorded bounded decision", "escalate scope, design, safety, material-risk, or human-approval conflicts to Boss"],
        "requiredRecord": ["actor", "timestamp", "affected task or phase", "conflict or decision", "resolution", "evidence reference"]
      }
    },
    "planningWritePolicy": {
      "projectManager": ["all plan sections for reconciliation and lifecycle state"],
      "sectionOwners": ["their owned section within the active plan"],
      "assignedTaskOwner": ["only localized assigned-task status and execution evidence"],
      "collaborators": ["bounded recommendations or drafts within the owner's domain"],
      "deniedByDefault": ["unassigned sections", "accepted design intent without owner review", "Phase 2+ tasks", "workflow runtime mechanics"]
    }
  }
}
-->

The project-manager should load this roster first, then load only the selected
role and guidance documents for a bounded delegation.
