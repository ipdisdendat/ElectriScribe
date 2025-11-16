# ElectriScribe Archive

**Archive Date:** 2025-11-16
**Archive Branch:** claude/opinions-feature-011CUnPBT8qPn3h5NWBk5Y9c

## Overview

This directory contains features and components that have been archived to focus on the MVP (Minimum Viable Product) version of ElectriScribe. These files are preserved (not deleted) for potential restoration in Phase 2+ of development.

## What's Archived

### Pages (10 files)

#### Designer Pages (`pages/designer/`)
- **ProfessionalElectricalDesigner.tsx** - Advanced electrical design interface with professional features
- **FlowchartDesigner.tsx** - Flowchart-based electrical system designer
- **SimpleElectricalBuilder.tsx** - Simplified electrical circuit builder interface

#### Monitoring & Diagnostics (`pages/monitoring/`, `pages/diagnostic/`)
- **MonitoringPage.tsx** - Real-time system monitoring dashboard
- **DiagnosticPage.tsx** - System diagnostics and health checks

#### Knowledge Management (`pages/knowledge-base/`)
- **KnowledgeBasePage.tsx** - Knowledge base main page with issue tracking
- **IssueDetailPage.tsx** - Detailed view for individual electrical issues

#### Service Management (`pages/service-logs/`, `pages/sites/`)
- **ServiceLogsPage.tsx** - Service log viewing and management
- **SitesPage.tsx** - Site management interface

#### Analysis (`pages/analysis/`)
- **AnalysisPage.tsx** - Advanced electrical system analysis dashboard

### Services (13 files)

#### Task Orchestration
- **task-orchestrator.ts** - Original task orchestration service
- **enhanced-task-orchestrator.ts** - Enhanced task orchestration with advanced features
- **task-agents/** (directory with 4 files)
  - `base-agent.ts` - Base agent class for task delegation
  - `index.ts` - Agent exports
  - `electrical-validation-agent.ts` - Electrical validation specialist agent
  - `database-query-agent.ts` - Database query specialist agent

#### AI/ML Services
- **bayesian-confidence.ts** - Bayesian confidence scoring for electrical analysis
- **markov-analyzer.ts** - Markov chain analysis for system behavior
- **knowledge-learner.ts** - Machine learning knowledge base builder
- **self-correction-engine.ts** - Self-correcting analysis engine

#### Optimization & Testing
- **token-optimizer.ts** - LLM token usage optimization
- **test-harness.ts** - Testing framework for electrical calculations

#### Python Backend Integration (Phase 3)
- **python-analysis-client.ts** - TypeScript client for Python FastAPI backend (3,136 lines of NEC validation code). Archived in Phase 3 as part of complexity reduction.

### Components (2 files)

#### Overlays (`components/task-overlay/`)
- **TaskOverlay.tsx** - Task management overlay interface

#### Field Notes (`components/field-notes/`)
- **FieldNotesProcessor.tsx** - Python backend field notes processor component (unused, depends on archived Python API client). Archived in Phase 3.

### Hooks (1 file)

#### Electrical Validation (`hooks/`)
- **useElectricalValidation.ts** - React hook for electrical validation using task orchestration (depends on archived task-agents)

## Why Archived

These features were archived to:

1. **Focus on MVP Core** - Concentrate development efforts on the essential ElectriScribe designer functionality
2. **Reduce Complexity** - Simplify the codebase during initial development phases
3. **Prevent Feature Creep** - Avoid over-engineering before validating core product-market fit
4. **Improve Maintainability** - Reduce the surface area for bugs and technical debt
5. **Accelerate Iteration** - Enable faster iteration on core features without legacy baggage

## MVP Focus

The MVP retains only:
- **ElectriScribeDesigner** - The core field notes parser and electrical design interface
- **Essential Services** - field-notes-parser, field-notes-persistence, enhanced-electrical-analysis
- **Core Layout** - Basic layout and routing infrastructure

## When to Restore

These features can be restored in:

### Phase 2 (Post-MVP Launch)
- Knowledge Base system (KnowledgeBasePage, IssueDetailPage)
- Basic monitoring (MonitoringPage)
- Site management (SitesPage)

### Phase 3 (Advanced Features)
- Advanced designer variants (ProfessionalElectricalDesigner, FlowchartDesigner)
- Enhanced task orchestration system
- Task agents framework
- Self-correction and learning systems

### Phase 4 (Enterprise Features)
- Full diagnostic suite
- Advanced analysis dashboards
- Service log management
- AI/ML optimization features

## How to Restore

When ready to restore a feature:

1. **Move Files Back**
   ```bash
   # Example: Restore KnowledgeBasePage
   mv src/archive/pages/knowledge-base/KnowledgeBasePage.tsx src/pages/knowledge-base/
   ```

2. **Update Imports**
   ```typescript
   // In App.tsx or other files
   import KnowledgeBasePage from './pages/knowledge-base/KnowledgeBasePage';
   ```

3. **Restore Routes**
   ```typescript
   // In App.tsx
   <Route path="knowledge-base" element={<KnowledgeBasePage />} />
   ```

4. **Check Dependencies**
   - Verify all imported services exist or restore them too
   - Update any API changes that occurred during archival
   - Test thoroughly in isolated feature branch

5. **Update Tests**
   - Restore associated test files
   - Update test snapshots if UI has changed
   - Verify integration with current codebase

## Dependency Notes

### Services with Cross-Dependencies

Some archived services depend on each other:

- **enhanced-task-orchestrator.ts** uses:
  - bayesian-confidence.ts
  - markov-analyzer.ts
  - knowledge-learner.ts
  - self-correction-engine.ts
  - task-agents/

- **ElectriScribeDesigner.tsx** (kept in MVP) references:
  - enhanced-task-orchestrator.ts (archived) - may need refactoring

### Breaking Changes to Watch For

When restoring, be aware that:

1. **Database Schema** - May have evolved since archival
2. **API Contracts** - Service interfaces may have changed
3. **Component Props** - Layout/component APIs may differ
4. **Routing** - Navigation patterns may have been updated
5. **State Management** - Global state architecture may have changed

## Archive Structure

```
src/archive/
├── README.md                        (this file)
├── pages/
│   ├── designer/
│   │   ├── ProfessionalElectricalDesigner.tsx
│   │   ├── FlowchartDesigner.tsx
│   │   └── SimpleElectricalBuilder.tsx
│   ├── monitoring/
│   │   └── MonitoringPage.tsx
│   ├── diagnostic/
│   │   └── DiagnosticPage.tsx
│   ├── knowledge-base/
│   │   ├── KnowledgeBasePage.tsx
│   │   └── IssueDetailPage.tsx
│   ├── service-logs/
│   │   └── ServiceLogsPage.tsx
│   ├── analysis/
│   │   └── AnalysisPage.tsx
│   └── sites/
│       └── SitesPage.tsx
├── services/
│   ├── task-orchestrator.ts
│   ├── enhanced-task-orchestrator.ts
│   ├── bayesian-confidence.ts
│   ├── markov-analyzer.ts
│   ├── knowledge-learner.ts
│   ├── self-correction-engine.ts
│   ├── token-optimizer.ts
│   ├── test-harness.ts
│   ├── python-analysis-client.ts
│   └── task-agents/
│       ├── base-agent.ts
│       ├── index.ts
│       ├── electrical-validation-agent.ts
│       └── database-query-agent.ts
├── components/
│   ├── task-overlay/
│   │   └── TaskOverlay.tsx
│   └── field-notes/
│       └── FieldNotesProcessor.tsx
└── hooks/
    └── useElectricalValidation.ts
```

## Maintenance

- **Do not delete** files from this archive without team consensus
- **Document thoroughly** any partial restorations
- **Keep this README updated** when archive contents change
- **Track in git** all archive operations for audit trail

## Contact

For questions about archived features or restoration requests, consult:
- Product roadmap documentation
- Technical architecture documentation
- Development team lead

---

**Last Updated:** 2025-11-16
**Total Files Archived:** 26 (10 pages + 13 services + 2 components + 1 hook)
