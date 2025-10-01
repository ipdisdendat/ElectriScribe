# ElectriScribe Python Analysis API Setup

## Overview

The Python Analysis API provides advanced electrical constraint validation, holistic scoring, and field notes processing capabilities using sophisticated multi-dimensional analysis engines.

## Prerequisites

- Python 3.10 or higher
- pip (Python package installer)

## Installation

1. **Create a virtual environment** (recommended):

```bash
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

2. **Install dependencies**:

```bash
pip install -r requirements.txt
```

## Running the API Server

### Development Mode

```bash
# From the project root directory
cd src/services/analysis
python api_server.py
```

The API server will start on `http://localhost:8000`

### Production Mode

```bash
# Using uvicorn directly
uvicorn src.services.analysis.api_server:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Health Check
- **GET** `/health`
- Returns server status and engine availability

### Holistic Validation
- **POST** `/api/v1/validate/holistic`
- Performs multi-dimensional constraint validation with emergent behavior detection
- Request body: `SystemStateRequest`
- Returns: `ConstraintValidationResponse`

### Circuit Validation
- **POST** `/api/v1/validate/circuit`
- Validates electrical circuits against NEC standards
- Request body: `CircuitDataRequest`
- Returns: Circuit validation report with thermal, voltage drop, and harmonic analysis

### Field Notes Processing
- **POST** `/api/v1/process/field-notes`
- Parses unstructured field notes into validated electrical entities
- Request body: `FieldNotesRequest`
- Returns: Parsed entities with constraint validation results

### Complexity Analysis
- **GET** `/api/v1/analysis/complexity`
- Calculates multi-dimensional complexity metrics
- Query params: `electrical_dimension`, `thermal_dimension`, `harmonic_dimension`
- Returns: `ComplexityMetrics`

### Real-Time Monitoring
- **WebSocket** `/ws/monitor/{circuit_id}`
- Streams real-time measurements and constraint violations

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:8000/health

# Get API info
curl http://localhost:8000/
```

### Using the Frontend

Once the Python API is running, the frontend will automatically connect to it via the TypeScript client wrapper.

## Configuration

The API uses environment variables from the frontend's `.env` file:

```env
VITE_PYTHON_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## Architecture

The Python Analysis API integrates with:

1. **Enhanced Holistic Scoring System**: Multi-dimensional constraint validation with phase space analysis
2. **Electrical System Analyzer**: NEC-compliant circuit validation with thermal and voltage drop analysis
3. **Supabase Bridge**: Real-time field notes parsing and entity extraction
4. **Frontend TypeScript Client**: Seamless integration via REST and WebSocket

## Key Features

- **Multi-Dimensional Complexity Analysis**: 6-dimensional analysis (computational, electrical, systemic, temporal, epistemic, adaptive)
- **Emergent Behavior Detection**: Oscillations, bifurcations, phase transitions, self-organization
- **Phase Space Analysis**: Trajectory classification, Lyapunov exponent estimation, attractor detection
- **Adaptive Learning**: Constraint weight evolution based on observed outcomes
- **Cascading Risk Assessment**: Network-based impact analysis with temporal urgency scoring

## Troubleshooting

### Import Errors

If you encounter import errors, ensure you're running the server from the correct directory and that all dependencies are installed.

### Port Already in Use

If port 8000 is already in use, modify the port in:
- `api_server.py` (last line)
- `.env` file (`VITE_PYTHON_API_URL`)

### Supabase Connection Issues

Verify your Supabase credentials in the `.env` file are correct and that the Supabase project is accessible.

## Development

### Adding New Endpoints

1. Define request/response models using Pydantic
2. Create endpoint handler in `api_server.py`
3. Add corresponding TypeScript types in `python-analysis-client.ts`
4. Update this documentation

### Running Tests

```bash
# Unit tests
pytest src/services/analysis/tests/

# Integration tests
pytest src/services/analysis/tests/integration/
```

## Deployment

For production deployment, consider:

1. **Docker**: Containerize the Python API
2. **Process Manager**: Use PM2 or systemd for process management
3. **Reverse Proxy**: nginx or Traefik for SSL and load balancing
4. **Monitoring**: Prometheus + Grafana for metrics
5. **Logging**: Structured logging with ELK stack or similar

## Support

For issues or questions, check:
- API documentation: `http://localhost:8000/docs`
- FastAPI documentation: https://fastapi.tiangolo.com/
- Project documentation in `/docs`
