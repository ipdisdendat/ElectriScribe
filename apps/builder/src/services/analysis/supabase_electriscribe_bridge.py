# Supabase ElectriScribe Integration Bridge
# Connects field notes parsing to constraint validation with real-time database operations
# Embodies the resonance between unstoppable parsing force and immovable electrical constraints

import asyncio
import json
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from supabase import create_client, Client
import numpy as np
from enum import Enum

# Import existing ElectriScribe models
from electriscribe_integrated_system import (
    ElectriScribeAnalysisEngine, Site, Panel, Circuit, Load, 
    CircuitType, LoadType, AlertSeverity, AnalysisStatus,
    ConstraintCheck, Alert, Measurement, Threshold
)

# =============================================================================
# SUPABASE SCHEMA INTEGRATION LAYER
# =============================================================================

class SupabaseElectriScribeBridge:
    """
    Bridge between Supabase database and ElectriScribe analysis engine
    Provides real-time synchronization and constraint validation
    """
    
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.analysis_engine = ElectriScribeAnalysisEngine()
        
        # Cache for real-time validation
        self.validation_rules_cache = {}
        self.bayesian_priors_cache = {}
        self.issue_patterns_cache = {}
        
        # Initialize caches
        self._load_validation_rules()
        self._load_bayesian_priors()
        self._load_issue_patterns()
    
    # =========================================================================
    # FIELD NOTES TO STRUCTURED ENTITIES PIPELINE
    # =========================================================================
    
    async def parse_field_notes_to_entities(self, raw_notes: str, site_id: str) -> Dict[str, Any]:
        """
        Transform unstructured field notes into validated electrical entities
        with real-time constraint checking
        """
        
        # Phase 1: Parse raw notes using AI extraction
        parsed_entities = await self._extract_entities_from_notes(raw_notes)
        
        # Phase 2: Create structured database records
        created_entities = await self._create_structured_entities(parsed_entities, site_id)
        
        # Phase 3: Run constraint validation
        validation_results = await self._validate_entities_with_constraints(created_entities)
        
        # Phase 4: Update Bayesian learning from results
        await self._update_bayesian_learning(validation_results)
        
        return {
            'parsed_entities': parsed_entities,
            'created_entities': created_entities,
            'validation_results': validation_results,
            'processing_metadata': {
                'timestamp': datetime.now().isoformat(),
                'confidence_score': self._calculate_parsing_confidence(parsed_entities),
                'entities_created': len(created_entities),
                'constraints_checked': len(validation_results.get('constraints', []))
            }
        }
    
    async def _extract_entities_from_notes(self, raw_notes: str) -> Dict[str, Any]:
        """Extract electrical entities using pattern matching and AI inference"""
        
        # Enhanced entity extraction patterns
        extraction_patterns = {
            'panels': {
                'main_panel': r'(?i)main\s+panel.*?(\d+)A?\s+service',
                'sub_panel': r'(?i)sub\s+panel.*?(\d+)A',
                'manufacturer': r'(?i)(square\s+d|eaton|siemens|ge)\s+(QO|BR|HOM)',
                'location': r'(?i)(?:located|location|in)\s+([a-zA-Z\s]+)'
            },
            'circuits': {
                'circuit_number': r'(?i)(?:circuit|slot)\s+(\d+(?:-\d+)?)',
                'breaker_size': r'(\d+)A?\s+(?:breaker|circuit)',
                'wire_gauge': r'(\d+)\s+AWG',
                'circuit_type': r'(?i)(MWBC|tandem|2-pole|single)',
                'load_description': r'(?i)(?:circuit|breaker)\s+(?:for\s+)?([^,\n]+)'
            },
            'loads': {
                'hvac': r'(?i)(heat\s+pump|furnace|air\s+condition|HVAC)',
                'appliances': r'(?i)(dishwasher|microwave|disposal|refrigerator)',
                'lighting': r'(?i)(lights?|lighting|LED|fluorescent)',
                'outlets': r'(?i)(outlet|receptacle|plug)',
                'current_rating': r'(\d+(?:\.\d+)?)\s*A(?:mp)?'
            },
            'issues': {
                'overload': r'(?i)(overload|trip|exceed)',
                'voltage_drop': r'(?i)(voltage\s+drop|dim|flicker)',
                'heating': r'(?i)(hot|warm|heat|thermal)',
                'failure': r'(?i)(fail|broken|not\s+work)'
            }
        }
        
        extracted = {
            'panels': [],
            'circuits': [],
            'loads': [],
            'issues': [],
            'confidence_scores': {}
        }
        
        # Extract panels
        panels = await self._extract_panels(raw_notes, extraction_patterns['panels'])
        extracted['panels'] = panels
        
        # Extract circuits with MWBC detection
        circuits = await self._extract_circuits(raw_notes, extraction_patterns['circuits'])
        extracted['circuits'] = circuits
        
        # Extract loads with classification
        loads = await self._extract_loads(raw_notes, extraction_patterns['loads'])
        extracted['loads'] = loads
        
        # Extract potential issues
        issues = await self._extract_issues(raw_notes, extraction_patterns['issues'])
        extracted['issues'] = issues
        
        # Calculate confidence scores
        extracted['confidence_scores'] = self._calculate_entity_confidence(extracted)
        
        return extracted
    
    async def _extract_panels(self, notes: str, patterns: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract panel information from field notes"""
        import re
        
        panels = []
        
        # Main panel detection
        main_panel_match = re.search(patterns['main_panel'], notes)
        if main_panel_match:
            rating = int(main_panel_match.group(1))
            
            # Extract manufacturer
            mfg_match = re.search(patterns['manufacturer'], notes)
            manufacturer = mfg_match.group(1) if mfg_match else "Unknown"
            model = mfg_match.group(2) if mfg_match else "Unknown"
            
            # Extract location
            loc_match = re.search(patterns['location'], notes)
            location = loc_match.group(1).strip() if loc_match else "Unknown"
            
            panels.append({
                'type': 'main_panel',
                'rating': rating,
                'manufacturer': manufacturer,
                'model': model,
                'location': location,
                'voltage_rating': 240.0,  # Standard residential
                'bus_configuration': 'split_phase'
            })
        
        # Sub panel detection
        sub_panel_matches = re.finditer(patterns['sub_panel'], notes)
        for match in sub_panel_matches:
            rating = int(match.group(1))
            panels.append({
                'type': 'sub_panel',
                'rating': rating,
                'manufacturer': "Unknown",
                'model': "Unknown", 
                'location': "Unknown",
                'voltage_rating': 240.0,
                'bus_configuration': 'split_phase'
            })
        
        return panels
    
    async def _extract_circuits(self, notes: str, patterns: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract circuit information with MWBC detection"""
        import re
        
        circuits = []
        
        # Find all circuit references
        circuit_matches = re.finditer(patterns['circuit_number'], notes)
        
        for match in circuit_matches:
            circuit_num = match.group(1)
            
            # Get surrounding context
            start = max(0, match.start() - 100)
            end = min(len(notes), match.end() + 100)
            context = notes[start:end]
            
            # Extract breaker size
            breaker_match = re.search(patterns['breaker_size'], context)
            breaker_size = int(breaker_match.group(1)) if breaker_match else 20
            
            # Extract wire gauge
            wire_match = re.search(patterns['wire_gauge'], context)
            wire_awg = wire_match.group(1) if wire_match else "12"
            
            # Detect circuit type
            type_match = re.search(patterns['circuit_type'], context, re.IGNORECASE)
            if type_match:
                type_str = type_match.group(1).lower()
                if 'mwbc' in type_str:
                    circuit_type = CircuitType.MWBC
                elif '2-pole' in type_str:
                    circuit_type = CircuitType.FEEDER
                else:
                    circuit_type = CircuitType.BRANCH
            else:
                circuit_type = CircuitType.BRANCH
            
            # Extract load description
            load_match = re.search(patterns['load_description'], context)
            name = load_match.group(1).strip() if load_match else f"Circuit {circuit_num}"
            
            circuits.append({
                'circuit_number': circuit_num,
                'name': name,
                'circuit_type': circuit_type,
                'breaker_size': breaker_size,
                'wire_awg': wire_awg,
                'wire_type': 'ROMEX',  # Default assumption
                'voltage_rating': 120.0 if circuit_type == CircuitType.BRANCH else 240.0,
                'context': context
            })
        
        return circuits
    
    async def _extract_loads(self, notes: str, patterns: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract load information with type classification"""
        import re
        
        loads = []
        
        # HVAC loads
        hvac_matches = re.finditer(patterns['hvac'], notes, re.IGNORECASE)
        for match in hvac_matches:
            name = match.group(1)
            
            # Get context for current estimation
            start = max(0, match.start() - 50)
            end = min(len(notes), match.end() + 50)
            context = notes[start:end]
            
            current_match = re.search(patterns['current_rating'], context)
            current = float(current_match.group(1)) if current_match else 25.0  # Default HVAC
            
            loads.append({
                'name': name,
                'load_type': LoadType.HVAC,
                'nominal_current': current,
                'nominal_power': current * 240,  # Assume 240V for HVAC
                'power_factor': 0.85,
                'starting_current_multiplier': 3.0,  # High inrush
                'diversity_factor': 0.8
            })
        
        # Appliance loads
        appliance_matches = re.finditer(patterns['appliances'], notes, re.IGNORECASE)
        for match in appliance_matches:
            name = match.group(1)
            
            # Default values by appliance type
            appliance_defaults = {
                'dishwasher': {'current': 10.0, 'power_factor': 0.9},
                'microwave': {'current': 12.0, 'power_factor': 0.85},
                'disposal': {'current': 8.0, 'power_factor': 0.8},
                'refrigerator': {'current': 6.0, 'power_factor': 0.9}
            }
            
            defaults = appliance_defaults.get(name.lower(), {'current': 10.0, 'power_factor': 0.9})
            
            loads.append({
                'name': name,
                'load_type': LoadType.APPLIANCE,
                'nominal_current': defaults['current'],
                'nominal_power': defaults['current'] * 120,
                'power_factor': defaults['power_factor'],
                'starting_current_multiplier': 1.5,
                'diversity_factor': 0.7
            })
        
        return loads
    
    async def _extract_issues(self, notes: str, patterns: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract potential electrical issues from notes"""
        import re
        
        issues = []
        
        for issue_type, pattern in patterns.items():
            matches = re.finditer(pattern, notes, re.IGNORECASE)
            for match in matches:
                # Get context
                start = max(0, match.start() - 100)
                end = min(len(notes), match.end() + 100)
                context = notes[start:end]
                
                issues.append({
                    'type': issue_type,
                    'description': context.strip(),
                    'severity': self._classify_issue_severity(issue_type, context),
                    'location': match.span()
                })
        
        return issues
    
    def _classify_issue_severity(self, issue_type: str, context: str) -> AlertSeverity:
        """Classify issue severity based on type and context"""
        
        high_severity_keywords = ['critical', 'danger', 'fire', 'shock', 'emergency']
        medium_severity_keywords = ['problem', 'issue', 'concern', 'warning']
        
        context_lower = context.lower()
        
        if any(keyword in context_lower for keyword in high_severity_keywords):
            return AlertSeverity.CRITICAL
        elif any(keyword in context_lower for keyword in medium_severity_keywords):
            return AlertSeverity.WARNING
        elif issue_type in ['overload', 'heating']:
            return AlertSeverity.WARNING
        else:
            return AlertSeverity.INFO
    
    # =========================================================================
    # DATABASE OPERATIONS WITH CONSTRAINT VALIDATION
    # =========================================================================
    
    async def _create_structured_entities(self, parsed_entities: Dict[str, Any], site_id: str) -> Dict[str, Any]:
        """Create structured database records from parsed entities"""
        
        created = {
            'sites': [],
            'panels': [],
            'circuits': [],
            'loads': [],
            'issues': []
        }
        
        # Create/update site
        site_data = {
            'id': site_id,
            'name': 'Field Survey Site',
            'site_type': 'residential',
            'main_service_rating': 200.0,
            'service_voltage': 240.0,
            'electrical_code_jurisdiction': 'NEC_2023',
            'updated_at': datetime.now().isoformat()
        }
        
        # Upsert site
        result = self.supabase.table('sites').upsert(site_data).execute()
        created['sites'].append(result.data[0] if result.data else site_data)
        
        # Create panels
        for panel_data in parsed_entities['panels']:
            panel_record = {
                'id': f"panel_{panel_data['type']}_{site_id}",
                'site_id': site_id,
                'name': f"{panel_data['type'].replace('_', ' ').title()}",
                'panel_type': panel_data['type'],
                'manufacturer': panel_data['manufacturer'],
                'model': panel_data['model'],
                'capacity_amps': panel_data['rating'],
                'voltage_rating': panel_data['voltage_rating'],
                'number_of_slots': 24,  # Default
                'bus_configuration': panel_data['bus_configuration'],
                'location': panel_data['location'],
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            result = self.supabase.table('panels').upsert(panel_record).execute()
            created['panels'].append(result.data[0] if result.data else panel_record)
        
        # Create circuits
        main_panel_id = f"panel_main_panel_{site_id}"
        
        for circuit_data in parsed_entities['circuits']:
            circuit_record = {
                'id': f"circuit_{circuit_data['circuit_number']}_{site_id}",
                'panel_id': main_panel_id,
                'circuit_number': circuit_data['circuit_number'],
                'name': circuit_data['name'],
                'circuit_type': circuit_data['circuit_type'].value,
                'breaker_size': circuit_data['breaker_size'],
                'wire_awg': circuit_data['wire_awg'],
                'wire_length_ft': 75.0,  # Default estimate
                'wire_type': circuit_data['wire_type'],
                'voltage_rating': circuit_data['voltage_rating'],
                'ambient_temperature_c': 30.0,  # Default
                'installation_method': 'cable',
                'number_of_conductors': 3,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            result = self.supabase.table('circuits').upsert(circuit_record).execute()
            created['circuits'].append(result.data[0] if result.data else circuit_record)
        
        # Create loads (associate with circuits)
        for i, load_data in enumerate(parsed_entities['loads']):
            # Simple association: assign to circuits in order
            circuit_index = i % len(created['circuits'])
            circuit_id = created['circuits'][circuit_index]['id']
            
            load_record = {
                'id': f"load_{i}_{site_id}",
                'circuit_id': circuit_id,
                'name': load_data['name'],
                'load_type': load_data['load_type'].value,
                'nominal_voltage': load_data.get('nominal_voltage', 120.0),
                'nominal_current': load_data['nominal_current'],
                'nominal_power': load_data['nominal_power'],
                'power_factor': load_data['power_factor'],
                'starting_current_multiplier': load_data['starting_current_multiplier'],
                'diversity_factor': load_data['diversity_factor'],
                'critical_load': False,
                'harmonic_content': json.dumps({}),
                'operating_schedule': json.dumps([0.5] * 24),  # Default schedule
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            # Store in analysis engine for constraint validation
            self.analysis_engine.loads[load_record['id']] = Load(
                id=load_record['id'],
                circuit_id=circuit_id,
                name=load_data['name'],
                load_type=load_data['load_type'],
                nominal_voltage=load_data.get('nominal_voltage', 120.0),
                nominal_current=load_data['nominal_current'],
                nominal_power=load_data['nominal_power'],
                power_factor=load_data['power_factor'],
                starting_current_multiplier=load_data['starting_current_multiplier'],
                diversity_factor=load_data['diversity_factor'],
                critical_load=False,
                harmonic_content={},
                operating_schedule=[0.5] * 24
            )
            
            created['loads'].append(load_record)
        
        # Create issues
        for issue_data in parsed_entities['issues']:
            # Find matching issue category
            category_result = self.supabase.table('issue_categories').select('id').ilike('name', f"%{issue_data['type']}%").execute()
            category_id = category_result.data[0]['id'] if category_result.data else None
            
            issue_record = {
                'id': f"issue_{len(created['issues'])}_{site_id}",
                'category_id': category_id,
                'title': f"{issue_data['type'].title()} Detected",
                'description': issue_data['description'],
                'symptoms': json.dumps([issue_data['description']]),
                'severity': issue_data['severity'].value,
                'difficulty': 'medium',
                'safety_rating': 3,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            result = self.supabase.table('issues').insert(issue_record).execute()
            created['issues'].append(result.data[0] if result.data else issue_record)
        
        return created
    
    async def _validate_entities_with_constraints(self, created_entities: Dict[str, Any]) -> Dict[str, Any]:
        """Run constraint validation on created entities"""
        
        validation_results = {
            'constraints': [],
            'alerts': [],
            'analysis_runs': [],
            'overall_status': 'unknown'
        }
        
        # Validate each circuit with its loads
        for circuit_data in created_entities['circuits']:
            # Convert to analysis engine format
            circuit = Circuit(
                id=circuit_data['id'],
                panel_id=circuit_data['panel_id'],
                circuit_number=circuit_data['circuit_number'],
                name=circuit_data['name'],
                circuit_type=CircuitType(circuit_data['circuit_type']),
                breaker_size=circuit_data['breaker_size'],
                wire_awg=circuit_data['wire_awg'],
                wire_length_ft=circuit_data['wire_length_ft'],
                wire_type=circuit_data['wire_type'],
                conduit_type=None,
                conduit_fill_percentage=0.0,
                number_of_conductors=circuit_data['number_of_conductors'],
                voltage_rating=circuit_data['voltage_rating'],
                ambient_temperature_c=circuit_data['ambient_temperature_c'],
                installation_method=circuit_data['installation_method']
            )
            
            # Get loads for this circuit
            circuit_loads = [load for load in self.analysis_engine.loads.values() 
                           if load.circuit_id == circuit_data['id']]
            
            if circuit_loads:
                # Run constraint validation
                analysis_result = self.analysis_engine.add_circuit_with_validation(circuit, circuit_loads)
                
                validation_results['analysis_runs'].append({
                    'circuit_id': circuit_data['id'],
                    'status': analysis_result.status.value,
                    'risk_level': analysis_result.overall_risk_level,
                    'recommendations': analysis_result.recommendations,
                    'execution_time_ms': analysis_result.execution_time_ms
                })
                
                # Store constraints in database
                for constraint_id, constraint in self.analysis_engine.constraint_checks.items():
                    if constraint.circuit_id == circuit_data['id']:
                        constraint_record = {
                            'id': constraint_id,
                            'circuit_id': constraint.circuit_id,
                            'analysis_run_id': constraint.analysis_run_id,
                            'constraint_name': constraint.constraint_name,
                            'current_value': constraint.current_value,
                            'limit_value': constraint.limit_value,
                            'margin_percent': constraint.margin_percent,
                            'passes_check': constraint.passes_check,
                            'severity': constraint.severity.value,
                            'recommendation': constraint.recommendation,
                            'created_at': constraint.created_at.isoformat()
                        }
                        
                        validation_results['constraints'].append(constraint_record)
                
                # Store alerts
                for alert_id, alert in self.analysis_engine.alerts.items():
                    if alert.circuit_id == circuit_data['id']:
                        alert_record = {
                            'id': alert_id,
                            'circuit_id': alert.circuit_id,
                            'alert_type': alert.alert_type,
                            'severity': alert.severity.value,
                            'message': alert.message,
                            'value': alert.value,
                            'triggered_at': alert.triggered_at.isoformat(),
                            'status': 'active'
                        }
                        
                        result = self.supabase.table('alerts').insert(alert_record).execute()
                        validation_results['alerts'].append(result.data[0] if result.data else alert_record)
        
        # Determine overall status
        critical_issues = len([c for c in validation_results['constraints'] if c['severity'] == 'critical'])
        warnings = len([c for c in validation_results['constraints'] if c['severity'] == 'warning'])
        
        if critical_issues > 0:
            validation_results['overall_status'] = 'critical_issues_found'
        elif warnings > 0:
            validation_results['overall_status'] = 'warnings_found'
        else:
            validation_results['overall_status'] = 'all_constraints_passed'
        
        return validation_results
    
    # =========================================================================
    # BAYESIAN LEARNING AND OPTIMIZATION
    # =========================================================================
    
    async def _update_bayesian_learning(self, validation_results: Dict[str, Any]) -> None:
        """Update Bayesian priors based on validation results"""
        
        for analysis_run in validation_results['analysis_runs']:
            # Determine success (no critical issues)
            circuit_constraints = [c for c in validation_results['constraints'] 
                                 if c['circuit_id'] == analysis_run['circuit_id']]
            
            success = not any(c['severity'] == 'critical' for c in circuit_constraints)
            
            # Update Bayesian prior for electrical validation
            await self._update_bayesian_prior(
                task_type='electrical_validation',
                complexity_score=self._estimate_complexity(analysis_run),
                success=success,
                confidence=95 if success else 60
            )
    
    async def _update_bayesian_prior(self, task_type: str, complexity_score: int, 
                                   success: bool, confidence: float) -> None:
        """Update Bayesian prior for task type and complexity"""
        
        # Get existing prior
        result = self.supabase.table('bayesian_priors').select('*').eq('task_type', task_type).eq('complexity_score', complexity_score).execute()
        
        if result.data:
            prior = result.data[0]
            
            # Update using Bayesian update
            alpha = prior['alpha']
            beta = prior['beta']
            
            if success:
                alpha += 1
            else:
                beta += 1
            
            # Update prior
            updated_prior = {
                'alpha': alpha,
                'beta': beta,
                'prior_success_rate': alpha / (alpha + beta),
                'prior_avg_confidence': (prior['prior_avg_confidence'] + confidence) / 2,
                'sample_size': prior['sample_size'] + 1,
                'updated_at': datetime.now().isoformat()
            }
            
            self.supabase.table('bayesian_priors').update(updated_prior).eq('id', prior['id']).execute()
    
    def _estimate_complexity(self, analysis_run: Dict[str, Any]) -> int:
        """Estimate complexity score based on analysis results"""
        
        base_complexity = 1
        
        # Increase complexity based on execution time
        if analysis_run['execution_time_ms'] > 1000:
            base_complexity += 3
        elif analysis_run['execution_time_ms'] > 500:
            base_complexity += 2
        
        # Increase complexity based on recommendations
        if len(analysis_run['recommendations']) > 5:
            base_complexity += 3
        elif len(analysis_run['recommendations']) > 2:
            base_complexity += 2
        
        return min(base_complexity, 10)  # Cap at 10
    
    # =========================================================================
    # CACHE MANAGEMENT AND UTILITIES
    # =========================================================================
    
    def _load_validation_rules(self) -> None:
        """Load electrical validation rules into cache"""
        
        result = self.supabase.table('electrical_validation_rules').select('*').eq('is_active', True).execute()
        
        for rule in result.data:
            self.validation_rules_cache[rule['rule_name']] = rule
    
    def _load_bayesian_priors(self) -> None:
        """Load Bayesian priors into cache"""
        
        result = self.supabase.table('bayesian_priors').select('*').execute()
        
        for prior in result.data:
            key = f"{prior['task_type']}_{prior['complexity_score']}"
            self.bayesian_priors_cache[key] = prior
    
    def _load_issue_patterns(self) -> None:
        """Load issue patterns for matching"""
        
        result = self.supabase.table('issues').select('*').execute()
        
        for issue in result.data:
            self.issue_patterns_cache[issue['id']] = {
                'title': issue['title'],
                'symptoms': json.loads(issue['symptoms']) if issue['symptoms'] else [],
                'severity': issue['severity'],
                'category_id': issue['category_id']
            }
    
    def _calculate_parsing_confidence(self, parsed_entities: Dict[str, Any]) -> float:
        """Calculate overall confidence score for parsing results"""
        
        total_entities = sum(len(entities) for entities in parsed_entities.values() if isinstance(entities, list))
        
        if total_entities == 0:
            return 0.0
        
        # Base confidence on entity detection
        base_confidence = min(total_entities * 10, 80)  # Cap at 80%
        
        # Adjust based on entity completeness
        completeness_bonus = 0
        if parsed_entities['panels']:
            completeness_bonus += 5
        if parsed_entities['circuits']:
            completeness_bonus += 10
        if parsed_entities['loads']:
            completeness_bonus += 5
        
        return min(base_confidence + completeness_bonus, 95.0)
    
    def _calculate_entity_confidence(self, extracted: Dict[str, Any]) -> Dict[str, float]:
        """Calculate confidence scores for individual entity types"""
        
        confidence_scores = {}
        
        for entity_type, entities in extracted.items():
            if isinstance(entities, list) and entities:
                # Simple heuristic: more complete entities = higher confidence
                total_fields = 0
                complete_fields = 0
                
                for entity in entities:
                    if isinstance(entity, dict):
                        for key, value in entity.items():
                            total_fields += 1
                            if value and value != "Unknown":
                                complete_fields += 1
                
                confidence_scores[entity_type] = (complete_fields / total_fields * 100) if total_fields > 0 else 0
            else:
                confidence_scores[entity_type] = 0
        
        return confidence_scores


# =============================================================================
# REAL-TIME MONITORING AND ALERTS
# =============================================================================

class RealTimeElectricalMonitor:
    """Real-time monitoring system that bridges measurements to constraint validation"""
    
    def __init__(self, bridge: SupabaseElectriScribeBridge):
        self.bridge = bridge
        self.monitoring_active = False
    
    async def start_monitoring(self, circuits: List[str]) -> None:
        """Start real-time monitoring for specified circuits"""
        
        self.monitoring_active = True
        
        while self.monitoring_active:
            for circuit_id in circuits:
                # Simulate measurement collection
                measurement = await self._collect_measurement(circuit_id)
                
                if measurement:
                    # Store measurement
                    await self._store_measurement(measurement)
                    
                    # Check thresholds
                    alerts = await self._check_thresholds(measurement)
                    
                    # Store any new alerts
                    for alert in alerts:
                        await self._store_alert(alert)
            
            # Wait before next measurement cycle
            await asyncio.sleep(5)  # 5-second intervals
    
    async def _collect_measurement(self, circuit_id: str) -> Optional[Dict[str, Any]]:
        """Simulate measurement collection (would interface with actual hardware)"""
        
        # Simulate realistic electrical measurements with some noise
        base_current = np.random.normal(15.0, 2.0)
        base_voltage = np.random.normal(120.0, 2.0)
        power_factor = np.random.normal(0.92, 0.05)
        
        return {
            'id': f"measure_{datetime.now().timestamp()}",
            'circuit_id': circuit_id,
            'timestamp': datetime.now().isoformat(),
            'current_l1': max(0, base_current),
            'voltage_l1_n': base_voltage,
            'power_factor': np.clip(power_factor, 0.5, 1.0),
            'frequency': 60.0,
            'thd_current': np.random.normal(5.0, 1.0),
            'power_real': base_current * base_voltage * power_factor,
            'power_reactive': base_current * base_voltage * np.sqrt(1 - power_factor**2),
            'power_apparent': base_current * base_voltage,
            'temperature_c': np.random.normal(35.0, 3.0)
        }
    
    async def _store_measurement(self, measurement: Dict[str, Any]) -> None:
        """Store measurement in database"""
        
        result = self.bridge.supabase.table('measurements').insert(measurement).execute()
        return result.data[0] if result.data else None
    
    async def _check_thresholds(self, measurement: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check measurement against thresholds and generate alerts"""
        
        alerts = []
        
        # Get thresholds for this circuit (would query from database)
        # For demo, use hardcoded thresholds
        thresholds = [
            {
                'metric': 'current',
                'operator': 'gt',
                'value_max': 18.0,
                'severity': 'warning'
            },
            {
                'metric': 'voltage',
                'operator': 'lt', 
                'value_min': 114.0,
                'severity': 'warning'
            }
        ]
        
        for threshold in thresholds:
            violation = self._check_threshold_violation(measurement, threshold)
            if violation:
                alert = {
                    'id': f"alert_{datetime.now().timestamp()}",
                    'circuit_id': measurement['circuit_id'],
                    'alert_type': 'threshold_violation',
                    'severity': threshold['severity'],
                    'message': f"Threshold exceeded: {threshold['metric']} {violation['operator']} {violation['limit']}",
                    'value': violation['value'],
                    'triggered_at': measurement['timestamp'],
                    'status': 'active'
                }
                alerts.append(alert)
        
        return alerts
    
    def _check_threshold_violation(self, measurement: Dict[str, Any], threshold: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Check if measurement violates threshold"""
        
        metric_map = {
            'current': 'current_l1',
            'voltage': 'voltage_l1_n',
            'power_factor': 'power_factor',
            'thd_current': 'thd_current',
            'temperature': 'temperature_c'
        }
        
        metric_key = metric_map.get(threshold['metric'])
        if not metric_key or metric_key not in measurement:
            return None
        
        measured_value = measurement[metric_key]
        
        # Check threshold conditions
        violated = False
        
        if threshold['operator'] == 'gt' and 'value_max' in threshold:
            violated = measured_value > threshold['value_max']
            limit = threshold['value_max']
        elif threshold['operator'] == 'lt' and 'value_min' in threshold:
            violated = measured_value < threshold['value_min']
            limit = threshold['value_min']
        
        if violated:
            return {
                'metric': threshold['metric'],
                'value': measured_value,
                'operator': threshold['operator'],
                'limit': limit
            }
        
        return None
    
    async def _store_alert(self, alert: Dict[str, Any]) -> None:
        """Store alert in database"""
        
        result = self.bridge.supabase.table('alerts').insert(alert).execute()
        return result.data[0] if result.data else None
    
    def stop_monitoring(self) -> None:
        """Stop real-time monitoring"""
        self.monitoring_active = False


# =============================================================================
# DEMO AND USAGE EXAMPLE
# =============================================================================

async def demo_integration():
    """Demonstrate the complete integration pipeline"""
    
    # Initialize bridge (would use real Supabase credentials)
    bridge = SupabaseElectriScribeBridge(
        supabase_url="your_supabase_url",
        supabase_key="your_supabase_anon_key"
    )
    
    # Example field notes from the screenshot
    field_notes = """
    PANEL SPECIFICATIONS
    - Main Panel: 200A service
    - Panel Type: Square D QO (assumed - confirm with electrician)
    - Available Slots: 17-19 (free dryer MWBC), potentially 21-24
    - Phase Configuration: Split-phase 240V service (L1/L2/Neutral/Ground)
    
    CURRENT CIRCUIT MAPPING
    
    LEFT SIDE (L1) - ODD NUMBERS
    | 1     | Tandem     | Heat Pump (Leg A) + Home Theater Nook  |
    | 1-3   | MWBC Tie   | Heat Pump (2-pole, Goodman 2-stage)   |
    | 3     | Tandem     | Heat Pump (Leg B) + Front Basement     |
    | 5     | Tandem     | Family Room (Lights & Plugs)           |
    | 5-7   | MWBC Tie   | Playroom/Living/Office/Kitchen Lights  |
    | 7     | Tandem     | Patio Junction Box                     |
    | 9     | Tandem     | Dishwasher                             |
    | 9-11  | MWBC Tie   | Kitchen Counter Plugs (Center & Left)  |
    | 11    | Tandem     | Garburator (Disposal)                  |
    | 17-19 | AVAILABLE  | Old Dryer Circuit - can repurpose      |
    
    RIGHT SIDE (L2) - EVEN NUMBERS  
    | 6-8   | 2-Pole     | 60A Feeder to Oven/Steam Subpanel     |
    | 10    | Tandem     | New Microwave + MWBC (Lights)          |
    | 12    | Tandem     | Furnace + MWBC (Plugs)                 |
    | 14    | Tandem     | Fridge + MWBC (Bedroom Lights)         |
    | 18    | Tandem     | Garage Plugs & Lights                  |
    | 20    | Tandem     | Washer                                 |
    """
    
    # Process field notes
    print("Processing field notes...")
    result = await bridge.parse_field_notes_to_entities(field_notes, "demo_site_001")
    
    print(f"Parsing confidence: {result['processing_metadata']['confidence_score']:.1f}%")
    print(f"Entities created: {result['processing_metadata']['entities_created']}")
    print(f"Constraints checked: {result['processing_metadata']['constraints_checked']}")
    
    # Show validation results
    validation = result['validation_results']
    print(f"\nValidation status: {validation['overall_status']}")
    print(f"Critical issues: {len([c for c in validation['constraints'] if c['severity'] == 'critical'])}")
    print(f"Warnings: {len([c for c in validation['constraints'] if c['severity'] == 'warning'])}")
    
    # Start real-time monitoring for demo
    monitor = RealTimeElectricalMonitor(bridge)
    
    # Get circuit IDs from created entities
    circuit_ids = [circuit['id'] for circuit in result['created_entities']['circuits']]
    
    print(f"\nStarting real-time monitoring for {len(circuit_ids)} circuits...")
    
    # Run monitoring for a short demo period
    monitoring_task = asyncio.create_task(monitor.start_monitoring(circuit_ids))
    
    # Let it run for 30 seconds
    await asyncio.sleep(30)
    
    monitor.stop_monitoring()
    await monitoring_task
    
    print("Demo completed!")

if __name__ == "__main__":
    asyncio.run(demo_integration())
