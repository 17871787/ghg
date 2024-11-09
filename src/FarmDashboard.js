// FarmDashboard.js

import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "./components/ui/card";
import { Alert } from "./components/ui/alert";
import { Slider } from "./components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Button } from "./components/ui/button";
import {
  AlertCircle, ArrowRight, Download
} from 'lucide-react';
import ChatWindow from './ChatWindow'; // Import the ChatWindow component

const FARM_CONSTANTS = {
  COSTS: {
    BASE_OPERATIONAL: 0.20,
    FEED_PER_KG: 0.38,
    NITROGEN_PER_KG: 1.20
  },
  BASELINES: {
    FEED: 8.08,
    NITROGEN: 180
  },
  THRESHOLDS: {
    emissions: 1.5,
    costPerLitre: 0.35,
    proteinEfficiency: 12,
    nitrogenEfficiency: 15
  },
  COLORS: {
    primary: '#3b82f6',
    warning: '#ef4444',
    success: '#22c55e',
    neutral: '#64748b'
  }
};

const OptimizationAlert = ({ suggestion }) => {
  const {
    priority = 'default',
    action = '',
    impact = {}
  } = suggestion || {};

  return (
    <Alert variant={priority === 'high' ? 'destructive' : 'default'}>
      <AlertCircle className="h-4 w-4" />
      <div className="ml-2">
        <div className="font-semibold mb-1">{action}</div>
        <div className="text-sm space-y-1">
          {Object.entries(impact).map(([key, value], i) => (
            <div key={i} className="flex items-center gap-2">
              <ArrowRight className="h-3 w-3" />
              <span className="capitalize">{key}:</span> {value}
            </div>
          ))}
        </div>
      </div>
    </Alert>
  );
};

const FarmDashboard = () => {
  const [state, setState] = useState({
    params: {
      concentrateFeed: FARM_CONSTANTS.BASELINES.FEED,
      nitrogenRate: FARM_CONSTANTS.BASELINES.NITROGEN
    },
    selectedTimeframe: '6m'
  });

  const metrics = useMemo(() => {
    const baseMetrics = {
      emissions: 1.39 + 0.05 * (state.params.concentrateFeed - FARM_CONSTANTS.BASELINES.FEED),
      yield: 8750 + 100 * (state.params.concentrateFeed - FARM_CONSTANTS.BASELINES.FEED),
      proteinEfficiency: 14.3 - 0.1 * (state.params.concentrateFeed - FARM_CONSTANTS.BASELINES.FEED),
      nitrogenEfficiency: 17.6 - 0.02 * (state.params.nitrogenRate - FARM_CONSTANTS.BASELINES.NITROGEN)
    };

    const efficiencyScore = {
      environmental: Math.max(0, 100 - (baseMetrics.emissions / FARM_CONSTANTS.THRESHOLDS.emissions) * 100),
      economic: Math.max(0, 100 - (baseMetrics.yield * FARM_CONSTANTS.COSTS.BASE_OPERATIONAL / FARM_CONSTANTS.THRESHOLDS.costPerLitre) * 100),
      operational: (baseMetrics.proteinEfficiency + baseMetrics.nitrogenEfficiency) / 2
    };

    return {
      base: baseMetrics,
      efficiency: efficiencyScore,
      totalScore: (efficiencyScore.environmental + efficiencyScore.economic + efficiencyScore.operational) / 3
    };
  }, [state.params]);

  const optimizationSuggestions = useMemo(() => {
    const suggestions = [];

    if (metrics.base.emissions > FARM_CONSTANTS.THRESHOLDS.emissions) {
      const reducedFeed = state.params.concentrateFeed * 0.9;
      const emissionsReduction =
        metrics.base.emissions -
        (1.39 + 0.05 * (reducedFeed - FARM_CONSTANTS.BASELINES.FEED));

      suggestions.push({
        priority: 'high',
        category: 'environmental',
        action: `Reduce feed to ${reducedFeed.toFixed(1)} kg/day`,
        impact: {
          emissions: `${(emissionsReduction * 100).toFixed(1)}% reduction`,
          cost: `£${(
            (state.params.concentrateFeed - reducedFeed) *
            FARM_CONSTANTS.COSTS.FEED_PER_KG *
            365
          ).toFixed(2)} annual savings`,
          yield: `${((reducedFeed / state.params.concentrateFeed - 1) * 100).toFixed(1)}% yield impact`
        }
      });
    }

    if (metrics.efficiency.operational < 70) {
      suggestions.push({
        priority: 'medium',
        category: 'operational',
        action: 'Optimize protein and nitrogen efficiency',
        impact: {
          potential: `${(70 - metrics.efficiency.operational).toFixed(1)}% efficiency improvement possible`,
          cost: 'Estimated 5-10% cost reduction',
          environmental: 'Reduced environmental impact'
        }
      });
    }

    return suggestions;
  }, [metrics, state.params]);

  const trendAnalysis = useMemo(() => {
    const periods = state.selectedTimeframe === '6m' ? 6 : 12;
    const baseData = Array.from({ length: periods }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);

      return {
        month: date.toLocaleString('default', { month: 'short' }),
        emissions: metrics.base.emissions * (1 + (Math.random() * 0.1 - 0.05)),
        efficiency: metrics.totalScore * (1 + (Math.random() * 0.1 - 0.05))
      };
    }).reverse();

    return baseData.map((data, index, array) => {
      if (index < 2) return data;

      const slice = array.slice(index - 2, index + 1);
      return {
        ...data,
        emissionsMA: slice.reduce((sum, d) => sum + d.emissions, 0) / 3
      };
    });
  }, [metrics, state.selectedTimeframe]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Farm GHG Optimization Dashboard</h1>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Detailed Analysis</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="assistant">Assistant</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="container mx-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Emissions Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Emissions</CardTitle>
                  <CardDescription>Current GHG emissions level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.base.emissions.toFixed(2)}
                    <span className="text-sm font-normal ml-1">CO2e</span>
                  </div>
                  <div className={`text-sm ${
                    metrics.base.emissions > FARM_CONSTANTS.THRESHOLDS.emissions 
                    ? 'text-red-500' 
                    : 'text-green-500'
                  }`}>
                    Threshold: {FARM_CONSTANTS.THRESHOLDS.emissions}
                  </div>
                </CardContent>
              </Card>

              {/* Yield Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Milk Yield</CardTitle>
                  <CardDescription>Production per lactation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.base.yield.toFixed(0)}
                    <span className="text-sm font-normal ml-1">L</span>
                  </div>
                </CardContent>
              </Card>

              {/* Efficiency Score Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Overall Efficiency</CardTitle>
                  <CardDescription>Combined performance score</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.totalScore.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              {/* Trend Chart */}
              <div className="col-span-full h-[300px]">
                <Card>
                  <CardHeader>
                    <CardTitle>Emissions Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={trendAnalysis}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="emissions" 
                          stroke={FARM_CONSTANTS.COLORS.primary} 
                          name="Emissions"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="emissionsMA" 
                          stroke={FARM_CONSTANTS.COLORS.neutral} 
                          strokeDasharray="5 5" 
                          name="Moving Average"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis">
          <div className="container mx-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Parameter Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Farm Parameters</CardTitle>
                  <CardDescription>Adjust parameters to see impact</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Concentrate Feed (kg/day)</label>
                    <Slider 
                      value={[state.params.concentrateFeed]}
                      min={0}
                      max={20}
                      step={0.1}
                      onValueChange={([value]) => 
                        setState(prev => ({
                          ...prev,
                          params: { ...prev.params, concentrateFeed: value }
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Nitrogen Rate (kg N/Ha/Year)</label>
                    <Slider 
                      value={[state.params.nitrogenRate]}
                      min={0}
                      max={300}
                      step={1}
                      onValueChange={([value]) => 
                        setState(prev => ({
                          ...prev,
                          params: { ...prev.params, nitrogenRate: value }
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Efficiency Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Efficiency Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Environmental Score: </span>
                      <span className={metrics.efficiency.environmental > 70 ? 'text-green-500' : 'text-red-500'}>
                        {metrics.efficiency.environmental.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Economic Score: </span>
                      <span className={metrics.efficiency.economic > 70 ? 'text-green-500' : 'text-red-500'}>
                        {metrics.efficiency.economic.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Operational Score: </span>
                      <span className={metrics.efficiency.operational > 70 ? 'text-green-500' : 'text-red-500'}>
                        {metrics.efficiency.operational.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization">
          <div className="container mx-auto p-4">
            <div className="space-y-4">
              {optimizationSuggestions.map((suggestion, index) => (
                <OptimizationAlert key={index} suggestion={suggestion} />
              ))}
            </div>
          </div>
        </TabsContent>

{/* Assistant Tab */}
<TabsContent value="assistant">
          <ChatWindow
            farmState={state}
            metrics={metrics}
            setFarmState={setState}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FarmDashboard;