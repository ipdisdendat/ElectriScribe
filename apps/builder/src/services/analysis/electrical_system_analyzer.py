# Electrical System Integration Analysis Framework
# Comprehensive constraint validation and load analysis for electrical design teams

import numpy as np
import json
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import math
import warnings

class CircuitType(Enum):
    BRANCH = "branch"
    FEEDER = "feeder"
    SERVICE = "service"
    SUBPANEL = "subpanel"

class LoadType(Enum):
    RESISTIVE = "resistive"
    MOTOR = "motor"
    ELECTRONIC = "electronic"
    LIGHTING = "lighting"
    HVAC = "hvac"
    CRITICAL = "critical"

class ProtectionType(Enum):
    BREAKER = "circuit_breaker"
    FUSE = "fuse"
    GFCI = "gfci"
    AFCI = "afci"

@dataclass
class WireProperties:
    """AWG wire specifications and ampacity ratings"""
    awg_size: str
    diameter_mils: float
    area_cmil: float
    resistance_ohm_per_kft: float
    ampacity_60c: float
    ampacity_75c: float
    ampacity_90c: float
    
class StandardWireData:
    """Standard AWG wire properties lookup"""
    
    WIRE_DATA = {
        "14": WireProperties("14", 64.1, 4107, 3.07, 15, 20, 25),
        "12": WireProperties("12", 80.8, 6530, 1.93, 20, 25, 30),
        "10": WireProperties("10", 101.9, 10380, 1.21, 30, 35, 40),
        "8": WireProperties("8", 128.5, 16510, 0.764, 40, 50, 55),
        "6": WireProperties("6", 162.0, 26240, 0.491, 55, 65, 75),
        "4": WireProperties("4", 204.3, 41740, 0.308, 70, 85, 95),
        "2": WireProperties("2", 257.6, 66360, 0.194, 95, 115, 130),
        "1": WireProperties("1", 289.3, 83690, 0.154, 110, 130, 150),
        "1/0": WireProperties("1/0", 325.0, 105600, 0.122, 125, 150, 170),
        "2/0": WireProperties("2/0", 365.0, 133100, 0.0967, 145, 175, 195),
        "3/0": WireProperties("3/0", 409.6, 167800, 0.0766, 165, 200, 225),
        "4/0": WireProperties("4/0", 460.0, 211600, 0.0608, 195, 230, 260),
        "250": WireProperties("250", 500.0, 250000, 0.0515, 215, 255, 290),
        "300": WireProperties("300", 547.0, 300000, 0.0429, 240, 285, 320),
        "350": WireProperties("350", 591.0, 350000, 0.0367, 260, 310, 350),
        "400": WireProperties("400", 632.0, 400000, 0.0321, 280, 335, 380),
        "500": WireProperties("500", 707.0, 500000, 0.0258, 320, 380, 430),
    }
    
    @classmethod
    def get_wire_properties(cls, awg_size: str) -> Optional[WireProperties]:
        return cls.WIRE_DATA.get(awg_size)
    
    @classmethod
    def get_ampacity(cls, awg_size: str, temperature_rating: int = 75) -> float:
        wire = cls.get_wire_properties(awg_size)
        if not wire:
            return 0.0
        
        if temperature_rating <= 60:
            return wire.ampacity_60c
        elif temperature_rating <= 75:
            return wire.ampacity_75c
        else:
            return wire.ampacity_90c

@dataclass
class LoadData:
    """Individual electrical load specification"""
    load_id: str
    load_type: LoadType
    nominal_voltage: float
    nominal_current: float
    nominal_power: float
    power_factor: float
    starting_current_multiplier: float  # For motor loads
    diversity_factor: float
    critical_load: bool
    harmonic_content: Dict[int, float]  # Harmonic number -> magnitude
    operating_schedule: List[float]  # 24-hour operation profile (0-1)

@dataclass
class CircuitData:
    """Electrical circuit specification"""
    circuit_id: str
    circuit_type: CircuitType
    wire_awg: str
    wire_length_ft: float
    conduit_fill_percentage: float
    ambient_temperature_c: float
    number_of_conductors: int
    voltage_rating: float
    loads: List[LoadData]
    protection_device: 'ProtectionDevice'
    parent_circuit_id: Optional[str] = None

@dataclass
class ProtectionDevice:
    """Circuit protection device specification"""
    device_id: str
    protection_type: ProtectionType
    current_rating: float
    voltage_rating: float
    interrupting_rating: float
    trip_curve_type: str  # "B", "C", "D" for breakers
    instantaneous_trip_multiplier: float
    time_delay_characteristics: Dict[str, float]

@dataclass
class ThermalAnalysisResult:
    """Thermal analysis results for conductor"""
    conductor_temperature_c: float
    ampacity_derated: float
    thermal_margin_percent: float
    time_to_thermal_limit_minutes: float
    cooling_required: bool

@dataclass
class VoltageDropAnalysis:
    """Voltage drop analysis results"""
    voltage_drop_volts: float
    voltage_drop_percent: float
    voltage_at_load: float
    meets_code_requirements: bool
    recommended_wire_upgrade: Optional[str]

@dataclass
class FaultCurrentAnalysis:
    """Fault current analysis at circuit point"""
    available_fault_current: float
    x_over_r_ratio: float
    arc_fault_current: float
    protection_coordination_margin: float
    fault_clearing_time_cycles: float

@dataclass
class HarmonicAnalysis:
    """System harmonic distortion analysis"""
    thd_voltage_percent: float
    thd_current_percent: float
    individual_harmonics: Dict[int, float]
    k_factor_transformers: float
    neutral_current_percent: float

@dataclass
class SystemConstraintCheck:
    """Complete system constraint validation results"""
    constraint_name: str
    current_value: float
    limit_value: float
    margin_percent: float
    passes_check: bool
    severity_level: str  # "info", "warning", "critical"
    recommendation: str

class ElectricalSystemAnalyzer:
    """
    Main electrical system analysis engine
    Validates constraints, analyzes loads, and provides integration guidance
    """
    
    def __init__(self):
        self.circuits = {}  # circuit_id -> CircuitData
        self.system_hierarchy = {}  # parent_id -> [child_ids]
        self.load_diversity_matrix = {}
        self.fault_current_database = {}
        
        # Analysis configuration
        self.config = {
            'voltage_drop_limit_percent': 3.0,  # NEC recommendation
            'temperature_derating_enabled': True,
            'harmonic_analysis_enabled': True,
            'fault_current_safety_margin': 0.8,  # 80% of device rating
            'thermal_safety_margin': 0.75,  # 75% of ampacity,\n            'parent_loading_limit_percent': 80.0,\n            'thd_current_limit_percent': 20.0,\n            'thermal_margin_min_percent': 20.0
        }
        
    def add_circuit(self, circuit: CircuitData) -> None:
        """Add circuit to system analysis"""
        self.circuits[circuit.circuit_id] = circuit
        
        # Build hierarchy
        if circuit.parent_circuit_id:
            if circuit.parent_circuit_id not in self.system_hierarchy:
                self.system_hierarchy[circuit.parent_circuit_id] = []
            self.system_hierarchy[circuit.parent_circuit_id].append(circuit.circuit_id)
        
    def calculate_load_current(self, loads: List[LoadData], 
                             include_diversity: bool = True,
                             time_of_day_hour: Optional[int] = None) -> Dict[str, float]:
        """Calculate total load current with diversity and time factors"""
        
        total_continuous = 0.0
        total_non_continuous = 0.0
        total_motor_starting = 0.0
        harmonic_currents = {}
        
        for load in loads:
            # Base current
            base_current = load.nominal_current
            
            # Apply diversity factor
            if include_diversity:
                base_current *= load.diversity_factor
            
            # Apply time-of-day factor
            if time_of_day_hour is not None and load.operating_schedule:
                hour_index = time_of_day_hour % 24
                if hour_index < len(load.operating_schedule):
                    base_current *= load.operating_schedule[hour_index]
            
            # Categorize load
            if load.critical_load or load.load_type in [LoadType.LIGHTING, LoadType.ELECTRONIC]:
                total_continuous += base_current
            else:
                total_non_continuous += base_current
            
            # Motor starting current
            if load.load_type == LoadType.MOTOR:
                starting_current = base_current * load.starting_current_multiplier
                total_motor_starting = max(total_motor_starting, starting_current)
            
            # Harmonic contributions
            for harmonic_order, magnitude in load.harmonic_content.items():
                if harmonic_order not in harmonic_currents:
                    harmonic_currents[harmonic_order] = 0.0
                harmonic_currents[harmonic_order] += base_current * magnitude
        
        return {
            'continuous_current': total_continuous,
            'non_continuous_current': total_non_continuous,
            'design_current': total_continuous * 1.25 + total_non_continuous,  # NEC 125% rule
            'motor_starting_peak': total_motor_starting,
            'harmonic_currents': harmonic_currents
        }
    
    def analyze_thermal_performance(self, circuit: CircuitData) -> ThermalAnalysisResult:
        """Analyze conductor thermal performance"""
        
        # Get wire properties
        wire_props = StandardWireData.get_wire_properties(circuit.wire_awg)
        if not wire_props:
            raise ValueError(f"Unknown wire size: {circuit.wire_awg}")
        
        # Base ampacity at temperature rating
        base_ampacity = StandardWireData.get_ampacity(circuit.wire_awg, 75)
        
        # Temperature derating factors (NEC Table 310.15(B)(2)(a))
        temp_correction = self._get_temperature_correction_factor(circuit.ambient_temperature_c)
        
        # Conduit fill derating (NEC Table 310.15(B)(3)(a))
        fill_correction = self._get_conduit_fill_correction_factor(
            circuit.number_of_conductors, circuit.conduit_fill_percentage
        )
        
        # Derated ampacity
        derated_ampacity = base_ampacity * temp_correction * fill_correction
        
        # Calculate load current
        load_analysis = self.calculate_load_current(circuit.loads)
        design_current = load_analysis['design_current']
        
        # Conductor temperature under load (simplified model)
        current_ratio = design_current / derated_ampacity
        conductor_temp = circuit.ambient_temperature_c + (75 - circuit.ambient_temperature_c) * current_ratio**2
        
        # Thermal margin
        thermal_margin = (derated_ampacity - design_current) / derated_ampacity * 100
        
        # Time to thermal limit (thermal time constant approximation)
        if design_current > derated_ampacity:
            # Overload condition
            overload_ratio = design_current / derated_ampacity
            # Simplified: I²t relationship for conductor heating
            time_to_limit = (1.0 / (overload_ratio**2 - 1.0)) * 5.0  # 5 minutes base time constant
        else:
            time_to_limit = float('inf')
        
        return ThermalAnalysisResult(
            conductor_temperature_c=conductor_temp,
            ampacity_derated=derated_ampacity,
            thermal_margin_percent=thermal_margin,
            time_to_thermal_limit_minutes=time_to_limit,
            cooling_required=design_current > derated_ampacity * self.config['thermal_safety_margin']
        )
    
    def analyze_voltage_drop(self, circuit: CircuitData) -> VoltageDropAnalysis:
        """Analyze voltage drop along circuit"""
        
        wire_props = StandardWireData.get_wire_properties(circuit.wire_awg)
        if not wire_props:
            raise ValueError(f"Unknown wire size: {circuit.wire_awg}")
        
        # Load current
        load_analysis = self.calculate_load_current(circuit.loads)
        design_current = load_analysis['design_current']
        
        # Resistance calculation
        resistance_per_ft = wire_props.resistance_ohm_per_kft / 1000.0
        total_resistance = resistance_per_ft * circuit.wire_length_ft * 2  # Round trip
        
        # Voltage drop calculation
        voltage_drop = design_current * total_resistance
        voltage_drop_percent = (voltage_drop / circuit.voltage_rating) * 100
        voltage_at_load = circuit.voltage_rating - voltage_drop
        
        # Code compliance check
        meets_code = voltage_drop_percent <= self.config['voltage_drop_limit_percent']
        
        # Wire upgrade recommendation
        recommended_upgrade = None
        if not meets_code:
            recommended_upgrade = self._recommend_wire_upgrade(
                circuit, design_current, voltage_drop_percent
            )
        
        return VoltageDropAnalysis(
            voltage_drop_volts=voltage_drop,
            voltage_drop_percent=voltage_drop_percent,
            voltage_at_load=voltage_at_load,
            meets_code_requirements=meets_code,
            recommended_wire_upgrade=recommended_upgrade
        )
    
    def analyze_fault_current(self, circuit_id: str, 
                            upstream_fault_current: float,
                            transformer_impedance: float = 0.06) -> FaultCurrentAnalysis:
        """Analyze available fault current at circuit location"""
        
        circuit = self.circuits.get(circuit_id)
        if not circuit:
            raise ValueError(f"Circuit not found: {circuit_id}")
        
        wire_props = StandardWireData.get_wire_properties(circuit.wire_awg)
        if not wire_props:
            raise ValueError(f"Unknown wire size: {circuit.wire_awg}")
        
        # Circuit impedance calculation
        resistance_ohm = (wire_props.resistance_ohm_per_kft / 1000.0) * circuit.wire_length_ft
        
        # Simplified reactance (approximately 0.1 ohm per 1000 ft for typical conditions)
        reactance_ohm = (0.1 / 1000.0) * circuit.wire_length_ft
        
        # Total circuit impedance
        circuit_impedance = math.sqrt(resistance_ohm**2 + reactance_ohm**2)
        
        # Available fault current (simplified calculation)
        system_voltage = circuit.voltage_rating
        total_impedance = transformer_impedance + circuit_impedance
        available_fault_current = system_voltage / (total_impedance * math.sqrt(3))  # 3-phase
        
        # X/R ratio
        x_over_r = reactance_ohm / (resistance_ohm + 1e-6)  # Avoid division by zero
        
        # Arc fault current (approximately 38% of bolted fault current)
        arc_fault_current = available_fault_current * 0.38
        
        # Protection coordination margin
        device_rating = circuit.protection_device.interrupting_rating
        coordination_margin = (device_rating - available_fault_current) / device_rating
        
        # Fault clearing time (simplified - depends on protection curve)
        if available_fault_current > circuit.protection_device.current_rating * 10:
            fault_clearing_cycles = 0.5  # Fast instantaneous trip
        else:
            fault_clearing_cycles = 3.0   # Time delay trip
        
        return FaultCurrentAnalysis(
            available_fault_current=available_fault_current,
            x_over_r_ratio=x_over_r,
            arc_fault_current=arc_fault_current,
            protection_coordination_margin=coordination_margin,
            fault_clearing_time_cycles=fault_clearing_cycles
        )
    
    def analyze_harmonic_distortion(self, circuit_loads: List[LoadData]) -> HarmonicAnalysis:
        """Analyze harmonic distortion from non-linear loads"""
        
        fundamental_current = 0.0
        harmonic_currents = {}
        
        for load in circuit_loads:
            fundamental_current += load.nominal_current
            
            for harmonic_order, magnitude in load.harmonic_content.items():
                if harmonic_order not in harmonic_currents:
                    harmonic_currents[harmonic_order] = 0.0
                harmonic_currents[harmonic_order] += load.nominal_current * magnitude
        
        # Calculate THD
        total_harmonic_power = sum(current**2 for current in harmonic_currents.values())
        thd_current = math.sqrt(total_harmonic_power) / fundamental_current * 100 if fundamental_current > 0 else 0
        
        # Voltage THD (simplified - depends on system impedance)
        thd_voltage = thd_current * 0.1  # Rough approximation
        
        # K-factor for transformers
        k_factor = 1.0 + sum(harmonic_order**2 * (current/fundamental_current)**2 
                           for harmonic_order, current in harmonic_currents.items())
        
        # Neutral current calculation (simplified for single-phase loads)
        # Third harmonic and odd triplen harmonics add in neutral
        neutral_current = 0.0
        for harmonic_order, current in harmonic_currents.items():
            if harmonic_order % 3 == 0:  # Triplen harmonics
                neutral_current += current
        
        neutral_current_percent = (neutral_current / fundamental_current * 100) if fundamental_current > 0 else 0
        
        return HarmonicAnalysis(
            thd_voltage_percent=thd_voltage,
            thd_current_percent=thd_current,
            individual_harmonics=harmonic_currents,
            k_factor_transformers=k_factor,
            neutral_current_percent=neutral_current_percent
        )
    
    def validate_system_constraints(self, new_circuit: CircuitData) -> List[SystemConstraintCheck]:
        """Validate all system constraints when adding new circuit"""
        
        constraints = []
        
        # Add new circuit temporarily for analysis
        self.add_circuit(new_circuit)
        
        try:
            # 1. Thermal constraints
            thermal_result = self.analyze_thermal_performance(new_circuit)\n            margin_min = self.config.get('thermal_margin_min_percent', 20.0)\n            constraints.append(SystemConstraintCheck(
                constraint_name="Conductor Ampacity",
                current_value=thermal_result.ampacity_derated,
                limit_value=self.calculate_load_current(new_circuit.loads)['design_current'],
                margin_percent=thermal_result.thermal_margin_percent,
                passes_check=thermal_result.thermal_margin_percent > margin_min,
                severity_level="critical" if thermal_result.thermal_margin_percent < 0 else "warning" if thermal_result.thermal_margin_percent < margin_min else "info",
                recommendation="Increase wire size or reduce load" if thermal_result.thermal_margin_percent < margin_min else "Adequate thermal margin"
            ))
            
            # 2. Voltage drop constraints
            voltage_result = self.analyze_voltage_drop(new_circuit)\n            vlimit = self.config.get('voltage_drop_limit_percent', 3.0)\n            constraints.append(SystemConstraintCheck(
                constraint_name="Voltage Drop",
                current_value=voltage_result.voltage_drop_percent,
                limit_value=vlimit,
                margin_percent=(vlimit - voltage_result.voltage_drop_percent) / vlimit * 100,
                passes_check=voltage_result.meets_code_requirements,
                severity_level="critical" if not voltage_result.meets_code_requirements else "info",
                recommendation=f"Upgrade to {voltage_result.recommended_wire_upgrade}" if voltage_result.recommended_wire_upgrade else "Voltage drop acceptable"
            ))
            
            # 3. Parent circuit loading constraints
            if new_circuit.parent_circuit_id and new_circuit.parent_circuit_id in self.circuits:
                parent_circuit = self.circuits[new_circuit.parent_circuit_id]
                
                # Aggregate all child loads
                child_circuits = self.system_hierarchy.get(new_circuit.parent_circuit_id, [])
                all_child_loads = []
                for child_id in child_circuits:
                    child_circuit = self.circuits.get(child_id)
                    if child_circuit:
                        all_child_loads.extend(child_circuit.loads)
                
                parent_load_analysis = self.calculate_load_current(all_child_loads)
                parent_thermal = self.analyze_thermal_performance(parent_circuit)
                
                parent_loading_percent = (parent_load_analysis['design_current'] / parent_thermal.ampacity_derated) * 100\n                plimit = self.config.get('parent_loading_limit_percent', 80.0)\n                constraints.append(SystemConstraintCheck(
                    constraint_name="Parent Circuit Loading",
                    current_value=parent_loading_percent,
                    limit_value=plimit,  # Loading limit
                    margin_percent=(plimit - parent_loading_percent),
                    passes_check=parent_loading_percent <= plimit,
                    severity_level="critical" if parent_loading_percent > 100 else "warning" if parent_loading_percent > plimit else "info",
                    recommendation="Upgrade parent circuit or redistribute loads" if parent_loading_percent > plimit else "Parent circuit adequate"
                ))
            
            # 4. Harmonic distortion constraints
            harmonic_result = self.analyze_harmonic_distortion(new_circuit.loads)\n            thd_limit = self.config.get('thd_current_limit_percent', 20.0)\n            constraints.append(SystemConstraintCheck(
                constraint_name="Current THD",
                current_value=harmonic_result.thd_current_percent,
                limit_value=thd_limit,  # IEEE 519 guideline baseline
                margin_percent=(thd_limit - harmonic_result.thd_current_percent) / thd_limit * 100,
                passes_check=harmonic_result.thd_current_percent <= thd_limit,
                severity_level="warning" if harmonic_result.thd_current_percent > thd_limit else "info",
                recommendation="Consider harmonic filtering" if harmonic_result.thd_current_percent > thd_limit else "Harmonic levels acceptable"
            ))
            
        finally:
            # Remove the temporarily added circuit
            if new_circuit.circuit_id in self.circuits:
                del self.circuits[new_circuit.circuit_id]
                if new_circuit.parent_circuit_id in self.system_hierarchy:
                    try:
                        self.system_hierarchy[new_circuit.parent_circuit_id].remove(new_circuit.circuit_id)
                    except ValueError:
                        pass
        
        return constraints
    
    def generate_integration_report(self, new_circuit: CircuitData) -> Dict[str, Any]:
        """Generate comprehensive integration analysis report"""
        
        constraints = self.validate_system_constraints(new_circuit)
        
        # Re-add circuit for detailed analysis
        self.add_circuit(new_circuit)
        
        try:
            thermal_analysis = self.analyze_thermal_performance(new_circuit)
            voltage_analysis = self.analyze_voltage_drop(new_circuit)
            harmonic_analysis = self.analyze_harmonic_distortion(new_circuit.loads)
            load_analysis = self.calculate_load_current(new_circuit.loads)
            
            # System impact assessment
            critical_issues = [c for c in constraints if c.severity_level == "critical"]
            warnings = [c for c in constraints if c.severity_level == "warning"]
            
            overall_status = "FAIL" if critical_issues else "PASS_WITH_WARNINGS" if warnings else "PASS"
            
            report = {
                'circuit_id': new_circuit.circuit_id,
                'analysis_timestamp': np.datetime64('now').isoformat(),
                'overall_status': overall_status,
                'constraint_checks': [asdict(c) for c in constraints],
                'thermal_analysis': asdict(thermal_analysis),
                'voltage_analysis': asdict(voltage_analysis),
                'harmonic_analysis': asdict(harmonic_analysis),
                'load_analysis': load_analysis,
                'recommendations': self._generate_recommendations(constraints),
                'required_modifications': self._generate_required_modifications(constraints),
                'system_impact_summary': {
                    'affects_parent_circuit': new_circuit.parent_circuit_id is not None,
                    'critical_issues_count': len(critical_issues),
                    'warnings_count': len(warnings),
                    'estimated_implementation_risk': self._assess_implementation_risk(constraints)
                }
            }
            
        finally:
            # Clean up
            if new_circuit.circuit_id in self.circuits:
                del self.circuits[new_circuit.circuit_id]
                if new_circuit.parent_circuit_id in self.system_hierarchy:
                    try:
                        self.system_hierarchy[new_circuit.parent_circuit_id].remove(new_circuit.circuit_id)
                    except ValueError:
                        pass
        
        return report
    
    def _get_temperature_correction_factor(self, ambient_temp_c: float) -> float:
        """Temperature correction factors per NEC Table 310.15(B)(2)(a)"""
        temp_factors = {
            21: 1.08, 26: 1.00, 31: 0.91, 36: 0.82, 41: 0.71,
            46: 0.58, 51: 0.41, 56: 0.00
        }
        
        # Find closest temperature
        closest_temp = min(temp_factors.keys(), key=lambda x: abs(x - ambient_temp_c))
        return temp_factors[closest_temp]
    
    def _get_conduit_fill_correction_factor(self, num_conductors: int, fill_percent: float) -> float:
        """Conduit fill correction factors per NEC Table 310.15(B)(3)(a)"""
        if num_conductors <= 3:
            return 1.00
        elif num_conductors <= 6:
            return 0.80
        elif num_conductors <= 9:
            return 0.70
        elif num_conductors <= 20:
            return 0.50
        else:
            return 0.35
    
    def _recommend_wire_upgrade(self, circuit: CircuitData, design_current: float, 
                              current_vd_percent: float) -> str:
        """Recommend wire size upgrade to meet voltage drop requirements"""
        
        # Try larger wire sizes until voltage drop is acceptable
        wire_sizes = ["14", "12", "10", "8", "6", "4", "2", "1", "1/0", "2/0", "3/0", "4/0"]
        current_index = wire_sizes.index(circuit.wire_awg)
        
        for i in range(current_index + 1, len(wire_sizes)):
            test_size = wire_sizes[i]
            test_wire = StandardWireData.get_wire_properties(test_size)
            if test_wire:
                test_resistance = (test_wire.resistance_ohm_per_kft / 1000.0) * circuit.wire_length_ft * 2
                test_vd = design_current * test_resistance
                test_vd_percent = (test_vd / circuit.voltage_rating) * 100
                
                if test_vd_percent <= self.config['voltage_drop_limit_percent']:
                    return test_size
        
        return "Consult engineer - may need voltage upgrade"
    
    def _generate_recommendations(self, constraints: List[SystemConstraintCheck]) -> List[str]:
        """Generate actionable recommendations based on constraint analysis"""
        recommendations = []
        
        for constraint in constraints:
            if not constraint.passes_check:
                recommendations.append(f"{constraint.constraint_name}: {constraint.recommendation}")
        
        return recommendations
    
    def _generate_required_modifications(self, constraints: List[SystemConstraintCheck]) -> List[Dict[str, str]]:
        """Generate required system modifications"""
        modifications = []
        
        critical_constraints = [c for c in constraints if c.severity_level == "critical"]
        
        for constraint in critical_constraints:
            if "Conductor Ampacity" in constraint.constraint_name:
                modifications.append({
                    "type": "wire_upgrade",
                    "description": "Increase conductor size to handle load",
                    "priority": "high"
                })
            elif "Voltage Drop" in constraint.constraint_name:
                modifications.append({
                    "type": "wire_upgrade_or_voltage_increase",
                    "description": "Reduce circuit resistance or increase supply voltage",
                    "priority": "high"
                })
            elif "Parent Circuit" in constraint.constraint_name:
                modifications.append({
                    "type": "panel_upgrade",
                    "description": "Upgrade parent circuit or redistribute loads",
                    "priority": "high"
                })
        
        return modifications
    
    def _assess_implementation_risk(self, constraints: List[SystemConstraintCheck]) -> str:
        """Assess implementation risk based on constraint violations"""
        critical_count = len([c for c in constraints if c.severity_level == "critical"])
        warning_count = len([c for c in constraints if c.severity_level == "warning"])
        
        if critical_count > 2:
            return "HIGH"
        elif critical_count > 0 or warning_count > 3:
            return "MEDIUM"
        else:
            return "LOW"

# Usage example and testing
if __name__ == "__main__":
    # Example usage
    analyzer = ElectricalSystemAnalyzer()
    
    # Define protection device
    protection = ProtectionDevice(
        device_id="CB-101",
        protection_type=ProtectionType.BREAKER,
        current_rating=20.0,
        voltage_rating=120.0,
        interrupting_rating=10000.0,
        trip_curve_type="C",
        instantaneous_trip_multiplier=10.0,
        time_delay_characteristics={"thermal": 60.0, "magnetic": 0.5}
    )
    
    # Define loads
    loads = [
        LoadData(
            load_id="HVAC-1",
            load_type=LoadType.HVAC,
            nominal_voltage=120.0,
            nominal_current=15.0,
            nominal_power=1800.0,
            power_factor=0.85,
            starting_current_multiplier=3.0,
            diversity_factor=0.8,
            critical_load=True,
            harmonic_content={3: 0.1, 5: 0.05},
            operating_schedule=[0.5] * 24  # 50% duty cycle
        )
    ]
    
    # Define new circuit
    new_circuit = CircuitData(
        circuit_id="BRANCH-201",
        circuit_type=CircuitType.BRANCH,
        wire_awg="12",
        wire_length_ft=100.0,
        conduit_fill_percentage=40.0,
        ambient_temperature_c=30.0,
        number_of_conductors=3,
        voltage_rating=120.0,
        loads=loads,
        protection_device=protection
    )
    
    # Generate integration report
    report = analyzer.generate_integration_report(new_circuit)
    
    print("Integration Analysis Report:")
    print(f"Status: {report['overall_status']}")
    print(f"Critical Issues: {report['system_impact_summary']['critical_issues_count']}")
    print(f"Implementation Risk: {report['system_impact_summary']['estimated_implementation_risk']}")
    
    for recommendation in report['recommendations']:
        print(f"- {recommendation}")





