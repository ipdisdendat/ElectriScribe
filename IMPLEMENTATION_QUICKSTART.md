# ElectriScribe Implementation Quick Start

**For the Development Team: Get Started in 1 Hour**

---

## PHASE 1: MVP SETUP (Week 1)

### Day 1: Environment Setup

**1. Install React Native Development Environment**

```bash
# macOS (for iOS development)
brew install node watchman
sudo gem install cocoapods

# Install React Native CLI
npm install -g react-native-cli

# Verify Xcode installed (App Store)
xcode-select --install
```

**2. Create React Native Project**

```bash
# Create new project with TypeScript
npx react-native init ElectriScribe --template react-native-template-typescript

cd ElectriScribe

# Test on iOS simulator
npx react-native run-ios

# Test on Android emulator
npx react-native run-android
```

**3. Install Core Dependencies**

```bash
# Offline database
npm install @nozbe/watermelondb @nozbe/with-observables
npm install --save-dev @babel/plugin-proposal-decorators

# Camera
npm install react-native-vision-camera
npx pod-install # iOS only

# OCR Runtime
npm install onnxruntime-react-native
npm install react-native-fs # File system access

# Navigation
npm install @react-navigation/native @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
```

**4. Configure WatermelonDB**

```javascript
// babel.config.js
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
  ],
};
```

```typescript
// src/database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'panels',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'location', type: 'string' },
        { name: 'photo_path', type: 'string' },
        { name: 'rating_amps', type: 'number' },
        { name: 'voltage', type: 'number' },
        { name: 'panel_type', type: 'string' },
        { name: 'ocr_confidence', type: 'number' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'circuits',
      columns: [
        { name: 'panel_id', type: 'string', isIndexed: true },
        { name: 'circuit_number', type: 'number' },
        { name: 'label', type: 'string' },
        { name: 'breaker_amps', type: 'number' },
        { name: 'breaker_type', type: 'string' },
        { name: 'wire_gauge', type: 'number', isOptional: true },
        { name: 'is_240v', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
```

```typescript
// src/database/index.ts
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from './schema';
import { Panel, Circuit } from './models';

const adapter = new SQLiteAdapter({
  schema,
  dbName: 'ElectriScribe',
  jsi: true, // Use JSI on iOS for 10x speed
});

export const database = new Database({
  adapter,
  modelClasses: [Panel, Circuit],
});
```

---

## PHASE 2: CAMERA INTEGRATION (Week 2)

### Camera Component

```typescript
// src/screens/CameraScreen.tsx
import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useNavigation } from '@react-navigation/native';

export function CameraScreen() {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const navigation = useNavigation();
  const [isCapturing, setIsCapturing] = useState(false);

  // Request camera permissions
  React.useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      if (status !== 'granted') {
        alert('Camera permission required');
      }
    })();
  }, []);

  const takePhoto = async () => {
    if (!camera.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'balanced',
        enableShutterSound: false,
      });

      // Navigate to OCR processing screen
      navigation.navigate('ProcessPhoto', { photoPath: photo.path });
    } catch (error) {
      console.error('Photo capture failed:', error);
      alert('Failed to capture photo');
    } finally {
      setIsCapturing(false);
    }
  };

  if (!device) {
    return (
      <View style={styles.container}>
        <Text>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        device={device}
        photo={true}
        isActive={true}
        style={StyleSheet.absoluteFill}
      />

      {/* Shutter button */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={takePhoto}
          disabled={isCapturing}
          style={styles.shutterButton}
        >
          <View style={styles.shutterInner} />
        </TouchableOpacity>
      </View>

      {/* Grid overlay for alignment */}
      <View style={styles.gridOverlay}>
        <View style={styles.gridLine} />
        <View style={[styles.gridLine, styles.gridLineVertical]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    top: '33.3%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridLineVertical: {
    top: 0,
    bottom: 0,
    left: '33.3%',
    width: 1,
    height: '100%',
  },
});
```

---

## PHASE 3: OCR INTEGRATION (Week 3-4)

### Download PaddleOCR Model

```bash
# Download PP-OCRv5 model (ONNX format)
mkdir -p assets/models

# Detection model
curl -L https://paddleocr.bj.bcebos.com/PP-OCRv5/ch/ch_PP-OCRv5_det.tar \
  | tar -xv -C assets/models/

# Recognition model
curl -L https://paddleocr.bj.bcebos.com/PP-OCRv5/ch/ch_PP-OCRv5_rec.tar \
  | tar -xv -C assets/models/

# Convert to ONNX (use Paddle2ONNX)
pip install paddle2onnx

paddle2onnx --model_dir assets/models/ch_PP-OCRv5_det \
  --model_filename inference.pdmodel \
  --params_filename inference.pdiparams \
  --save_file assets/models/pp_ocrv5_det.onnx \
  --opset_version 11

paddle2onnx --model_dir assets/models/ch_PP-OCRv5_rec \
  --model_filename inference.pdmodel \
  --params_filename inference.pdiparams \
  --save_file assets/models/pp_ocrv5_rec.onnx \
  --opset_version 11
```

### OCR Service

```typescript
// src/services/OCRService.ts
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import RNFS from 'react-native-fs';
import { Image } from 'react-native';

export class OCRService {
  private detectionSession: InferenceSession | null = null;
  private recognitionSession: InferenceSession | null = null;

  async initialize() {
    const modelPath = `${RNFS.DocumentDirectoryPath}/models`;

    // Copy models from assets to documents (first launch only)
    const modelsExist = await RNFS.exists(modelPath);
    if (!modelsExist) {
      await RNFS.mkdir(modelPath);
      await RNFS.copyFileAssets('models/pp_ocrv5_det.onnx', `${modelPath}/det.onnx`);
      await RNFS.copyFileAssets('models/pp_ocrv5_rec.onnx', `${modelPath}/rec.onnx`);
    }

    // Initialize ONNX Runtime sessions
    this.detectionSession = await InferenceSession.create(
      `${modelPath}/det.onnx`,
      {
        executionProviders: ['coreml'], // iOS GPU
        graphOptimizationLevel: 'all',
      }
    );

    this.recognitionSession = await InferenceSession.create(
      `${modelPath}/rec.onnx`,
      {
        executionProviders: ['coreml'],
        graphOptimizationLevel: 'all',
      }
    );
  }

  async extractPanelSchedule(photoPath: string): Promise<OCRResult> {
    // 1. Preprocess image
    const imageTensor = await this.preprocessImage(photoPath);

    // 2. Run detection model (find text boxes)
    const detectionOutput = await this.detectionSession!.run({
      input: imageTensor,
    });

    const textBoxes = this.parseDetectionOutput(detectionOutput);

    // 3. Run recognition model on each text box
    const recognizedTexts = await Promise.all(
      textBoxes.map(box => this.recognizeText(photoPath, box))
    );

    // 4. Parse into circuit schedule
    return this.parseCircuitSchedule(recognizedTexts);
  }

  private async preprocessImage(photoPath: string): Promise<Tensor> {
    // Load image
    const imageData = await RNFS.readFile(photoPath, 'base64');

    // TODO: Resize to 1920x1080, normalize to [0, 1]
    // For now, return placeholder tensor
    const tensor = new Tensor('float32', new Float32Array(1920 * 1080 * 3), [1, 3, 1080, 1920]);
    return tensor;
  }

  private parseDetectionOutput(output: any): TextBox[] {
    // TODO: Parse ONNX output to text box coordinates
    return [];
  }

  private async recognizeText(photoPath: string, box: TextBox): Promise<string> {
    // TODO: Crop image to box, run recognition model
    return '';
  }

  private parseCircuitSchedule(texts: string[]): OCRResult {
    // TODO: Parse recognized text into circuit schedule
    // Example: "1. Kitchen GFCI 20A" -> { number: 1, label: 'Kitchen GFCI', amps: 20 }
    return {
      circuits: [],
      confidence: 0.0,
    };
  }
}

interface TextBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OCRResult {
  circuits: Array<{
    number: number;
    label: string;
    amps: number;
  }>;
  confidence: number;
}
```

**Note:** Full OCR implementation requires image preprocessing, ONNX output parsing, and text recognition. See PaddleOCR documentation for details:
https://github.com/PaddlePaddle/PaddleOCR

---

## PHASE 4: SIMPLE VALIDATION (Week 9)

### Wire Ampacity Validator

```typescript
// src/services/SimpleValidator.ts

export class SimpleElectricalValidator {
  // AWG wire ampacity table (NEC Table 310.16, 75°C copper)
  private static readonly AMPACITY_75C: Record<string, number> = {
    '14': 20,
    '12': 25,
    '10': 35,
    '8': 50,
    '6': 65,
    '4': 85,
    '2': 115,
    '1': 130,
    '1/0': 150,
    '2/0': 175,
    '3/0': 200,
    '4/0': 230,
    '250': 255,
    '300': 285,
    '350': 310,
    '400': 335,
    '500': 380,
  };

  static validateBreakerWireMatch(
    breakerAmps: number,
    wireGauge: string
  ): ValidationResult {
    const maxAmpacity = this.AMPACITY_75C[wireGauge];

    if (!maxAmpacity) {
      return {
        status: 'error',
        message: `Unknown wire gauge: ${wireGauge}`,
        code: 'UNKNOWN_WIRE',
      };
    }

    if (breakerAmps > maxAmpacity) {
      return {
        status: 'fail',
        message: `${breakerAmps}A breaker exceeds ${wireGauge} AWG capacity (${maxAmpacity}A)`,
        code: 'BREAKER_OVERSIZED',
        recommendation: `Upgrade to ${this.recommendWireGauge(breakerAmps)} AWG or reduce breaker size`,
      };
    }

    // Good practice: breaker should be ≤80% of wire capacity
    const utilizationPercent = (breakerAmps / maxAmpacity) * 100;
    if (utilizationPercent > 80) {
      return {
        status: 'warning',
        message: `${breakerAmps}A breaker is ${utilizationPercent.toFixed(0)}% of wire capacity`,
        code: 'HIGH_UTILIZATION',
        recommendation: 'Consider upgrading wire gauge for future load growth',
      };
    }

    return {
      status: 'pass',
      message: `${breakerAmps}A breaker OK for ${wireGauge} AWG wire (${utilizationPercent.toFixed(0)}% utilization)`,
      code: 'OK',
    };
  }

  static recommendWireGauge(breakerAmps: number): string {
    for (const [gauge, ampacity] of Object.entries(this.AMPACITY_75C)) {
      if (ampacity >= breakerAmps) {
        return gauge;
      }
    }
    return '500'; // Max size
  }

  static calculateVoltageDrop(
    current: number,
    wireGauge: string,
    distanceFeet: number,
    voltage: number = 120
  ): VoltageDropResult {
    // Resistance per 1000ft (ohms, copper)
    const resistanceTable: Record<string, number> = {
      '14': 3.07,
      '12': 1.93,
      '10': 1.21,
      '8': 0.764,
      '6': 0.491,
      '4': 0.308,
      '2': 0.194,
      '1': 0.154,
      '1/0': 0.122,
      '2/0': 0.0967,
      '3/0': 0.0766,
      '4/0': 0.0608,
    };

    const resistance = resistanceTable[wireGauge] || 0;
    const voltageDrop = (2 * resistance * distanceFeet * current) / 1000;
    const percentDrop = (voltageDrop / voltage) * 100;

    // NEC recommendation: 3% branch circuit, 5% total
    const meetsCode = percentDrop <= 3.0;

    return {
      voltageDrop,
      percentDrop,
      voltageAtLoad: voltage - voltageDrop,
      meetsCode,
      recommendation: meetsCode
        ? 'Voltage drop within limits'
        : `Voltage drop too high (${percentDrop.toFixed(1)}%). Upgrade to ${this.recommendWireForVoltageDrop(current, distanceFeet, voltage)} AWG`,
    };
  }

  private static recommendWireForVoltageDrop(
    current: number,
    distanceFeet: number,
    voltage: number
  ): string {
    const targetDropPercent = 3.0;
    const maxDrop = (voltage * targetDropPercent) / 100;
    const maxResistance = (maxDrop * 1000) / (2 * current * distanceFeet);

    const resistanceTable: Record<string, number> = {
      '14': 3.07,
      '12': 1.93,
      '10': 1.21,
      '8': 0.764,
      '6': 0.491,
      '4': 0.308,
    };

    for (const [gauge, resistance] of Object.entries(resistanceTable)) {
      if (resistance <= maxResistance) {
        return gauge;
      }
    }

    return '4'; // Max size in table
  }
}

interface ValidationResult {
  status: 'pass' | 'warning' | 'fail' | 'error';
  message: string;
  code: string;
  recommendation?: string;
}

interface VoltageDropResult {
  voltageDrop: number;
  percentDrop: number;
  voltageAtLoad: number;
  meetsCode: boolean;
  recommendation: string;
}
```

### Usage in Component

```typescript
// src/screens/CircuitDetailScreen.tsx
import { SimpleElectricalValidator } from '../services/SimpleValidator';

function CircuitDetailScreen({ circuit }) {
  const validation = SimpleElectricalValidator.validateBreakerWireMatch(
    circuit.breakerAmps,
    circuit.wireGauge
  );

  return (
    <View style={styles.container}>
      <Text>Circuit: {circuit.label}</Text>
      <Text>Breaker: {circuit.breakerAmps}A</Text>
      <Text>Wire: {circuit.wireGauge} AWG</Text>

      {/* Validation badge */}
      <View style={[styles.badge, getBadgeStyle(validation.status)]}>
        <Text style={styles.badgeText}>{validation.status.toUpperCase()}</Text>
      </View>

      <Text>{validation.message}</Text>

      {validation.recommendation && (
        <Text style={styles.recommendation}>
          💡 {validation.recommendation}
        </Text>
      )}
    </View>
  );
}

function getBadgeStyle(status: string) {
  switch (status) {
    case 'pass':
      return { backgroundColor: '#4CAF50' };
    case 'warning':
      return { backgroundColor: '#FF9800' };
    case 'fail':
      return { backgroundColor: '#F44336' };
    default:
      return { backgroundColor: '#9E9E9E' };
  }
}
```

---

## PHASE 5: TESTING CHECKLIST

### Functional Testing

- [ ] Camera captures photo successfully
- [ ] Photo saves to local storage
- [ ] OCR extracts circuit labels (manual verification on 10 panels)
- [ ] WatermelonDB stores panel data
- [ ] Panel list displays correctly
- [ ] Circuit detail shows validation results
- [ ] App works 100% offline (enable airplane mode)
- [ ] App launches in <2 seconds (cold start)
- [ ] OCR processes panel in <30 seconds

### Device Testing

**iOS:**
- [ ] iPhone 13 (target device)
- [ ] iPhone 11 (older hardware)
- [ ] iPad (optional, check UI scaling)

**Android:**
- [ ] Pixel 6 (Snapdragon 888)
- [ ] Samsung Galaxy S21 (Snapdragon 865)
- [ ] OnePlus 9 (mid-range)

### Performance Testing

- [ ] OCR time: Measure on 10 panels, ensure <30s average
- [ ] Battery drain: Process 10 panels, measure battery usage (<20%)
- [ ] Memory usage: Monitor with Xcode Instruments (<500MB peak)
- [ ] Database queries: Ensure <50ms for 100 panels

### User Testing (5 Electricians)

- [ ] Give each electrician app + test panel
- [ ] Observe: Can they capture photo without help?
- [ ] Observe: Do they understand OCR results?
- [ ] Measure: How long does it take? (target <2 minutes panel → documented)
- [ ] Survey: Would you use this on job sites? (1-10 scale, target 8+)

---

## DEPLOYMENT CHECKLIST

### iOS App Store

- [ ] Create Apple Developer account ($99/year)
- [ ] Configure App Store Connect (bundle ID, app name)
- [ ] Create app icon (1024x1024px)
- [ ] Take screenshots (6.5" iPhone, 12.9" iPad)
- [ ] Write app description (focus: offline electrical panel documentation)
- [ ] Create privacy policy (what data collected, how used)
- [ ] Set category: Business > Utilities
- [ ] Set age rating: 4+
- [ ] Submit for TestFlight beta (internal testing)
- [ ] Submit for App Store review (wait 1-3 days)

### Android Google Play

- [ ] Create Google Play Developer account ($25 one-time)
- [ ] Configure Play Console (package name, app name)
- [ ] Create app icon (512x512px)
- [ ] Take screenshots (phone + tablet)
- [ ] Write app description
- [ ] Fill data safety form (what data collected)
- [ ] Set content rating: Everyone
- [ ] Upload AAB bundle (not APK)
- [ ] Submit for internal testing (20 testers)
- [ ] Submit for production review (wait 1-2 days)

---

## MONITORING & ANALYTICS (Post-Launch)

### Crash Reporting

```bash
# Install Sentry for crash tracking
npm install @sentry/react-native

# Initialize
npx @sentry/wizard -i reactNative -p ios android
```

```typescript
// index.js
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: __DEV__ ? 'development' : 'production',
});
```

### Usage Analytics (Privacy-Respecting)

```typescript
// Track key events (no PII)
const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  // Send to analytics service (e.g., PostHog, Mixpanel)
  console.log('Event:', eventName, properties);
};

// Examples
trackEvent('panel_captured', { ocr_confidence: 0.92 });
trackEvent('circuit_validated', { status: 'pass' });
trackEvent('app_launched', { is_first_launch: true });
```

---

## COMMON ISSUES & SOLUTIONS

### Issue: OCR Model Not Found

**Error:** `Model file not found at path`

**Solution:**
```bash
# Verify models are in assets
ls -la assets/models/

# Re-copy to documents directory
rm -rf ~/Library/Developer/CoreSimulator/.../Documents/models
# Re-run app
```

### Issue: Camera Permission Denied

**Error:** `Camera permission not granted`

**Solution:**
```xml
<!-- iOS: Add to Info.plist -->
<key>NSCameraUsageDescription</key>
<string>ElectriScribe needs camera access to capture electrical panel photos</string>

<!-- Android: Add to AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
```

### Issue: WatermelonDB Migration Failed

**Error:** `Database schema version mismatch`

**Solution:**
```typescript
// Reset database (dev only!)
import { database } from './database';
await database.write(async () => {
  await database.unsafeResetDatabase();
});
```

### Issue: App Crashes on Older Phones

**Error:** Out of memory

**Solution:**
```typescript
// Reduce image resolution before OCR
const resizedImage = await ImageResizer.createResizedImage(
  photoPath,
  1920, // max width
  1080, // max height
  'JPEG',
  80, // quality
);
```

---

## NEXT STEPS (After MVP Launch)

1. **Collect User Feedback:**
   - In-app feedback form
   - Monitor App Store reviews
   - Direct outreach to early adopters

2. **Measure Success Metrics:**
   - Daily active users (target: 100 in first month)
   - Average panels processed per user (target: 5)
   - OCR accuracy (target: 95%+)
   - Crash rate (target: <1%)

3. **Plan Phase 2 (Cloud Sync):**
   - Set up Supabase project
   - Design sync API
   - Build contractor desktop app

4. **Iterate on OCR:**
   - Collect failed OCR examples
   - Fine-tune model on BC electrical panels
   - Improve preprocessing (contrast, denoising)

---

**Ready to build? Start with Day 1 environment setup above.** 🚀

**Questions?** Review full technical architecture in `ELECTRISCRIBE_TECHNICAL_ARCHITECTURE.md`
