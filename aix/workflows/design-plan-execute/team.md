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
| `product-strategist` | Product Strategist | `roles/project-dev/product-strategist` | Reviews product value, prioritization, scope decisions, and product risks. |
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
  "version": "1",
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
      "name": "product-strategist",
      "displayName": "Product Strategist",
      "directory": "roles/project-dev/product-strategist",
      "responsibilities": ["product value", "prioritization", "scope decisions"],
      "taskModes": ["scout", "review", "verification"],
      "deliveryModes": ["report-only"],
      "writeDomains": [],
      "deniedAreas": ["src/", "tests/", "_docs/"],
      "requiredCapabilities": ["correlated-results"],
      "requiredEvidence": ["recommendation", "tradeoffs", "scope risks"],
      "sharedArtifacts": [], "readOnly": true, "serialization": "none"
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
  ]
}
-->

The project-manager should load this roster first, then load only the selected
role and guidance documents for a bounded delegation.
