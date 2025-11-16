import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, FileText, Save, ArrowLeft } from 'lucide-react';

/**
 * PanelDocumentationPage - Main MVP Workflow
 *
 * Future Implementation (Phase 4):
 * 1. Camera → Take photo of electrical panel
 * 2. OCR → Process photo with PaddleOCR
 * 3. Edit → Review and edit extracted panel schedule
 * 4. Save → Store offline-first, sync when online
 *
 * Current (Phase 3b): Skeleton UI structure
 */
export default function PanelDocumentationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'camera' | 'ocr' | 'edit' | 'save'>('camera');

  return (
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <button
            onClick={() => navigate('/')}
            className="btn btn-ghost gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to List
          </button>
          <h1 className="text-xl font-bold ml-4">New Panel Documentation</h1>
        </div>
        <div className="flex-none">
          <ul className="steps steps-horizontal">
            <li className={`step ${step === 'camera' ? 'step-primary' : ''}`}>Camera</li>
            <li className={`step ${step === 'ocr' ? 'step-primary' : ''}`}>OCR</li>
            <li className={`step ${step === 'edit' ? 'step-primary' : ''}`}>Edit</li>
            <li className={`step ${step === 'save' ? 'step-primary' : ''}`}>Save</li>
          </ul>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Step 1: Camera */}
        {step === 'camera' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-20">
              <Camera className="w-24 h-24 text-primary mb-6" />
              <h2 className="card-title text-3xl mb-4">Take Panel Photo</h2>
              <p className="text-base-content/70 mb-8 max-w-md">
                Camera integration coming in Phase 4. For now, you can manually enter field notes.
              </p>
              <div className="flex gap-3">
                <button
                  className="btn btn-primary gap-2"
                  disabled
                >
                  <Camera className="w-5 h-5" />
                  Open Camera (Phase 4)
                </button>
                <button
                  className="btn btn-outline gap-2"
                  onClick={() => setStep('edit')}
                >
                  <FileText className="w-5 h-5" />
                  Manual Entry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: OCR Processing */}
        {step === 'ocr' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-20">
              <div className="loading loading-spinner loading-lg text-primary mb-6"></div>
              <h2 className="card-title text-3xl mb-4">Processing Image</h2>
              <p className="text-base-content/70 max-w-md">
                PaddleOCR will extract text from your panel photo automatically.
                This step will be implemented in Phase 4.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Edit Panel Schedule */}
        {step === 'edit' && (
          <div className="space-y-6">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">
                  <FileText className="w-6 h-6" />
                  Panel Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Manufacturer</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Square D, Siemens, etc."
                      className="input input-bordered"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Model</span>
                    </label>
                    <input
                      type="text"
                      placeholder="QO, Homeline, etc."
                      className="input input-bordered"
                    />
                  </div>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">Rating (Amps)</span>
                    </label>
                    <input
                      type="number"
                      placeholder="200"
                      className="input input-bordered"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title mb-4">Circuit Schedule</h2>
                <p className="text-sm text-base-content/70 mb-4">
                  Interactive circuit editor coming in Phase 4.
                  For now, use ElectriScribeDesigner for full editing.
                </p>
                <div className="alert alert-info">
                  <FileText className="w-5 h-5" />
                  <span>
                    Phase 4 will add: PanelScheduleEditor component with editable grid,
                    drag-and-drop circuit organization, and real-time validation.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                className="btn btn-ghost"
                onClick={() => setStep('camera')}
              >
                Back
              </button>
              <button
                className="btn btn-primary gap-2"
                onClick={() => setStep('save')}
              >
                <Save className="w-5 h-5" />
                Continue to Save
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Save */}
        {step === 'save' && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-20">
              <Save className="w-24 h-24 text-success mb-6" />
              <h2 className="card-title text-3xl mb-4">Save Panel</h2>
              <p className="text-base-content/70 mb-8 max-w-md">
                Offline-first storage with cloud sync coming in Phase 4.
                Uses Dexie.js for local storage and Last-Write-Wins sync pattern.
              </p>
              <div className="flex gap-3">
                <button
                  className="btn btn-ghost"
                  onClick={() => setStep('edit')}
                >
                  Back to Edit
                </button>
                <button
                  className="btn btn-success gap-2"
                  disabled
                >
                  <Save className="w-5 h-5" />
                  Save Panel (Phase 4)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="fixed bottom-4 right-4">
        <div className="alert alert-warning shadow-lg">
          <span className="text-xs">
            <strong>Phase 3b:</strong> UI Structure Only.
            Full workflow in Phase 4.
          </span>
        </div>
      </div>
    </div>
  );
}
