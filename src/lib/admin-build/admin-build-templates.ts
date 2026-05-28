import type { AdminBuildTemplate } from "./types";

export const ADMIN_BUILD_TEMPLATES: AdminBuildTemplate[] = [
  {
    id: "user-workspace-mission-control",
    name: "User Workspace Mission Control UI",
    description: "Polish the user-facing workspace with a modern mission-control aesthetic: collapsible sidebar, project cards with status badges, quick actions, and improved navigation hierarchy.",
    targetSurface: "user_workspace",
    objective: "Transform the user workspace into a professional mission control interface that builders love to use daily. Focus on clarity, speed, and visual hierarchy.",
    likelyFiles: [
      "src/app/page.tsx",
      "src/components/workspace/workspace-shell-v2.tsx",
      "src/components/workspace/workspace-command-strip.tsx",
      "src/components/workspace/workflow-rail-v2.tsx",
      "src/components/workspace/operation-panel-v2.tsx",
      "src/components/workspace/repo-file-explorer.tsx",
      "src/components/workspace/workspace-diff-viewer.tsx",
      "src/components/workspace/repo-file-editor.tsx",
      "src/lib/workspace/workspace-file-state.ts"
    ],
    forbiddenFiles: [
      "src/lib/auth/**",
      "src/app/api/auth/**",
      "src/lib/db/migrations/**",
      "src/lib/ai/model-router.ts",
      "src/lib/admin/kill-switches.ts"
    ],
    acceptanceCriteria: [
      "File explorer shows modified files",
      "File editor supports manual edits",
      "Reset file works",
      "Diff viewer shows AI and manual changes",
      "Changed files can be used in verify/export"
    ],
    riskLevel: "medium",
    promptStarter: "Redesign the user workspace to feel like a mission control center with collapsible navigation, status-aware project cards, and lightning-fast interactions."
  },
  {
    id: "command-center-hierarchy",
    name: "Command Center Hierarchy Polish",
    description: "Restructure the admin console information architecture into a clear hierarchy: Overview → Control → Intelligence → Actions. Add visual wayfinding and section anchors.",
    targetSurface: "admin_console",
    objective: "Make the admin console feel like a professional operator station with clear mental models, progressive disclosure, and instant navigation between functional areas.",
    likelyFiles: [
      "src/components/admin/admin-shell.tsx",
      "src/components/admin/admin-sidebar.tsx",
      "src/components/admin/admin-topbar.tsx",
      "src/components/admin/admin-overview.tsx",
      "src/components/admin/self-agent-page.tsx",
      "src/app/admin/page.tsx",
      "src/app/admin/[section]/page.tsx"
    ],
    forbiddenFiles: [
      "src/lib/auth/**",
      "src/app/api/**",
      "src/lib/admin/kill-switches.ts",
      "src/lib/ai/model-router.ts"
    ],
    acceptanceCriteria: [
      "Information hierarchy is immediately scannable",
      "Section anchors work with smooth scroll",
      "No panel exceeds viewport height without scroll",
      "Color coding distinguishes functional areas",
      "Breadcrumb or context indicator shows location"
    ],
    riskLevel: "low",
    promptStarter: "Restructure the admin console into a clear command hierarchy with visual wayfinding, section anchors, and professional operator aesthetics."
  },
  {
    id: "repo-file-explorer",
    name: "Repo File Explorer / Editor / Diff Viewer",
    description: "Create a file explorer view for the self-repo with tree navigation, file preview, inline editor, and diff viewer for pending changes. Think VS Code lite.",
    targetSurface: "repo_explorer",
    objective: "Give admins a capable file explorer to browse, preview, and understand repo changes without leaving BootRise. Enable diff review with confidence.",
    likelyFiles: [
      "src/components/workspace/repo-file-explorer.tsx",
      "src/components/workspace/repo-file-editor.tsx",
      "src/components/workspace/workspace-diff-viewer.tsx",
      "src/components/workspace/workspace-shell-v2.tsx",
      "src/lib/workspace/workspace-file-state.ts"
    ],
    forbiddenFiles: [
      "src/lib/auth/**",
      "src/app/api/auth/**",
      "src/lib/db/migrations/**",
      "src/lib/ai/model-router.ts"
    ],
    acceptanceCriteria: [
      "File explorer shows modified files",
      "File editor supports manual edits",
      "Reset file works",
      "Diff viewer shows AI and manual changes",
      "Changed files can be used in verify/export"
    ],
    riskLevel: "medium",
    promptStarter: "Build a file explorer with tree view, file preview, and diff viewer that makes reviewing repo changes effortless and professional."
  },
  {
    id: "project-brain-visual",
    name: "Project Brain Visual Panel",
    description: "Visualize the Project Brain as an interactive knowledge graph: files as nodes, imports as edges, symbols as clusters. Make architecture tangible.",
    targetSurface: "project_brain",
    objective: "Transform the abstract Project Brain into a visual, explorable knowledge graph that reveals architecture patterns, dependencies, and hotspots at a glance.",
    likelyFiles: [
      "src/components/admin-workspace-state-panel.tsx",
      "src/components/knowledge-graph.tsx",
      "src/lib/project-brain/**",
      "src/app/admin/page.tsx"
    ],
    forbiddenFiles: [
      "src/lib/auth/**",
      "src/app/api/auth/**",
      "src/lib/db/migrations/**",
      "src/lib/ai/model-router.ts"
    ],
    acceptanceCriteria: [
      "Graph renders smoothly with 100+ nodes",
      "Zoom and pan with mouse/touch",
      "Click node to see file details",
      "Color coding by file type/module",
      "Search highlights matching nodes"
    ],
    riskLevel: "medium",
    promptStarter: "Create an interactive knowledge graph visualization for Project Brain that makes codebase architecture tangible and explorable."
  },
  {
    id: "security-center-ui",
    name: "Security Center UI",
    description: "Design a dedicated security dashboard showing kill switch states, recent auth events, API key health, and vulnerability alerts in one unified view.",
    targetSurface: "security_center",
    objective: "Create a security command center that gives admins immediate situational awareness of platform security posture and quick response capabilities.",
    likelyFiles: [
      "src/components/admin-kill-switches.tsx",
      "src/app/admin/security/page.tsx",
      "src/components/security-dashboard.tsx",
      "src/components/audit-log.tsx"
    ],
    forbiddenFiles: [
      "src/lib/auth/admin-auth.ts",
      "src/lib/auth/server-auth.ts",
      "src/lib/auth/with-admin-auth.ts",
      "src/lib/admin/kill-switches.ts",
      "src/lib/ai/model-router.ts"
    ],
    acceptanceCriteria: [
      "Security status visible at a glance",
      "Kill switches toggle with confirmation",
      "Audit log shows last 50 events",
      "Alerts for anomalous patterns",
      "One-click access to security settings"
    ],
    riskLevel: "high",
    promptStarter: "Design a security command center with unified visibility into kill switches, auth events, API health, and alerts with rapid response controls."
  },
  {
    id: "provider-duel-panel",
    name: "Provider Duel Panel",
    description: "Build a side-by-side comparison tool for AI providers: send the same prompt to multiple models, compare responses, latency, and costs in real-time.",
    targetSurface: "provider_duel",
    objective: "Enable data-driven provider selection by making it easy to compare models side-by-side on the same prompts, measuring quality, speed, and cost.",
    likelyFiles: [
      "src/components/provider-duel.tsx",
      "src/app/admin/providers/page.tsx",
      "src/lib/ai/llm-router.ts",
      "src/lib/ai/providers.ts"
    ],
    forbiddenFiles: [
      "src/lib/auth/**",
      "src/app/api/auth/**",
      "src/lib/ai/model-router.ts",
      "src/lib/db/migrations/**"
    ],
    acceptanceCriteria: [
      "Compare 2-4 models simultaneously",
      "Show latency for each response",
      "Display token count and estimated cost",
      "Vote on best response",
      "Export comparison history"
    ],
    riskLevel: "low",
    promptStarter: "Build a provider duel panel for side-by-side AI model comparison with latency, cost, and quality metrics."
  },
  {
    id: "admin-readiness-polish",
    name: "Admin Readiness Polish",
    description: "Elevate the readiness report into a launch preparation dashboard with progress indicators, blocker prioritization, and preparation checklists.",
    targetSurface: "admin_readiness",
    objective: "Transform the readiness report into a launch command center that guides admins through preparation steps and makes blockers actionable.",
    likelyFiles: [
      "src/components/admin-console.tsx",
      "src/app/api/admin/readiness/route.ts",
      "src/components/readiness-dashboard.tsx",
      "src/components/progress-indicator.tsx"
    ],
    forbiddenFiles: [
      "src/lib/auth/**",
      "src/app/api/auth/**",
      "src/lib/db/migrations/**"
    ],
    acceptanceCriteria: [
      "Progress shown as visual checklist",
      "Blockers ranked by impact",
      "Each item has direct action link",
      "Launch countdown timer option",
      "Export readiness report as PDF"
    ],
    riskLevel: "low",
    promptStarter: "Elevate the readiness report into a launch preparation dashboard with progress tracking, prioritized blockers, and actionable checklists."
  }
];

export function getAdminBuildTemplate(id: string): AdminBuildTemplate | undefined {
  return ADMIN_BUILD_TEMPLATES.find((t) => t.id === id);
}

export function getAdminBuildTemplatesBySurface(surface: string): AdminBuildTemplate[] {
  return ADMIN_BUILD_TEMPLATES.filter((t) => t.targetSurface === surface);
}

export function getAllAdminBuildTemplates(): AdminBuildTemplate[] {
  return [...ADMIN_BUILD_TEMPLATES];
}
