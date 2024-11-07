import React from 'react';
import PropTypes from 'prop-types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { MessageSquare } from 'lucide-react';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';

// Constants
const EMISSIONS_THRESHOLD = 1.5;
const COST_PER_LITRE_THRESHOLD = 0.35;
const PROTEIN_EFFICIENCY_THRESHOLD = 12;
const NITROGEN_EFFICIENCY_THRESHOLD = 15;
const TARGET_YIELD = 9000;

// Calculation functions
const calculateEmissions = (feed) => +(1.39 + (0.05 * (feed - 8.08))).toFixed(2);
const calculateYield = (feed) => Math.round(8750 + (100 * (feed - 8.08)));
const calculateCostPerLitre = (feed, yield_, feedCostPerKg) =>
  +(0.25 + ((feed * feedCostPerKg * 365) / yield_)).toFixed(2);
const calculateProteinEfficiency = (feed) => +(14.3 - (0.1 * (feed - 8.08))).toFixed(1);
const calculateNitrogenEfficiency = (nitrogen) => +(17.6 - (0.02 * (nitrogen - 180))).toFixed(1);

const getNextMonth = (currentMonth) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const index = months.indexOf(currentMonth);
  return months[(index + 1) % 12];
};

const GHGToolEnhanced = () => {
  // State hooks
  const [feedCostPerKg, setFeedCostPerKg] = React.useState(0.38);
  const [params, setParams] = React.useState({
    concentrateFeed: 8.08,
    nitrogenRate: 180,
    emissions: 1.39,
    yield: 8721,
    costPerLitre: 0.37,
    proteinEfficiency: 14.3,
    nitrogenEfficiency: 17.6
  });
  const [query, setQuery] = React.useState("");
  const [messages, setMessages] = React.useState([{
    type: 'info',
    text: 'Welcome! Adjust parameters to see real-time impact on emissions, yield, and costs.'
  }]);
  const [suggestions, setSuggestions] = React.useState([]);
  const [yieldData, setYieldData] = React.useState([
    { month: 'Jan', yield: 8750, target: TARGET_YIELD, cost: 0.32 },
    { month: 'Feb', yield: 8900, target: TARGET_YIELD, cost: 0.32 },
    { month: 'Mar', yield: 8800, target: TARGET_YIELD, cost: 0.32 },
    { month: 'Apr', yield: 8650, target: TARGET_YIELD, cost: 0.32 }
  ]);

  const updateParams = (newFeed, newNitrogen = params.nitrogenRate) => {
    const oldParams = { ...params };
    const yieldValue = calculateYield(newFeed);
    const newParams = {
      concentrateFeed: newFeed,
      nitrogenRate: newNitrogen,
      emissions: calculateEmissions(newFeed),
      yield: yieldValue,
      costPerLitre: calculateCostPerLitre(newFeed, yieldValue, feedCostPerKg),
      proteinEfficiency: calculateProteinEfficiency(newFeed),
      nitrogenEfficiency: calculateNitrogenEfficiency(newNitrogen)
    };
    setParams(newParams);
    addChangeMessage(oldParams, newParams);
    updateYieldData(newParams);
  };

  const handleFeedCostChange = (newCost) => {
    if (!isNaN(newCost) && newCost > 0) {
      setFeedCostPerKg(newCost);
      updateParams(params.concentrateFeed, params.nitrogenRate);
    }
  };

  const addChangeMessage = (old, new_) => {
    const formatChange = (val1, val2) => (val2 > val1 ? '+' : '') + (val2 - val1).toFixed(2);
    setMessages(prev => [...prev, {
      type: 'alert',
      text: `Parameter update summary:
• Emissions: ${old.emissions} → ${new_.emissions} (${formatChange(old.emissions, new_.emissions)})
• Yield: ${old.yield} → ${new_.yield} (${new_.yield - old.yield} L/lactation)
• Cost per litre: £${old.costPerLitre} → £${new_.costPerLitre} (${formatChange(old.costPerLitre, new_.costPerLitre)})
• Protein efficiency: ${old.proteinEfficiency} → ${new_.proteinEfficiency}%
• N efficiency: ${old.nitrogenEfficiency} → ${new_.nitrogenEfficiency}%`
    }]);
  };

  const updateYieldData = (newParams) => {
    setYieldData(prev => {
      const nextMonth = getNextMonth(prev[prev.length - 1].month);
      return [
        ...prev.slice(1),
        {
          month: nextMonth,
          yield: newParams.yield,
          target: TARGET_YIELD,
          cost: newParams.costPerLitre
        }
      ];
    });
  };

  const getMetricColor = (value, threshold, isInverse = false) => {
    if (isInverse) {
      return value < threshold ? 'text-red-600' : 'text-green-600';
    }
    return value > threshold ? 'text-red-600' : 'text-green-600';
  };

  const handleQuerySubmit = () => {
    if (query.trim()) {
      setMessages(prev => [...prev, {
        type: 'query',
        text: query
      }]);

      const lowerQuery = query.toLowerCase();
      let response = { type: 'info', text: "I'll analyze your query and provide relevant insights." };

      if (lowerQuery.includes('emission')) {
        response.text = `Current emissions are ${params.emissions} units. ${
          params.emissions > EMISSIONS_THRESHOLD 
            ? 'This is above the target threshold. Consider reducing concentrate feed.' 
            : 'This is within acceptable range.'
        }`;
      } else if (lowerQuery.includes('cost')) {
        response.text = `Current cost per litre is £${params.costPerLitre}. ${
          params.costPerLitre > COST_PER_LITRE_THRESHOLD
            ? 'This is above target. Review feed costs and efficiency.' 
            : 'This is within target range.'
        }`;
      } else if (lowerQuery.includes('yield')) {
        response.text = `Current yield is ${params.yield} L/lactation. ${
          params.yield < TARGET_YIELD
            ? `This is ${TARGET_YIELD - params.yield}L below target.` 
            : 'This meets or exceeds the target.'
        }`;
      }

      setMessages(prev => [...prev, response]);
      setQuery('');
    }
  };

  const generateSuggestions = (params) => {
    const newSuggestions = [];

    if (params.emissions > EMISSIONS_THRESHOLD) {
      const reducedFeed = +(params.concentrateFeed * 0.9).toFixed(2);
      const potentialEmissions = calculateEmissions(reducedFeed);
      const emissionsReduction = +((params.emissions - potentialEmissions) / params.emissions * 100).toFixed(1);

      newSuggestions.push({
        type: 'emission',
        suggestion: `Consider reducing concentrate feed to ${reducedFeed} kg/day`,
        impact: `Could reduce emissions by ${emissionsReduction}%`,
        priority: 'high'
      });
    }

    if (params.nitrogenEfficiency < NITROGEN_EFFICIENCY_THRESHOLD) {
      newSuggestions.push({
        type: 'nitrogen',
        suggestion: 'Optimize nitrogen application timing',
        impact: 'Could improve N efficiency by up to 15%',
        priority: 'medium'
      });
    }

    if (params.proteinEfficiency < PROTEIN_EFFICIENCY_THRESHOLD) {
      newSuggestions.push({
        type: 'protein',
        suggestion: 'Review protein content in concentrate feed',
        impact: `Target protein efficiency above ${PROTEIN_EFFICIENCY_THRESHOLD}%`,
        priority: 'medium'
      });
    }

    if (params.costPerLitre > COST_PER_LITRE_THRESHOLD) {
      newSuggestions.push({
        type: 'cost',
        suggestion: 'Consider cost reduction strategies',
        impact: `Current cost £${params.costPerLitre}/L exceeds target of £${COST_PER_LITRE_THRESHOLD}/L`,
        priority: 'high'
      });
    }

    return newSuggestions;
  };

  React.useEffect(() => {
    setSuggestions(generateSuggestions(params));
  }, [params]);

  return (
    <div className="w-full max-w-4xl border rounded-lg shadow bg-white p-4">
      <div className="border-b pb-4">
        <h2 className="text-xl font-semibold mb-4">GHG WHAT-IF Tool</h2>
        <div className="grid gap-4">
          <div className="flex items-center gap-6">
            <span className="font-medium">Key Performance Indicators</span>
            <div className="flex items-center gap-4">
              <span className={getMetricColor(params.emissions, EMISSIONS_THRESHOLD)}>
                Emissions: {params.emissions}
              </span>
              <span className={getMetricColor(params.nitrogenEfficiency, NITROGEN_EFFICIENCY_THRESHOLD, true)}>
                N Efficiency: {params.nitrogenEfficiency}
              </span>
              <span className={getMetricColor(params.proteinEfficiency, PROTEIN_EFFICIENCY_THRESHOLD, true)}>
                Protein Efficiency: {params.proteinEfficiency}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Current Yield: </span>
              <span className="text-blue-500">{params.yield} L/lactation</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Cost per Litre: </span>
              <span className={getMetricColor(params.costPerLitre, COST_PER_LITRE_THRESHOLD)}>
                £{params.costPerLitre}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="space-y-4">
          <FarmParametersForm
            params={params}
            onUpdateParams={updateParams}
            feedCostPerKg={feedCostPerKg}
            onFeedCostChange={handleFeedCostChange}
          />

          <PerformanceTrendsChart data={yieldData} />

          <SuggestionsList suggestions={suggestions} />
        </div>

        <div className="p-4 border rounded">
          <h3 className="font-medium mb-4">Analysis Feed</h3>
          <div className="space-y-2 h-48 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div key={idx} className={`p-2 rounded ${msg.type === 'alert' ? 'bg-orange-50' : 'bg-gray-50'}`}>
                <div className="whitespace-pre-line">{msg.text}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Ask about your farm's parameters..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleQuerySubmit();
                }
              }}
              className="flex-1"
            />
            <Button onClick={handleQuerySubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
              <MessageSquare className="mr-2 h-4 w-4" />
              Ask
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// FarmParametersForm Component
const FarmParametersForm = ({ params, onUpdateParams, feedCostPerKg, onFeedCostChange }) => {
  return (
    <div className="p-4 border rounded">
      <h3 className="font-medium mb-4">Farm Parameters</h3>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <label className="min-w-[200px]">Concentrate Feed</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={params.concentrateFeed}
            className="w-24 px-2 py-1 border rounded"
            onChange={(e) => onUpdateParams(parseFloat(e.target.value) || 0, params.nitrogenRate)}
          />
          <span className="text-sm text-gray-500">kg/day</span>
        </div>
        <div className="flex items-center ml-[200px]">
          <span className="text-sm text-gray-500 mr-2">Feed cost:</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={feedCostPerKg}
            className="w-20 h-6 text-sm px-2 border rounded"
            onChange={(e) => onFeedCostChange(parseFloat(e.target.value) || 0)}
          />
          <span className="text-sm text-gray-500 ml-2">
            £/kg (£{(feedCostPerKg * 1000).toLocaleString()}/tonne)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="min-w-[200px]">Nitrogen Application</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={params.nitrogenRate}
            className="w-24 px-2 py-1 border rounded"
            onChange={(e) => onUpdateParams(params.concentrateFeed, parseFloat(e.target.value) || 0)}
          />
          <span className="text-sm text-gray-500">kg N/Ha/Year</span>
        </div>
      </div>
    </div>
  );
};

FarmParametersForm.propTypes = {
  params: PropTypes.object.isRequired,
  onUpdateParams: PropTypes.func.isRequired,
  feedCostPerKg: PropTypes.number.isRequired,
  onFeedCostChange: PropTypes.func.isRequired
};

// PerformanceTrendsChart Component
const PerformanceTrendsChart = ({ data }) => {
  return (
    <div className="p-4 border rounded">
      <h3 className="font-medium mb-4">Performance Trends</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} padding={{ left: 10, right: 10 }} />
          <YAxis yAxisId="left" orientation="left" domain={[8000, 9500]} tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" domain={[0.25, 0.44]} tick={{ fontSize: 12 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Line yAxisId="left" type="monotone" dataKey="yield" stroke="#3b82f6" name="Actual Yield" />
          <Line yAxisId="left" type="monotone" dataKey="target" stroke="#22c55e" strokeDasharray="5 5" name="Target Yield" />
          <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#9333ea" name="Cost" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

PerformanceTrendsChart.propTypes = {
  data: PropTypes.array.isRequired
};

// SuggestionsList Component
// SuggestionsList Component
const SuggestionsList = ({ suggestions }) => {
  return (
    <div className="p-4 border rounded">
      <h3 className="font-medium mb-4">Optimization Suggestions</h3>
      {suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <div key={index} className={`p-3 rounded ${suggestion.priority === 'high' ? 'bg-red-50' : 'bg-yellow-50'}`}>
              <div className="font-medium">{suggestion.suggestion}</div>
              <div className="text-sm text-gray-600">{suggestion.impact}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500 italic">No optimization suggestions at this time.</div>
      )}
    </div>
  );
};

SuggestionsList.propTypes = {
  suggestions: PropTypes.array.isRequired
};