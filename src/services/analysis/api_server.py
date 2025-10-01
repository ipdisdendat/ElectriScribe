"""
FastAPI REST API Server for ElectriScribe Analysis Engines
Exposes Python constraint validation and holistic scoring to TypeScript frontend
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import asyncio
import json
from datetime import datetime
import numpy as np

# Import analysis engines
from enhanced_holistic_scoring_system import (
    HolisticConstraintEngine,
    SystemState,
    ConstraintViolation,
    ComplexityMetric
)
from electrical_system_analyzer import (
    ElectricalSystemAnalyzer,
    CircuitData,
    LoadData,
    ProtectionDevice,
    LoadType,
    CircuitType,
    ProtectionType
)
from supabase_electriscribe_bridge import (
    SupabaseElectriScribeBridge,
    RealTimeElectricalMonitor
)

# Initialize FastAPI app
app = FastAPI(
    title="ElectriScribe Analysis API",
    description="Advanced electrical system constraint validation and holistic scoring",
    version="1.0.0"
)

# CORS configuration for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize analysis engines
holistic_engine = HolisticConstraintEngine()
electrical_analyzer = ElectricalSystemAnalyzer()
active_monitors: Dict[str, RealTimeElectricalMonitor] = {}

# =============================================================================
# PYDANTIC MODELS FOR REQUEST/RESPONSE
# =============================================================================

class SystemStateRequest(BaseModel):
    electrical_state: Dict[str, float]
    thermal_state: Dict[str, float]
    harmonic_state: Dict[str, float]
    load_state: Dict[str, float]
    constraint_satisfaction: Dict[str, float] = Field(default_factory=dict)
    emergent_properties: Dict[str, Any] = Field(default_factory=dict)
    stability_metrics: Dict[str, float] = Field(default_factory=dict)

class LoadDataRequest(BaseModel):
    load_id: str
    load_type: str
    nominal_voltage: float
    nominal_current: float
    nominal_power: float
    power_factor: float
    starting_current_multiplier: float
    diversity_factor: float
    critical_load: bool
    harmonic_content: Dict[int, float] = Field(default_factory=dict)
    operating_schedule: List[float] = Field(default_factory=lambda: [0.5] * 24)

class ProtectionDeviceRequest(BaseModel):
    device_id: str
    protection_type: str
    current_rating: float
    voltage_rating: float
    interrupting_rating: float
    trip_curve_type: str
    instantaneous_trip_multiplier: float
    time_delay_characteristics: Dict[str, float]

class CircuitDataRequest(BaseModel):
    circuit_id: str
    circuit_type: str
    wire_awg: str
    wire_length_ft: float
    conduit_fill_percentage: float
    ambient_temperature_c: float
    number_of_conductors: int
    voltage_rating: float
    loads: List[LoadDataRequest]
    protection_device: ProtectionDeviceRequest
    parent_circuit_id: Optional[str] = None

class FieldNotesRequest(BaseModel):
    raw_notes: str
    site_id: str
    supabase_url: str
    supabase_key: str

class ConstraintValidationResponse(BaseModel):
    holistic_score: float
    confidence_bounds: tuple[float, float]
    constraint_violations: List[Dict[str, Any]]
    emergent_behaviors: List[Dict[str, Any]]
    stability_analysis: Dict[str, Any]
    complexity_metrics: Dict[str, float]
    adaptation_recommendations: List[str]
    intervention_priorities: List[Dict[str, Any]]

# =============================================================================
# HOLISTIC CONSTRAINT VALIDATION ENDPOINTS
# =============================================================================

@app.post("/api/v1/validate/holistic", response_model=ConstraintValidationResponse)
async def validate_holistic_constraints(request: SystemStateRequest):
    """
    Perform holistic multi-dimensional constraint validation
    Returns comprehensive system analysis with emergent behavior detection
    """
    try:
        # Convert request to SystemState
        system_state = SystemState(
            electrical_state=request.electrical_state,
            thermal_state=request.thermal_state,
            harmonic_state=request.harmonic_state,
            load_state=request.load_state,
            constraint_satisfaction=request.constraint_satisfaction,
            emergent_properties=request.emergent_properties,
            stability_metrics=request.stability_metrics,
            phase_space_coordinates=np.array([
                request.electrical_state.get('voltage_l1', 120),
                request.electrical_state.get('voltage_l2', 120),
                request.electrical_state.get('current_l1', 0),
                request.electrical_state.get('current_l2', 0),
                request.thermal_state.get('conductor_temp_1', 30),
                request.thermal_state.get('conductor_temp_2', 30)
            ])
        )

        # Evaluate system holistically
        evaluation = holistic_engine.evaluate_system_holistically(system_state)

        # Serialize constraint violations
        violations_serialized = []
        for violation in evaluation['constraint_violations']:
            violations_serialized.append({
                'constraint_id': violation.constraint_id,
                'constraint_name': violation.constraint_name,
                'violation_magnitude': violation.violation_magnitude,
                'cascading_risk': violation.cascading_risk,
                'temporal_urgency': violation.temporal_urgency,
                'system_impact_score': violation.system_impact_score,
                'confidence_interval': violation.confidence_interval,
                'root_cause_probability': violation.root_cause_probability,
                'mitigation_complexity': violation.mitigation_complexity
            })

        return ConstraintValidationResponse(
            holistic_score=evaluation['holistic_score'],
            confidence_bounds=evaluation['confidence_bounds'],
            constraint_violations=violations_serialized,
            emergent_behaviors=evaluation['emergent_behaviors'],
            stability_analysis=evaluation['stability_analysis'],
            complexity_metrics=evaluation['complexity_metrics'],
            adaptation_recommendations=evaluation['adaptation_recommendations'],
            intervention_priorities=evaluation['intervention_priorities']
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Holistic validation failed: {str(e)}")

# =============================================================================
# ELECTRICAL CIRCUIT VALIDATION ENDPOINTS
# =============================================================================

@app.post("/api/v1/validate/circuit")
async def validate_circuit(request: CircuitDataRequest):
    """
    Validate electrical circuit against NEC standards
    Returns thermal, voltage drop, and harmonic analysis
    """
    try:
        # Convert request to internal format
        protection_device = ProtectionDevice(
            device_id=request.protection_device.device_id,
            protection_type=ProtectionType(request.protection_device.protection_type),
            current_rating=request.protection_device.current_rating,
            voltage_rating=request.protection_device.voltage_rating,
            interrupting_rating=request.protection_device.interrupting_rating,
            trip_curve_type=request.protection_device.trip_curve_type,
            instantaneous_trip_multiplier=request.protection_device.instantaneous_trip_multiplier,
            time_delay_characteristics=request.protection_device.time_delay_characteristics
        )

        loads = [
            LoadData(
                load_id=load.load_id,
                load_type=LoadType(load.load_type.lower()),
                nominal_voltage=load.nominal_voltage,
                nominal_current=load.nominal_current,
                nominal_power=load.nominal_power,
                power_factor=load.power_factor,
                starting_current_multiplier=load.starting_current_multiplier,
                diversity_factor=load.diversity_factor,
                critical_load=load.critical_load,
                harmonic_content=load.harmonic_content,
                operating_schedule=load.operating_schedule
            )
            for load in request.loads
        ]

        circuit = CircuitData(
            circuit_id=request.circuit_id,
            circuit_type=CircuitType(request.circuit_type.lower()),
            wire_awg=request.wire_awg,
            wire_length_ft=request.wire_length_ft,
            conduit_fill_percentage=request.conduit_fill_percentage,
            ambient_temperature_c=request.ambient_temperature_c,
            number_of_conductors=request.number_of_conductors,
            voltage_rating=request.voltage_rating,
            loads=loads,
            protection_device=protection_device,
            parent_circuit_id=request.parent_circuit_id
        )

        # Generate integration report
        report = electrical_analyzer.generate_integration_report(circuit)

        return report

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Circuit validation failed: {str(e)}")

# =============================================================================
# FIELD NOTES PROCESSING ENDPOINTS
# =============================================================================

@app.post("/api/v1/process/field-notes")
async def process_field_notes(request: FieldNotesRequest):
    """
    Parse unstructured field notes into validated electrical entities
    """
    try:
        # Initialize bridge with Supabase credentials
        bridge = SupabaseElectriScribeBridge(
            supabase_url=request.supabase_url,
            supabase_key=request.supabase_key
        )

        # Process field notes
        result = await bridge.parse_field_notes_to_entities(
            request.raw_notes,
            request.site_id
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Field notes processing failed: {str(e)}")

# =============================================================================
# COMPLEXITY ANALYSIS ENDPOINTS
# =============================================================================

@app.get("/api/v1/analysis/complexity")
async def get_complexity_metrics(
    electrical_dimension: float,
    thermal_dimension: float,
    harmonic_dimension: float
):
    """
    Calculate multi-dimensional complexity metrics
    """
    try:
        system_state = SystemState(
            electrical_state={'complexity': electrical_dimension},
            thermal_state={'complexity': thermal_dimension},
            harmonic_state={'complexity': harmonic_dimension},
            load_state={},
            constraint_satisfaction={},
            emergent_properties={},
            stability_metrics={},
            phase_space_coordinates=np.array([electrical_dimension, thermal_dimension, harmonic_dimension])
        )

        complexity = holistic_engine._calculate_complexity_metrics(system_state, [])

        return {
            'complexity_metrics': complexity,
            'overall_complexity': complexity.get('overall', 0.5),
            'recommendations': _generate_complexity_recommendations(complexity)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Complexity analysis failed: {str(e)}")

def _generate_complexity_recommendations(complexity: Dict[str, float]) -> List[str]:
    """Generate recommendations based on complexity metrics"""
    recommendations = []

    if complexity.get('electrical', 0) > 0.7:
        recommendations.append("High electrical complexity detected - consider load redistribution")

    if complexity.get('systemic', 0) > 0.7:
        recommendations.append("Complex system interactions - implement phased installation")

    if complexity.get('temporal', 0) > 0.7:
        recommendations.append("High temporal dynamics - add monitoring and alerts")

    if complexity.get('epistemic', 0) > 0.7:
        recommendations.append("High uncertainty - conduct detailed field survey")

    return recommendations

# =============================================================================
# REAL-TIME MONITORING WEBSOCKET
# =============================================================================

@app.websocket("/ws/monitor/{circuit_id}")
async def websocket_monitor_circuit(websocket: WebSocket, circuit_id: str):
    """
    WebSocket endpoint for real-time circuit monitoring
    Streams measurements and constraint violations
    """
    await websocket.accept()

    try:
        # Accept configuration message
        config = await websocket.receive_json()
        supabase_url = config.get('supabase_url')
        supabase_key = config.get('supabase_key')

        if not supabase_url or not supabase_key:
            await websocket.send_json({'error': 'Missing Supabase credentials'})
            return

        # Initialize bridge and monitor
        bridge = SupabaseElectriScribeBridge(supabase_url, supabase_key)
        monitor = RealTimeElectricalMonitor(bridge)
        active_monitors[circuit_id] = monitor

        # Start monitoring
        monitoring_task = asyncio.create_task(monitor.start_monitoring([circuit_id]))

        # Stream updates to client
        while True:
            # Check for new measurements (simplified - in production, use proper pub/sub)
            await asyncio.sleep(1)

            # Send heartbeat
            await websocket.send_json({
                'type': 'heartbeat',
                'circuit_id': circuit_id,
                'timestamp': datetime.now().isoformat()
            })

    except WebSocketDisconnect:
        # Clean up monitoring
        if circuit_id in active_monitors:
            active_monitors[circuit_id].stop_monitoring()
            del active_monitors[circuit_id]
    except Exception as e:
        await websocket.send_json({'error': str(e)})

# =============================================================================
# HEALTH CHECK AND STATUS
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'engines': {
            'holistic_constraint_engine': 'operational',
            'electrical_analyzer': 'operational',
            'active_monitors': len(active_monitors)
        }
    }

@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        'name': 'ElectriScribe Analysis API',
        'version': '1.0.0',
        'endpoints': {
            'holistic_validation': '/api/v1/validate/holistic',
            'circuit_validation': '/api/v1/validate/circuit',
            'field_notes': '/api/v1/process/field-notes',
            'complexity': '/api/v1/analysis/complexity',
            'monitoring': '/ws/monitor/{circuit_id}',
            'health': '/health'
        }
    }

# =============================================================================
# APPLICATION STARTUP
# =============================================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=True
    )
