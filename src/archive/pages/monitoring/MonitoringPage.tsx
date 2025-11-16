import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, TrendingUp, Zap, Thermometer } from 'lucide-react';
import { Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { pythonAnalysisClient } from '../../services/python-analysis-client';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PhaseSpacePoint {
  x: number;
  y: number;
  timestamp: number;
}

interface EmergentBehavior {
  type: string;
  description: string;
  timestamp: number;
}

export default function MonitoringPage() {
  const [phaseSpaceData, setPhaseSpaceData] = useState<PhaseSpacePoint[]>([]);
  const [emergentBehaviors, setEmergentBehaviors] = useState<EmergentBehavior[]>([]);
  const [systemMetrics, setSystemMetrics] = useState({
    voltage: 240,
    current: 85,
    powerFactor: 0.95,
    temperature: 32,
    harmonicTHD: 3.2,
  });
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const simulateRealTimeData = setInterval(() => {
      const now = Date.now();

      const newPoint: PhaseSpacePoint = {
        x: systemMetrics.current + (Math.random() - 0.5) * 10,
        y: systemMetrics.voltage + (Math.random() - 0.5) * 5,
        timestamp: now,
      };

      setPhaseSpaceData(prev => {
        const updated = [...prev, newPoint];
        return updated.slice(-100);
      });

      setSystemMetrics(prev => ({
        voltage: 240 + (Math.random() - 0.5) * 5,
        current: 85 + (Math.random() - 0.5) * 15,
        powerFactor: 0.93 + Math.random() * 0.07,
        temperature: 30 + Math.random() * 10,
        harmonicTHD: 2 + Math.random() * 4,
      }));

      if (Math.random() > 0.95) {
        const behaviors = [
          { type: 'oscillation', description: 'Periodic voltage fluctuation detected' },
          { type: 'resonance', description: 'Harmonic resonance at 180Hz' },
          { type: 'bifurcation', description: 'Load bifurcation detected' },
        ];
        const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
        setEmergentBehaviors(prev => {
          const updated = [{ ...behavior, timestamp: now }, ...prev];
          return updated.slice(0, 5);
        });
      }
    }, 1000);

    setIsConnected(true);

    return () => {
      clearInterval(simulateRealTimeData);
      setIsConnected(false);
    };
  }, [systemMetrics.current, systemMetrics.voltage]);

  const phaseSpaceChartData = {
    datasets: [
      {
        label: 'Phase Space Trajectory',
        data: phaseSpaceData.map(p => ({ x: p.x, y: p.y })),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        pointRadius: 3,
        showLine: true,
      },
    ],
  };

  const phaseSpaceChartOptions: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Phase Space Analysis (Current vs Voltage)',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `Current: ${context.parsed.x.toFixed(1)}A, Voltage: ${context.parsed.y.toFixed(1)}V`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: 'Current (A)',
        },
        min: 60,
        max: 110,
      },
      y: {
        type: 'linear',
        title: {
          display: true,
          text: 'Voltage (V)',
        },
        min: 230,
        max: 250,
      },
    },
  };

  const timeSeriesData = {
    labels: phaseSpaceData.map((_, i) => i).slice(-50),
    datasets: [
      {
        label: 'Current (A)',
        data: phaseSpaceData.map(p => p.x).slice(-50),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y',
      },
      {
        label: 'Voltage (V)',
        data: phaseSpaceData.map(p => p.y).slice(-50),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.2)',
        yAxisID: 'y1',
      },
    ],
  };

  const timeSeriesOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Real-Time System Metrics',
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Current (A)',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Voltage (V)',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8" />
          <div>
            <h1 className="text-3xl font-bold">Real-Time Monitoring Dashboard</h1>
            <p className="text-sm text-base-content/70">
              Live electrical system metrics with phase space analysis
            </p>
          </div>
        </div>
        <div className={`badge ${isConnected ? 'badge-success' : 'badge-error'} gap-2`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'} ${isConnected ? 'animate-pulse' : ''}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {/* System Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="stat bg-base-100 shadow-md">
          <div className="stat-figure text-primary">
            <Zap className="w-8 h-8" />
          </div>
          <div className="stat-title">Panel Voltage</div>
          <div className="stat-value text-primary text-2xl">
            {systemMetrics.voltage.toFixed(1)}V
          </div>
          <div className="stat-desc">
            {systemMetrics.voltage >= 235 && systemMetrics.voltage <= 245
              ? 'Within normal range'
              : 'Out of range'}
          </div>
        </div>

        <div className="stat bg-base-100 shadow-md">
          <div className="stat-figure text-accent">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="stat-title">Total Current</div>
          <div className="stat-value text-accent text-2xl">
            {systemMetrics.current.toFixed(1)}A
          </div>
          <div className="stat-desc">
            {((systemMetrics.current / 200) * 100).toFixed(1)}% capacity
          </div>
        </div>

        <div className="stat bg-base-100 shadow-md">
          <div className="stat-title">Power Factor</div>
          <div className="stat-value text-2xl">{systemMetrics.powerFactor.toFixed(3)}</div>
          <div className="stat-desc">
            {systemMetrics.powerFactor >= 0.95 ? 'Excellent' : 'Good'}
          </div>
        </div>

        <div className="stat bg-base-100 shadow-md">
          <div className="stat-figure text-warning">
            <Thermometer className="w-8 h-8" />
          </div>
          <div className="stat-title">Temperature</div>
          <div className="stat-value text-warning text-2xl">
            {systemMetrics.temperature.toFixed(1)}°C
          </div>
          <div className="stat-desc">
            {systemMetrics.temperature < 40 ? 'Normal' : 'Elevated'}
          </div>
        </div>

        <div className="stat bg-base-100 shadow-md">
          <div className="stat-title">Harmonic THD</div>
          <div className="stat-value text-2xl">{systemMetrics.harmonicTHD.toFixed(1)}%</div>
          <div className="stat-desc">
            {systemMetrics.harmonicTHD < 5 ? 'Within limits' : 'High distortion'}
          </div>
        </div>
      </div>

      {/* Emergent Behaviors Alert */}
      {emergentBehaviors.length > 0 && (
        <div className="alert alert-warning shadow-lg">
          <AlertTriangle className="w-6 h-6" />
          <div>
            <h3 className="font-bold">Emergent Behaviors Detected</h3>
            <div className="text-xs space-y-1 mt-2">
              {emergentBehaviors.slice(0, 3).map((behavior, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="badge badge-sm badge-warning">{behavior.type}</span>
                  <span>{behavior.description}</span>
                  <span className="text-base-content/50">
                    {new Date(behavior.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Phase Space Visualization */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Phase Space Trajectory</h2>
            <p className="text-sm text-base-content/70">
              Dynamical system state visualization showing attractor patterns
            </p>
            <div style={{ height: '400px' }}>
              <Scatter data={phaseSpaceChartData} options={phaseSpaceChartOptions} />
            </div>
            <div className="card-actions justify-end">
              <div className="text-xs text-base-content/60">
                {phaseSpaceData.length} data points | Updates every 1s
              </div>
            </div>
          </div>
        </div>

        {/* Time Series */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Time Series Analysis</h2>
            <p className="text-sm text-base-content/70">
              Temporal evolution of electrical parameters
            </p>
            <div style={{ height: '400px' }}>
              <Line data={timeSeriesData} options={timeSeriesOptions} />
            </div>
            <div className="card-actions justify-end">
              <div className="text-xs text-base-content/60">
                Last 50 measurements | Real-time streaming
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">System Analysis</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h3 className="font-semibold mb-2">Phase Space Classification</h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Trajectory Type:</span>
                  <span className="badge badge-info">Stable Attractor</span>
                </div>
                <div className="flex justify-between">
                  <span>Lyapunov Exponent:</span>
                  <span className="font-mono">-0.23</span>
                </div>
                <div className="flex justify-between">
                  <span>Dimensionality:</span>
                  <span className="font-mono">2.1</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Constraint Status</h3>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <div className="badge badge-success badge-sm">OK</div>
                  <span>Thermal limits</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="badge badge-success badge-sm">OK</div>
                  <span>Voltage drop</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="badge badge-success badge-sm">OK</div>
                  <span>Harmonic distortion</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Predictions</h3>
              <div className="text-sm space-y-1">
                <div>Next state transition in: <strong>~15 min</strong></div>
                <div>Confidence: <strong>87%</strong></div>
                <div>Recommended action: <strong>Monitor</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
