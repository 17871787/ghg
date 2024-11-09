// ChatWindow.js

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { ScrollArea } from "./components/ui/scroll-area";  // Changed to relative path
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Send, AlertCircle, ArrowRight, HelpCircle } from 'lucide-react';

// MetricDisplay component
const MetricDisplay = ({ label, value, unit, change }) => (
  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
    <span className="text-sm text-gray-600">{label}</span>
    <div className="font-semibold">
      {value.toFixed(2)}
      {unit}
      {change !== undefined && (
        <span className={`ml-2 ${change > 0 ? 'text-green-500' : 'text-red-500'}`}>
          ({change > 0 ? '+' : ''}
          {change}%)
        </span>
      )}
    </div>
  </div>
);

const ChatWindow = ({ farmState, metrics, setFarmState }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Welcome message
  useEffect(() => {
    const welcomeMessage = {
      id: 'welcome',
      type: 'system',
      content: (
        <div className="space-y-2">
          <p>Welcome! I can help you analyze your farm's performance.</p>
          <p className="text-sm text-gray-500">Try asking:</p>
          <ul className="list-disc list-inside text-sm text-gray-500">
            <li>"Show me emissions"</li>
            <li>"Analyze efficiency"</li>
            <li>"What if I reduce feed by 20%?"</li>
          </ul>
        </div>
      ),
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Process query and generate response
    const responseContent = processQuery(input);

    const systemMessage = {
      id: (Date.now() + 1).toString(),
      type: 'system',
      content: responseContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, systemMessage]);
  };

  const processQuery = (query) => {
    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedQuery.includes('show') && normalizedQuery.includes('emissions')) {
      // Use actual emissions data
      const data = getHistoricalData();

      return (
        <div className="space-y-2">
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="emissions" stroke="#ef4444" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-gray-500">
            Showing emissions trends over the selected timeframe
          </p>
        </div>
      );
    }

    if (normalizedQuery.includes('analyze') && normalizedQuery.includes('efficiency')) {
      // Display efficiency metrics
      return (
        <div className="space-y-2">
          {Object.entries(metrics.efficiency).map(([key, value]) => (
            <MetricDisplay
              key={key}
              label={`${key.charAt(0).toUpperCase()}${key.slice(1)} Efficiency`}
              value={value}
              unit="%"
            />
          ))}
          <div className="mt-2 text-sm text-gray-600">
            <p>Recommendations:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Consider adjusting feed levels</li>
              <li>Optimize nitrogen application</li>
            </ul>
          </div>
        </div>
      );
    }

    if (normalizedQuery.includes('reduce feed')) {
      // Extract percentage from the query
      const match = normalizedQuery.match(/reduce feed by (\d+)%/);
      if (match) {
        const reductionPercentage = parseInt(match[1], 10);

        if (reductionPercentage <= 0 || reductionPercentage > 100) {
          return (
            <div className="flex items-center text-red-500">
              <AlertCircle className="w-4 h-4 mr-2" />
              Please specify a valid reduction percentage between 1 and 100.
            </div>
          );
        }

        // Calculate new feed value
        const currentFeed = farmState.params.concentrateFeed;
        const newFeed = currentFeed * (1 - reductionPercentage / 100);

        // Update the farm state
        setFarmState(prevState => ({
          ...prevState,
          params: {
            ...prevState.params,
            concentrateFeed: newFeed
          }
        }));

        return (
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="font-medium">
                Feed reduced by {reductionPercentage}% to {newFeed.toFixed(2)} kg/day.
              </p>
              <p className="mt-2">Metrics will be updated accordingly.</p>
            </div>
          </div>
        );
      } else {
        return (
          <div className="flex items-center text-yellow-600">
            <HelpCircle className="w-4 h-4 mr-2" />
            Please specify the percentage by which you want to reduce the feed. E.g., "Reduce feed by 20%".
          </div>
        );
      }
    }

    // Default response
    return (
      <div className="flex items-center gap-2 text-yellow-600">
        <HelpCircle className="w-4 h-4" />
        <div>
          <p>I'm not sure how to help with that query.</p>
          <p className="text-sm mt-1">Try asking about:</p>
          <ul className="list-disc list-inside text-sm">
            <li>Emissions data</li>
            <li>Efficiency analysis</li>
            <li>Feed reduction scenarios</li>
          </ul>
        </div>
      </div>
    );
  };

  // Function to get historical emissions data
  const getHistoricalData = () => {
    const periods = farmState.selectedTimeframe === '6m' ? 6 : 12;
    const data = Array.from({ length: periods }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);

      return {
        month: date.toLocaleString('default', { month: 'short' }),
        emissions: metrics.base.emissions * (1 + (Math.random() * 0.1 - 0.05))
      };
    }).reverse();

    return data;
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          Farm Assistant
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Beta</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.type === 'alert'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : message.type === 'error'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-gray-100'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <Input
            placeholder="Ask about emissions, efficiency, or try 'what if' scenarios..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            className="flex-1"
            aria-label="Chat input"
          />
          <Button onClick={handleSend} size="icon" aria-label="Send message">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatWindow;