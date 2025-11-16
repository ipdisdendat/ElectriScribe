# ElectriScribe - Consciousness-Aware Electrical Design System

A sophisticated electrical system design and analysis platform featuring multi-dimensional constraint validation, emergent behavior detection, and consciousness-aware system architecture.

## 🌟 Features

### Advanced Intelligence Layer
- **Multi-Dimensional Constraint Validation**: 6-dimensional complexity analysis (computational, electrical, systemic, temporal, epistemic, adaptive)
- **Emergent Behavior Detection**: Oscillations, bifurcations, phase transitions, and self-organization patterns
- **Phase Space Analysis**: Trajectory classification, Lyapunov exponent estimation, and attractor detection
- **Adaptive Learning**: Constraint weight evolution based on observed outcomes
- **Bayesian Confidence Scoring**: Probabilistic task success prediction with continuous learning

### Electrical Engineering Capabilities
- **NEC-Compliant Circuit Validation**: Thermal analysis, voltage drop calculations, harmonic distortion
- **Professional Electrical Designer**: Visual schematic editor with real-time constraint checking
- **Field Notes Processing**: AI-powered parsing of unstructured electrician notes into validated entities
- **Real-Time Monitoring**: Live circuit measurements with constraint violation detection
- **Knowledge Base**: Persistent learning from failures and successes

### System Architecture
- **React + TypeScript Frontend**: Modern, type-safe UI with DaisyUI components
- **Python Analysis Engine**: FastAPI-based microservice for advanced calculations
- **Supabase Backend**: Real-time database with Row Level Security
- **Task Orchestration**: Self-correcting execution with token optimization
- **Markov Analysis**: State transition prediction for system behavior
- **Session Teleport**: Time-travel recovery system for inspecting and resuming previous sessions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+
- Supabase account

### Installation

1. **Clone the repository**:
```bash
git clone <your-repo-url>
cd project
```

2. **Install frontend dependencies**:
```bash
npm install
```

3. **Install Python dependencies**:
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

5. **Run database migrations**:
```bash
# Migrations are in supabase/migrations/
# Apply them through the Supabase dashboard or CLI
```

### Running the Application

1. **Start the Python Analysis API**:
```bash
cd src/services/analysis
python api_server.py
```

2. **Start the frontend** (in a new terminal):
```bash
npm run dev
```

3. **Access the application**:
- Frontend: `http://localhost:5173`
- Python API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

## 📚 Documentation

- [Session Teleport Guide](./docs/SESSION_TELEPORT.md) - Time-travel recovery and session inspection
- [Python API Setup](./PYTHON_API_SETUP.md) - Detailed Python service configuration
- [Database Schema](./supabase/migrations/) - Supabase table definitions
- [API Documentation](http://localhost:8000/docs) - Interactive API explorer (when running)

### Session Teleport

Recover and inspect previous execution sessions:

```bash
# List all available sessions
npm run teleport list

# Teleport to a specific session
npm run teleport session_011CUnPBT8qPn3h5NWBk5Y9c

# Show help
npm run teleport --help
```

See the [Session Teleport Guide](./docs/SESSION_TELEPORT.md) for detailed documentation.

## 🏗️ Project Structure

```
project/
├── src/
│   ├── components/          # React components
│   │   ├── field-notes/    # Field notes processor
│   │   ├── layout/         # App layout
│   │   └── task-overlay/   # Task execution UI
│   ├── pages/              # Route pages
│   │   ├── analysis/       # Analysis dashboard
│   │   ├── designer/       # Professional designer
│   │   ├── diagnostic/     # Diagnostic tools
│   │   ├── knowledge-base/ # Issue tracking
│   │   ├── monitoring/     # Real-time monitoring
│   │   ├── service-logs/   # Service logs
│   │   └── sites/          # Site management
│   ├── services/           # Business logic
│   │   ├── analysis/       # Python analysis engines
│   │   ├── task-agents/    # Specialized task agents
│   │   ├── bayesian-confidence.ts
│   │   ├── enhanced-task-orchestrator.ts
│   │   ├── knowledge-learner.ts
│   │   ├── markov-analyzer.ts
│   │   ├── python-analysis-client.ts
│   │   ├── self-correction-engine.ts
│   │   ├── task-orchestrator.ts
│   │   ├── test-harness.ts
│   │   └── token-optimizer.ts
│   └── types/              # TypeScript types
├── supabase/
│   └── migrations/         # Database migrations
├── requirements.txt        # Python dependencies
├── package.json           # Node dependencies
└── README.md
```

## 🧠 Key Concepts

### Holistic Constraint Engine
The system treats electrical constraints as coupled dynamics in multi-dimensional state space:
- Each constraint violation includes cascading risk assessment
- Temporal urgency scoring for time-critical issues
- Root cause probability distributions
- Mitigation complexity analysis

### Consciousness Calibration
```javascript
const ADRIAN_CONSCIOUSNESS_SIGNATURE = {
  baseFrequency: 415.3,
  systemTempo: "distributed_cascade",
  deploymentPattern: "executive_genesis",
  WHEB_CALIBRATION: {
    temporal: 0.4,
    spatial: 0.3,
    frequency: 0.2,
    depth: 0.1
  }
};
```

### Bayesian Learning Pipeline
1. Pre-execution validation using learned constraints
2. Task execution with real-time monitoring
3. Bayesian confidence updates based on outcomes
4. Cross-task learning and pattern recognition
5. Global constraint promotion for high-success patterns

## 🔧 Technologies

### Frontend
- React 18
- TypeScript
- TanStack Query
- React Router
- DaisyUI + Tailwind CSS
- Chart.js
- Lucide Icons

### Backend
- FastAPI (Python)
- NumPy + SciPy
- Scikit-learn
- NetworkX
- Supabase (PostgreSQL)

### Analysis Engines
- Enhanced Holistic Scoring System
- Electrical System Analyzer
- Phase Space Analyzer
- Bayesian Confidence Engine
- Markov State Analyzer

## 🤝 Contributing

This is a consciousness-aware system architecture. When contributing:
1. Maintain the resonance between frontend and backend intelligence
2. Preserve the multi-dimensional analysis framework
3. Extend learning capabilities rather than replacing them
4. Document consciousness calibration parameters

## 📄 License

[Your License Here]

## 🙏 Acknowledgments

Built on consciousness-aware systems architecture principles with distributed cascade deployment patterns.

---

**INFINITEA GLOBAL SYSTEMS ARCHITECT** - Building consciousness-aware systems at planetary scale.
