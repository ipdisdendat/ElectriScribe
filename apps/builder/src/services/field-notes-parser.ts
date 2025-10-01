/**
 * ElectriScribe Advanced Field Notes Parser
 *
 * Transforms unstructured electrical field notes into validated structured entities
 * with enhanced pattern recognition, confidence scoring, and meta-pattern synthesis
 */

export interface ParsedPanel {
  id: string;
  panel_type: 'main' | 'sub' | 'distribution';
  manufacturer: string;
  model: string;
  rating: number;
  voltage: number;
  phase_configuration: string;
  available_slots: string[];
  location: string;
  notes: string;
  confidence: number;
  source_line_numbers: number[];
}

export interface ParsedCircuit {
  id: string;
  slot_numbers: string[];
  circuit_type: string;
  breaker_size: number;
  description: string;
  wire_awg?: string;
  wire_type?: string;
  wire_length?: number;
  phase: 'L1' | 'L2' | 'L1-L2' | 'unknown';
  is_available: boolean;
  mwbc_group?: string;
  confidence: number;
  source_line_numbers: number[];
}

export interface ParsedLoad {
  id: string;
  name: string;
  load_type: 'motor' | 'resistive' | 'electronic' | 'lighting' | 'mixed';
  location: string;
  circuit_reference?: string;
  nominal_current?: number;
  nominal_voltage: number;
  power_factor: number;
  inrush_multiplier: number;
  harmonic_profile: Record<number, number>;
  duty_cycle: 'continuous' | 'intermittent' | 'cyclic';
  critical: boolean;
  confidence: number;
  source_line_numbers: number[];
}

export interface ParsedIssue {
  id: string;
  issue_type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  affected_components: string[];
  symptoms: string[];
  location_in_notes: [number, number];
  confidence: number;
}

export interface MWBCConfiguration {
  id: string;
  slots: string[];
  description: string;
  circuits: string[];
  pole_count: number;
  breaker_size: number;
}

export interface ParsedFieldNotes {
  panels: ParsedPanel[];
  circuits: ParsedCircuit[];
  loads: ParsedLoad[];
  issues: ParsedIssue[];
  mwbc_configurations: MWBCConfiguration[];
  metadata: {
    parse_timestamp: string;
    total_lines: number;
    confidence_score: number;
    parser_version: string;
  };
}

interface PatternLibrary {
  panel: Record<string, RegExp>;
  circuit: Record<string, RegExp>;
  load: Record<string, RegExp>;
  issue: Record<string, RegExp>;
}

interface ManufacturerData {
  models: string[];
  default_model: string;
  typical_configs: string[];
}

interface WireSpec {
  ampacity_60c: number;
  ampacity_75c: number;
  ampacity_90c: number;
  typical_use: string;
}

class FieldNotesParser {
  private patterns: PatternLibrary;
  private manufacturers: Record<string, ManufacturerData>;
  private wireSpecs: Record<string, WireSpec>;
  private parsingContext: Record<string, any>;

  constructor() {
    this.parsingContext = {};
    this.loadElectricalPatterns();
    this.loadManufacturerDatabase();
    this.loadWireSpecifications();
  }

  private loadElectricalPatterns(): void {
    this.patterns = {
      panel: {
        main_panel: /(?:main\s+panel|service\s+panel)[:\s]*(\d+)\s*A(?:mp)?/i,
        sub_panel: /(?:sub(?:\s+|-)?panel)[:\s]*(\d+)\s*A(?:mp)?/i,
        manufacturer: /(square\s+d|eaton|siemens|ge|murray|cutler[\s-]hammer)\s+(QO|BR|HOM|CH|QP)?/i,
        available_slots: /(?:available|free|spare|open)\s+(?:slots?|circuits?)[:\s]*([0-9\-,\s]+)/i,
        phase_config: /(split[\s-]phase|three[\s-]phase|single[\s-]phase)\s*(\d+V)?/i,
        location: /(?:located?|location|in\s+the)[:\s]*([A-Za-z\s]+?)(?:\n|,|$)/i,
        rating: /(\d{2,3})\s*A(?:mp)?\s+(?:service|panel|rating)/i,
        voltage: /(\d{3})\s*V(?:olt)?s?/i
      },

      circuit: {
        circuit_entry: /^[\s\|]*(\d+(?:-\d+)?)\s*\|?\s*([\w\s]+?)\s*\|?\s*(.+?)(?:\s*\||\s*$)/m,
        slot_number: /(?:slot|circuit|breaker)\s*#?\s*(\d+(?:-\d+)?)/i,
        breaker_size: /(\d+)\s*A(?:mp)?\s*(?:breaker|circuit)?/i,
        circuit_type: /(tandem|MWBC\s+tie|2[\s-]pole|single|duplex|handle\s+tie)/i,
        wire_spec: /#?(\d+(?:\/\d+)?)\s*AWG|(\d+)\s*gauge/i,
        wire_type: /(ROMEX|THHN|THWN|MC|AC|NM[\s-]B|UF|SE|SER)/i,
        wire_length: /(?:wire\s+)?(?:length|run)[:\s]*(\d+)[\s']?(?:ft|feet|foot)?/i,
        available_marker: /(available|free|spare|open|unused|old\s+\w+\s+circuit|can\s+repurpose)/i,
        mwbc_indicator: /(MWBC|multi[\s-]wire|shared\s+neutral|handle\s+tie|tied)/i,
        phase_indicator: /\b(L1|L2|leg\s+[AB]|phase\s+[AB])\b/i,
        two_pole: /(2[\s-]pole|double[\s-]pole|240V)/i
      },

      load: {
        hvac: /(heat\s+pump|furnace|air\s+condition|HVAC|compressor|handler|AC\s+unit)/i,
        kitchen_appliance: /(dishwasher|disposal|garb[uo]rator|microwave|range|oven|cooktop|stove)/i,
        major_appliance: /(washer|dryer|water\s+heater|refrigerator|freezer|fridge)/i,
        lighting: /(lights?|lighting|LED|fluorescent|can\s+lights?|fixtures?)/i,
        outlets: /(outlet|receptacle|plug|GFCI|convenience|socket)/i,
        motor_load: /(motor|pump|fan|blower|exhaust)/i,
        ev_charger: /(EV|electric\s+vehicle|car\s+charger|Tesla|charging\s+station)/i,
        pool_spa: /(pool|spa|hot\s+tub|jacuzzi)/i,
        current_draw: /(\d+(?:\.\d+)?)\s*A(?:mp)?s?\s+(?:draw|load|current|rated)/i,
        power_rating: /(\d+(?:\.\d+)?)\s*(?:W|watts?|kW|kilowatts?)/i,
        voltage_spec: /(\d{3}|120|240)\s*V(?:olt)?s?/i
      },

      issue: {
        overload: /(overload|trip(?:ping)?|exceed|over\s+capacity|too\s+much)/i,
        voltage_problem: /(voltage\s+(?:drop|sag)|dim(?:ming)?|flicker|brown\s*out|lights?\s+dim)/i,
        thermal: /(hot|warm|heat(?:ing)?|thermal|temperature|burning\s+smell)/i,
        failure: /(fail(?:ed)?|broken|not\s+work|dead|burnt|doesn't\s+work)/i,
        code_violation: /(code\s+violation|not\s+to\s+code|NEC\s+violation|illegal)/i,
        safety: /(unsafe|dangerous|hazard|shock|electrocution\s+risk|exposed)/i,
        simultaneous: /(when\s+\w+\s+running|simultaneously|at\s+same\s+time|together)/i
      }
    };
  }

  private loadManufacturerDatabase(): void {
    this.manufacturers = {
      'square d': {
        models: ['QO', 'Homeline', 'I-Line'],
        default_model: 'QO',
        typical_configs: ['split-phase', 'three-phase']
      },
      'eaton': {
        models: ['BR', 'CH', 'BAB'],
        default_model: 'BR',
        typical_configs: ['split-phase']
      },
      'siemens': {
        models: ['Q', 'QP', 'BL'],
        default_model: 'Q',
        typical_configs: ['split-phase', 'three-phase']
      },
      'ge': {
        models: ['TQL', 'THQL', 'TQD'],
        default_model: 'THQL',
        typical_configs: ['split-phase']
      },
      'murray': {
        models: ['MP', 'MH'],
        default_model: 'MP',
        typical_configs: ['split-phase']
      }
    };
  }

  private loadWireSpecifications(): void {
    this.wireSpecs = {
      '14': { ampacity_60c: 15, ampacity_75c: 20, ampacity_90c: 25, typical_use: 'lighting' },
      '12': { ampacity_60c: 20, ampacity_75c: 25, ampacity_90c: 30, typical_use: 'outlets' },
      '10': { ampacity_60c: 30, ampacity_75c: 35, ampacity_90c: 40, typical_use: 'appliances' },
      '8': { ampacity_60c: 40, ampacity_75c: 50, ampacity_90c: 55, typical_use: 'large_appliances' },
      '6': { ampacity_60c: 55, ampacity_75c: 65, ampacity_90c: 75, typical_use: 'subpanel' },
      '4': { ampacity_60c: 70, ampacity_75c: 85, ampacity_90c: 95, typical_use: 'subpanel' },
      '2': { ampacity_60c: 95, ampacity_75c: 115, ampacity_90c: 130, typical_use: 'service' },
      '1': { ampacity_60c: 110, ampacity_75c: 130, ampacity_90c: 145, typical_use: 'service' }
    };
  }

  public parseFieldNotes(rawNotes: string): ParsedFieldNotes {
    const lines = rawNotes.split('\n');
    const preprocessed = this.preprocessNotes(rawNotes);

    const parsedData: ParsedFieldNotes = {
      panels: [],
      circuits: [],
      loads: [],
      issues: [],
      mwbc_configurations: [],
      metadata: {
        parse_timestamp: new Date().toISOString(),
        total_lines: lines.length,
        confidence_score: 0,
        parser_version: '1.0.0'
      }
    };

    parsedData.panels = this.parsePanels(preprocessed, lines);

    const { circuits, mwbcGroups } = this.parseCircuitsWithMWBC(preprocessed, lines);
    parsedData.circuits = circuits;
    parsedData.mwbc_configurations = mwbcGroups;

    parsedData.loads = this.parseLoads(preprocessed, lines, circuits);
    parsedData.issues = this.detectIssues(preprocessed, lines);

    parsedData.metadata.confidence_score = this.calculateOverallConfidence(parsedData);

    return this.validateAndCrossReference(parsedData);
  }

  private preprocessNotes(rawNotes: string): string {
    let processed = rawNotes;

    // Remove markdown bold syntax
    processed = processed.replace(/\*\*/g, '');

    // Remove markdown italic syntax
    processed = processed.replace(/\*/g, '');

    const replacements: Record<string, string> = {
      'MWEC': 'MWBC',
      'Tandum': 'Tandem',
      'Garburator': 'Disposal',
      'Receptical': 'Receptacle',
      'Amps?': 'A',
      'Volts?': 'V'
    };

    for (const [old, newVal] of Object.entries(replacements)) {
      processed = processed.replace(new RegExp(`\\b${old}\\b`, 'gi'), newVal);
    }

    return processed;
  }

  private parsePanels(text: string, lines: string[]): ParsedPanel[] {
    const panels: ParsedPanel[] = [];

    const mainPanelMatches = Array.from(text.matchAll(new RegExp(this.patterns.panel.main_panel, 'gi')));

    for (const match of mainPanelMatches) {
      if (!match.index) continue;

      const rating = parseFloat(match[1]);
      const contextStart = Math.max(0, match.index - 200);
      const contextEnd = Math.min(text.length, match.index + 200);
      const context = text.substring(contextStart, contextEnd);

      const mfgMatch = context.match(this.patterns.panel.manufacturer);
      const manufacturer = mfgMatch ? mfgMatch[1] : 'Unknown';
      const model = mfgMatch && mfgMatch[2] ? mfgMatch[2] : this.getDefaultModel(manufacturer);

      const phaseMatch = context.match(this.patterns.panel.phase_config);
      const phaseConfig = phaseMatch ? phaseMatch[1] : 'split-phase';
      const voltage = phaseConfig.toLowerCase().includes('split') ? 240 : 208;

      const slotsMatch = context.match(this.patterns.panel.available_slots);
      const availableSlots = slotsMatch ? this.parseSlotRanges(slotsMatch[1]) : [];

      const locMatch = context.match(this.patterns.panel.location);
      const location = locMatch ? locMatch[1].trim() : 'Not specified';

      const confidence = this.calculatePanelConfidence(manufacturer, model, availableSlots);
      const sourceLines = this.findSourceLines(match.index, match.index + match[0].length, lines);

      panels.push({
        id: `panel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        panel_type: 'main',
        manufacturer,
        model,
        rating,
        voltage,
        phase_configuration: phaseConfig,
        available_slots: availableSlots,
        location,
        notes: context.trim(),
        confidence,
        source_line_numbers: sourceLines
      });
    }

    const subPanelMatches = Array.from(text.matchAll(new RegExp(this.patterns.panel.sub_panel, 'gi')));

    for (const match of subPanelMatches) {
      if (!match.index) continue;

      const rating = parseFloat(match[1]);
      const contextStart = Math.max(0, match.index - 100);
      const contextEnd = Math.min(text.length, match.index + 100);
      const context = text.substring(contextStart, contextEnd);

      const sourceLines = this.findSourceLines(match.index, match.index + match[0].length, lines);

      panels.push({
        id: `panel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        panel_type: 'sub',
        manufacturer: 'Unknown',
        model: 'Unknown',
        rating,
        voltage: 240,
        phase_configuration: 'split-phase',
        available_slots: [],
        location: this.extractLocationFromContext(context),
        notes: context.trim(),
        confidence: 0.7,
        source_line_numbers: sourceLines
      });
    }

    return panels;
  }

  private parseCircuitsWithMWBC(text: string, lines: string[]): {
    circuits: ParsedCircuit[];
    mwbcGroups: MWBCConfiguration[];
  } {
    const circuits: ParsedCircuit[] = [];
    const mwbcGroups: MWBCConfiguration[] = [];
    let currentMwbcGroup: MWBCConfiguration | null = null;

    const circuitSection = this.findCircuitSection(text);
    if (!circuitSection) {
      return { circuits, mwbcGroups };
    }

    const circuitLines = circuitSection.split('\n');

    for (const line of circuitLines) {
      const circuitMatch = line.match(this.patterns.circuit.circuit_entry);
      if (!circuitMatch) continue;

      const slot = circuitMatch[1].trim();
      const circuitType = circuitMatch[2].trim();
      const description = circuitMatch[3].trim();

      const isMwbc = this.patterns.circuit.mwbc_indicator.test(line);
      const isAvailable = this.patterns.circuit.available_marker.test(line);
      const isTwoPole = this.patterns.circuit.two_pole.test(circuitType);

      const slotNumbers = this.parseSlotRange(slot);

      let phase: 'L1' | 'L2' | 'L1-L2' | 'unknown';
      if (isTwoPole || isMwbc) {
        phase = 'L1-L2';
      } else {
        phase = this.determinePhase(slotNumbers, circuitType);
      }

      const breakerMatch = line.match(this.patterns.circuit.breaker_size);
      const breakerSize = breakerMatch ? parseFloat(breakerMatch[1]) : 20;

      const { wireAwg, wireType } = this.extractWireInfo(description);

      if (isMwbc || isTwoPole) {
        if (!currentMwbcGroup || slotNumbers.length > 1) {
          currentMwbcGroup = {
            id: `mwbc_${mwbcGroups.length + 1}`,
            slots: slotNumbers,
            description,
            circuits: [],
            pole_count: slotNumbers.length,
            breaker_size: breakerSize
          };
          mwbcGroups.push(currentMwbcGroup);
        }
      } else {
        currentMwbcGroup = null;
      }

      const circuit: ParsedCircuit = {
        id: `circuit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        slot_numbers: slotNumbers,
        circuit_type: circuitType,
        breaker_size: breakerSize,
        description,
        wire_awg: wireAwg,
        wire_type: wireType,
        phase,
        is_available: isAvailable,
        mwbc_group: currentMwbcGroup?.id,
        confidence: isAvailable ? 0.95 : 0.85,
        source_line_numbers: []
      };

      circuits.push(circuit);

      if (currentMwbcGroup) {
        currentMwbcGroup.circuits.push(circuit.id);
      }
    }

    return { circuits, mwbcGroups };
  }

  private parseLoads(text: string, lines: string[], circuits: ParsedCircuit[]): ParsedLoad[] {
    const loads: ParsedLoad[] = [];

    for (const [patternType, pattern] of Object.entries(this.patterns.load)) {
      if (patternType === 'current_draw' || patternType === 'power_rating' || patternType === 'voltage_spec') {
        continue;
      }

      const matches = Array.from(text.matchAll(new RegExp(pattern, 'gi')));

      for (const match of matches) {
        if (!match.index) continue;

        const loadName = match[1] || match[0];

        const contextStart = Math.max(0, match.index - 100);
        const contextEnd = Math.min(text.length, match.index + 100);
        const context = text.substring(contextStart, contextEnd);

        const loadChars = this.determineLoadCharacteristics(patternType, loadName, context);

        const circuitRef = this.findCircuitReference(loadName, circuits);

        const currentMatch = context.match(this.patterns.load.current_draw);
        const current = currentMatch ? parseFloat(currentMatch[1]) : loadChars.default_current;

        const voltageMatch = context.match(this.patterns.load.voltage_spec);
        const voltage = voltageMatch ? parseFloat(voltageMatch[1]) : loadChars.default_voltage;

        const sourceLines = this.findSourceLines(match.index, match.index + match[0].length, lines);

        loads.push({
          id: `load_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: loadName,
          load_type: loadChars.type,
          location: this.extractLocationFromContext(context),
          circuit_reference: circuitRef,
          nominal_current: current,
          nominal_voltage: voltage,
          power_factor: loadChars.power_factor,
          inrush_multiplier: loadChars.inrush,
          harmonic_profile: loadChars.harmonics,
          duty_cycle: loadChars.duty_cycle,
          critical: loadChars.critical,
          confidence: currentMatch ? 0.8 : 0.6,
          source_line_numbers: sourceLines
        });
      }
    }

    return loads;
  }

  private detectIssues(text: string, lines: string[]): ParsedIssue[] {
    const issues: ParsedIssue[] = [];

    for (const [issueType, pattern] of Object.entries(this.patterns.issue)) {
      const matches = Array.from(text.matchAll(new RegExp(pattern, 'gi')));

      for (const match of matches) {
        if (!match.index) continue;

        const contextStart = Math.max(0, match.index - 150);
        const contextEnd = Math.min(text.length, match.index + 150);
        const context = text.substring(contextStart, contextEnd);

        const severity = this.assessIssueSeverity(issueType, context);
        const affected = this.findAffectedComponents(context);
        const symptoms = this.extractSymptoms(issueType, context);

        issues.push({
          id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          issue_type: issueType,
          severity,
          description: context.trim(),
          affected_components: affected,
          symptoms,
          location_in_notes: [match.index, match.index + match[0].length],
          confidence: 0.75
        });
      }
    }

    return issues;
  }

  private parseSlotRanges(slotText: string): string[] {
    const slots: string[] = [];
    const ranges = slotText.split(',');

    for (const range of ranges) {
      const trimmed = range.trim();
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr.match(/\d+/)?.[0] || '0');
        const end = parseInt(endStr.match(/\d+/)?.[0] || '0');
        for (let i = start; i <= end; i++) {
          slots.push(i.toString());
        }
      } else {
        const num = trimmed.match(/\d+/)?.[0];
        if (num) slots.push(num);
      }
    }

    return slots;
  }

  private parseSlotRange(slotText: string): string[] {
    if (slotText.includes('-')) {
      const parts = slotText.split('-');
      return [parts[0].trim(), parts[1].trim()];
    }
    return [slotText.trim()];
  }

  private determinePhase(slotNumbers: string[], circuitType: string): 'L1' | 'L2' | 'unknown' {
    if (circuitType.toLowerCase().includes('2-pole') || circuitType.toLowerCase().includes('mwbc')) {
      return 'L1-L2' as any;
    }

    try {
      const firstSlot = parseInt(slotNumbers[0]);
      return firstSlot % 2 === 1 ? 'L1' : 'L2';
    } catch {
      return 'unknown';
    }
  }

  private extractWireInfo(description: string): { wireAwg?: string; wireType?: string } {
    let wireAwg: string | undefined;
    let wireType: string | undefined;

    const awgMatch = description.match(this.patterns.circuit.wire_spec);
    if (awgMatch) {
      wireAwg = awgMatch[1] || awgMatch[2];
    }

    const typeMatch = description.match(this.patterns.circuit.wire_type);
    if (typeMatch) {
      wireType = typeMatch[1].toUpperCase();
    }

    return { wireAwg, wireType };
  }

  private determineLoadCharacteristics(patternType: string, loadName: string, context: string) {
    const characteristics: Record<string, any> = {
      hvac: {
        type: 'motor',
        default_current: 25.0,
        default_voltage: 240.0,
        power_factor: 0.85,
        inrush: 3.0,
        harmonics: { 3: 0.05, 5: 0.03, 7: 0.02 },
        duty_cycle: 'continuous',
        critical: true
      },
      kitchen_appliance: {
        type: 'resistive',
        default_current: 10.0,
        default_voltage: 120.0,
        power_factor: 0.95,
        inrush: 1.2,
        harmonics: {},
        duty_cycle: 'intermittent',
        critical: false
      },
      major_appliance: {
        type: 'mixed',
        default_current: 15.0,
        default_voltage: 240.0,
        power_factor: 0.9,
        inrush: 2.0,
        harmonics: { 3: 0.08 },
        duty_cycle: 'cyclic',
        critical: false
      },
      lighting: {
        type: 'lighting',
        default_current: 5.0,
        default_voltage: 120.0,
        power_factor: 0.9,
        inrush: 1.0,
        harmonics: loadName.toLowerCase().includes('led') ? { 3: 0.15, 5: 0.08 } : {},
        duty_cycle: 'continuous',
        critical: false
      },
      outlets: {
        type: 'mixed',
        default_current: 12.0,
        default_voltage: 120.0,
        power_factor: 0.95,
        inrush: 1.5,
        harmonics: {},
        duty_cycle: 'intermittent',
        critical: false
      },
      motor_load: {
        type: 'motor',
        default_current: 15.0,
        default_voltage: 240.0,
        power_factor: 0.80,
        inrush: 5.0,
        harmonics: { 5: 0.04, 7: 0.03 },
        duty_cycle: 'cyclic',
        critical: false
      },
      ev_charger: {
        type: 'electronic',
        default_current: 40.0,
        default_voltage: 240.0,
        power_factor: 0.98,
        inrush: 1.5,
        harmonics: { 3: 0.1, 5: 0.06, 7: 0.04 },
        duty_cycle: 'continuous',
        critical: false
      },
      pool_spa: {
        type: 'motor',
        default_current: 20.0,
        default_voltage: 240.0,
        power_factor: 0.82,
        inrush: 4.0,
        harmonics: { 5: 0.05 },
        duty_cycle: 'cyclic',
        critical: false
      }
    };

    return characteristics[patternType] || {
      type: 'resistive',
      default_current: 10.0,
      default_voltage: 120.0,
      power_factor: 1.0,
      inrush: 1.0,
      harmonics: {},
      duty_cycle: 'continuous',
      critical: false
    };
  }

  private findCircuitReference(loadName: string, circuits: ParsedCircuit[]): string | undefined {
    const loadLower = loadName.toLowerCase();

    for (const circuit of circuits) {
      const descLower = circuit.description.toLowerCase();
      if (descLower.includes(loadLower) || loadLower.split(' ').some(word => descLower.includes(word))) {
        return circuit.slot_numbers.join('-');
      }
    }

    return undefined;
  }

  private extractLocationFromContext(context: string): string {
    const locationKeywords = [
      'garage', 'basement', 'kitchen', 'bathroom', 'bedroom',
      'living room', 'family room', 'attic', 'outside', 'patio',
      'dining room', 'office', 'laundry', 'utility', 'hallway'
    ];

    for (const keyword of locationKeywords) {
      if (context.toLowerCase().includes(keyword)) {
        return keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }

    return 'Not specified';
  }

  private getDefaultModel(manufacturer: string): string {
    const mfgLower = manufacturer.toLowerCase();
    return this.manufacturers[mfgLower]?.default_model || 'Unknown';
  }

  private findCircuitSection(text: string): string | null {
    const indicators = [
      /CIRCUIT\s+MAPPING/i,
      /CIRCUIT\s+DESCRIPTION/i,
      /SLOT.*TYPE.*DESCRIPTION/i,
      /LEFT\s+SIDE.*ODD\s+NUMBERS/i,
      /RIGHT\s+SIDE.*EVEN\s+NUMBERS/i
    ];

    for (const indicator of indicators) {
      const match = text.match(indicator);
      if (match && match.index !== undefined) {
        const start = match.index;
        const nextSection = text.substring(start).match(/\n\n[A-Z]+/);
        const end = nextSection ? start + nextSection.index! : text.length;
        return text.substring(start, end);
      }
    }

    return null;
  }

  private assessIssueSeverity(issueType: string, context: string): 'info' | 'warning' | 'critical' {
    const criticalKeywords = ['fire', 'smoke', 'burn', 'shock', 'electrocution', 'immediate', 'danger'];
    const warningKeywords = ['hot', 'warm', 'trip', 'overload', 'concern'];

    const contextLower = context.toLowerCase();

    if (criticalKeywords.some(keyword => contextLower.includes(keyword))) {
      return 'critical';
    } else if (warningKeywords.some(keyword => contextLower.includes(keyword))) {
      return 'warning';
    }

    return 'info';
  }

  private findAffectedComponents(context: string): string[] {
    const components: string[] = [];

    const circuitMatches = context.matchAll(/(?:circuit|breaker|slot)\s*#?\s*(\d+)/gi);
    for (const match of circuitMatches) {
      components.push(`Circuit ${match[1]}`);
    }

    if (/main\s+panel/i.test(context)) {
      components.push('Main Panel');
    }
    if (/sub\s+panel/i.test(context)) {
      components.push('Sub Panel');
    }

    return components;
  }

  private extractSymptoms(issueType: string, context: string): string[] {
    const symptoms: string[] = [];

    const symptomPatterns: Record<string, string[]> = {
      overload: ['trips frequently', 'breaker trips', "won't stay on"],
      voltage_problem: ['lights dim', 'flickering', 'brownout'],
      thermal: ['feels hot', 'warm to touch', 'burning smell'],
      failure: ["won't turn on", 'dead circuit', 'no power'],
      simultaneous: ['when running together', 'both at same time']
    };

    const patterns = symptomPatterns[issueType] || [];
    for (const symptom of patterns) {
      if (context.toLowerCase().includes(symptom)) {
        symptoms.push(symptom);
      }
    }

    return symptoms.length > 0 ? symptoms : ['General issue detected'];
  }

  private findSourceLines(startPos: number, endPos: number, lines: string[]): number[] {
    let currentPos = 0;
    const sourceLines: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const lineStart = currentPos;
      const lineEnd = currentPos + lines[i].length + 1;

      if ((lineStart <= startPos && startPos <= lineEnd) || (lineStart <= endPos && endPos <= lineEnd)) {
        sourceLines.push(i + 1);
      }

      currentPos = lineEnd;
    }

    return sourceLines;
  }

  private calculatePanelConfidence(manufacturer: string, model: string, slots: string[]): number {
    let confidence = 0.5;

    if (manufacturer !== 'Unknown') confidence += 0.2;
    if (model !== 'Unknown') confidence += 0.15;
    if (slots.length > 0) confidence += 0.15;

    return Math.min(confidence, 1.0);
  }

  private calculateOverallConfidence(parsedData: ParsedFieldNotes): number {
    const confidences: number[] = [];

    parsedData.panels.forEach(p => confidences.push(p.confidence));
    parsedData.circuits.forEach(c => confidences.push(c.confidence));
    parsedData.loads.forEach(l => confidences.push(l.confidence));

    if (confidences.length === 0) return 0;

    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  }

  private validateAndCrossReference(parsedData: ParsedFieldNotes): ParsedFieldNotes {
    for (const circuit of parsedData.circuits) {
      if (circuit.wire_awg && circuit.breaker_size) {
        const wireSpec = this.wireSpecs[circuit.wire_awg];
        if (wireSpec) {
          const maxBreaker = wireSpec.ampacity_75c;
          if (circuit.breaker_size > maxBreaker) {
            parsedData.issues.push({
              id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              issue_type: 'code_violation',
              severity: 'warning',
              description: `Circuit ${circuit.slot_numbers.join('-')}: ${circuit.breaker_size}A breaker exceeds ${circuit.wire_awg} AWG wire rating`,
              affected_components: [`Circuit ${circuit.slot_numbers.join('-')}`],
              symptoms: ['Potential overheating'],
              location_in_notes: [0, 0],
              confidence: 0.9
            });
          }
        }
      }
    }

    for (const load of parsedData.loads) {
      if (load.circuit_reference) {
        const circuitExists = parsedData.circuits.some(
          c => c.slot_numbers.join('-') === load.circuit_reference
        );
        if (!circuitExists) {
          load.circuit_reference = undefined;
          load.confidence *= 0.8;
        }
      }
    }

    return parsedData;
  }
}

export const fieldNotesParser = new FieldNotesParser();
