import React, { useState } from 'react';
import { TrendingUp, Target, Zap, Shield, AlertCircle, CheckCircle, ArrowRight, Database, Download, RefreshCw } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

const AIROI = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiConfig, setApiConfig] = useState({
    provider: 'ollama',
    ollamaUrl: 'http://localhost:11434',
    model: 'llama3.1',
    groqKey: '',
    openrouterKey: ''
  });
  const [auditData, setAuditData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [implementation, setImplementation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [currentAgent, setCurrentAgent] = useState(null); // Track current agent for chaining

  // Agent definitions based on capabilities and limitations
  const agents = {
    discovery: {
      name: "Discovery Agent",
      icon: Database,
      capabilities: [
        "Inventory current systems and infrastructure",
        "Map business processes and workflows",
        "Identify data sources and quality",
        "Document current costs and pain points"
      ],
      limitations: [
        "Cannot access systems without proper credentials",
        "Cannot guarantee 100% discovery in complex environments",
        "Requires human validation of critical systems"
      ]
    },
    analyzer: {
      name: "Opportunity Analyzer",
      icon: TrendingUp,
      capabilities: [
        "Identify automation opportunities",
        "Calculate ROI with confidence intervals",
        "Match use cases to proven AI patterns",
        "Prioritize based on impact vs effort"
      ],
      limitations: [
        "Cannot predict market changes or external factors",
        "ROI projections are estimates, not guarantees",
        "Cannot assess organizational change readiness fully"
      ]
    },
    strategist: {
      name: "Roadmap Strategist",
      icon: Target,
      capabilities: [
        "Create phased implementation plans",
        "Ensure forward compatibility",
        "Build progressive capability layers",
        "Design rollback strategies"
      ],
      limitations: [
        "Cannot predict future technology disruptions",
        "Assumes reasonable organizational cooperation",
        "Requires periodic human strategic review"
      ]
    },
    executor: {
      name: "Implementation Assistant",
      icon: Zap,
      capabilities: [
        "Generate infrastructure code",
        "Create integration specifications",
        "Provide testing frameworks",
        "Monitor implementation progress"
      ],
      limitations: [
        "Cannot execute without human approval",
        "Cannot guarantee zero downtime migrations",
        "Requires human oversight for production deployments"
      ]
    }
  };

  const phases = [
    {
      name: "Quick Wins",
      timeframe: "0-3 months",
      icon: Zap,
      color: "text-green-600",
      examples: [
        "Document classification and routing",
        "Email response automation",
        "Data entry automation",
        "Simple chatbot for FAQs"
      ],
      canDo: [
        "Pattern recognition in documents",
        "Classify and route based on content",
        "Extract structured data from forms",
        "Answer questions from knowledge base"
      ],
      cannotDo: [
        "Make legal or compliance decisions",
        "Replace human judgment in ambiguous cases",
        "Guarantee 100% accuracy without human review",
        "Handle complex negotiations"
      ]
    },
    {
      name: "Foundation",
      timeframe: "3-12 months",
      icon: Shield,
      color: "text-blue-600",
      examples: [
        "Data pipeline modernization",
        "API integration layer",
        "Knowledge management system",
        "Process automation platform"
      ],
      canDo: [
        "Consolidate data from multiple sources",
        "Create unified APIs for legacy systems",
        "Build searchable knowledge repositories",
        "Automate repetitive workflows"
      ],
      cannotDo: [
        "Migrate without business validation",
        "Replace all legacy systems immediately",
        "Eliminate need for IT governance",
        "Automatically resolve data quality issues"
      ]
    },
    {
      name: "Strategic",
      timeframe: "1-3 years",
      icon: Target,
      color: "text-purple-600",
      examples: [
        "Predictive analytics platform",
        "Intelligent decision support",
        "Advanced automation workflows",
        "AI-powered product features"
      ],
      canDo: [
        "Identify patterns and trends in data",
        "Provide data-driven recommendations",
        "Optimize complex workflows",
        "Personalize user experiences"
      ],
      cannotDo: [
        "Replace executive decision-making",
        "Guarantee predictions in volatile markets",
        "Eliminate need for domain expertise",
        "Make ethical judgments"
      ]
    }
  ];

  const callLLM = async (messages, systemPrompt) => {
    try {
      if (apiConfig.provider === 'ollama') {
        const response = await fetch(`${apiConfig.ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: apiConfig.model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages
            ],
            stream: false
          })
        });
        const data = await response.json();
        return data.message.content;
      } else if (apiConfig.provider === 'groq') {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiConfig.groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages
            ]
          })
        });
        const data = await response.json();
        return data.choices[0].message.content;
      } else if (apiConfig.provider === 'openrouter') {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiConfig.openrouterKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.1-70b-instruct',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages
            ]
          })
        });
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('LLM call error:', error);
      throw error;
    }
  };

  const runAgent = async (agentKey, inputData = null) => {
    setLoading(true);
    try {
      let systemPrompt, userMessage;
      switch (agentKey) {
        case 'discovery':
          systemPrompt = `You are the Discovery Agent of AIROI. Your role is to help audit current business systems and processes.
          
Ask targeted questions to understand:
1. Current technology stack and infrastructure
2. Key business processes and workflows
3. Data sources and quality
4. Current pain points and costs
5. Team size and technical capabilities

Provide structured output as JSON with sections: systems, processes, data, costs, team. After collecting sufficient data, summarize in JSON and suggest moving to analysis.`;
          userMessage = 'Begin the discovery audit process. Ask me the first set of questions to understand the current state of the business.';
          break;
        case 'analyzer':
          systemPrompt = `You are the Opportunity Analyzer of AIROI. Analyze the discovery data and identify AI/automation opportunities.

For each opportunity, specify:
1. What AI CAN do (specific capabilities)
2. What AI CANNOT do (limitations requiring human judgment)
3. Estimated ROI with confidence level
4. Risk factors
5. Priority level (Quick Win, Foundation, Strategic)

Output as JSON with opportunities array. After analysis, suggest moving to roadmap.`;
          userMessage = inputData 
            ? `Analyze this business data and identify opportunities:\n\n${JSON.stringify(inputData, null, 2)}`
            : 'Begin analysis without prior data. Ask for key business details if needed.';
          break;
        case 'strategist':
          systemPrompt = `You are the Roadmap Strategist of AIROI. Based on the analysis, create a phased AI implementation roadmap.

Include:
1. Phased timeline with milestones
2. Resource requirements
3. Success metrics
4. Integration with existing systems
5. Risk mitigation strategies

Output as JSON with phases array. After roadmap, suggest implementation assistance.`;
          userMessage = inputData 
            ? `Create a roadmap based on this analysis:\n\n${JSON.stringify(inputData, null, 2)}`
            : 'Begin roadmap planning without prior analysis. Ask for key opportunities if needed.';
          break;
        case 'executor':
          systemPrompt = `You are the Implementation Assistant of AIROI. Provide actionable implementation guidance for the selected phase/opportunity.

Include:
1. Step-by-step implementation guide
2. Code snippets or configuration examples
3. Testing procedures
4. Monitoring and rollback plans

Output as structured markdown with sections.`;
          userMessage = inputData 
            ? `Provide implementation assistance for:\n\n${JSON.stringify(inputData, null, 2)}`
            : 'Begin implementation guidance without prior roadmap. Ask for specific opportunities if needed.';
          break;
        default:
          throw new Error('Unknown agent');
      }

      const response = await callLLM([{ role: 'user', content: userMessage }], systemPrompt);
      
      // Parse response for structured data if applicable
      let structuredData = response;
      try {
        structuredData = JSON.parse(response);
      } catch (e) {
        // If not JSON, keep as text
      }

      // Store data based on agent
      switch (agentKey) {
        case 'discovery':
          setAuditData(structuredData);
          break;
        case 'analyzer':
          setAnalysis(structuredData);
          break;
        case 'strategist':
          setRoadmap(structuredData);
          break;
        case 'executor':
          setImplementation(structuredData);
          break;
      }

      // Update chat history - start fresh for this agent
      setChatHistory([
        { role: 'assistant', agent: agentKey, content: response }
      ]);

      setCurrentAgent(agentKey);
      setActiveTab('chat');
    } catch (error) {
      alert(`Error during ${agents[agentKey]?.name || 'agent'}.`);
    }
    setLoading(false);
  };

  const getNextAgent = (current) => {
    const sequence = ['discovery', 'analyzer', 'strategist', 'executor'];
    const idx = sequence.indexOf(current);
    return idx < sequence.length - 1 ? sequence[idx + 1] : null;
  };

  const startAgent = (agentKey) => {
    setChatHistory([]);
    // Reset only downstream data if starting mid-chain
    if (agentKey === 'analyzer') setAnalysis(null);
    if (agentKey === 'strategist') {
      setAnalysis(null);
      setRoadmap(null);
    }
    if (agentKey === 'executor') {
      setAnalysis(null);
      setRoadmap(null);
      setImplementation(null);
    }
    setCurrentAgent(null);
    const inputData = agentKey === 'discovery' ? null : 
                     (agentKey === 'analyzer' ? auditData : 
                      (agentKey === 'strategist' ? analysis : roadmap));
    runAgent(agentKey, inputData); // No auto-chain
  };

  const resetAll = () => {
    if (confirm('Reset all data and start fresh? This cannot be undone.')) {
      setAuditData(null);
      setAnalysis(null);
      setRoadmap(null);
      setImplementation(null);
      setChatHistory([]);
      setCurrentAgent(null);
      setUserInput('');
    }
  };

  const handleChat = async () => {
    if (!userInput.trim()) return;

    const newMessage = { role: 'user', content: userInput };
    setChatHistory(prev => [...prev, newMessage]);
    setUserInput('');
    setLoading(true);

    try {
      // If in agent mode, append to current agent; else general
      const systemPrompt = currentAgent 
        ? `You are the ${agents[currentAgent].name} of AIROI. Continue the conversation helpfully, focusing on your role. If enough data is collected, summarize in JSON and end the session.` 
        : `You are AIROI, an AI ROI assessment system. Help the user understand their AI transformation journey.

Important principles:
- Be honest about what AI can and cannot do
- Provide specific, actionable recommendations
- Always include ROI estimates with confidence levels
- Prioritize quick wins that build toward strategic goals
- Emphasize human oversight for critical decisions

Analyze the conversation history and provide helpful guidance.`;

      const messages = chatHistory.concat(newMessage);
      const response = await callLLM(messages, systemPrompt);
      
      setChatHistory(prev => [...prev, 
        { role: 'assistant', agent: currentAgent || 'general', content: response }
      ]);

      // Check if discovery is complete (simple heuristic: look for JSON summary in response)
      if (currentAgent === 'discovery' && response.includes('{')) {
        // Extract JSON from response (basic parsing)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const discoveryData = JSON.parse(jsonMatch[0]);
          setAuditData(discoveryData);
          // Optionally auto-trigger next
          // runAgent('analyzer', discoveryData, 'strategist');
        }
      }
    } catch (error) {
      alert('Error in chat.');
    }
    setLoading(false);
  };

  // New: Function to generate and download Word document
  const downloadReport = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "AIROI - AI Return on Investment Report",
                bold: true,
                size: 32
              })
            ],
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on: ${new Date().toLocaleDateString()}`,
                size: 24
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          ...(auditData ? [
            new Paragraph({
              children: [new TextRun({ text: "1. Discovery Summary", bold: true, size: 28 })],
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: JSON.stringify(auditData, null, 2),
              spacing: { after: 400 }
            })
          ] : []),
          ...(analysis ? [
            new Paragraph({
              children: [new TextRun({ text: "2. Opportunity Analysis", bold: true, size: 28 })],
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: JSON.stringify(analysis, null, 2),
              spacing: { after: 400 }
            })
          ] : []),
          ...(roadmap ? [
            new Paragraph({
              children: [new TextRun({ text: "3. Roadmap", bold: true, size: 28 })],
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: JSON.stringify(roadmap, null, 2),
              spacing: { after: 400 }
            })
          ] : []),
          ...(implementation ? [
            new Paragraph({
              children: [new TextRun({ text: "4. Implementation Guidance", bold: true, size: 28 })],
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 200 }
            }),
            new Paragraph({
              text: implementation.toString(),
              spacing: { after: 400 }
            })
          ] : []),
          new Paragraph({
            children: [new TextRun({ text: "Final Report Summary", bold: true, size: 28 })],
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "This report outlines your AI transformation journey based on the AIROI assessment. Key recommendations include prioritizing quick wins for immediate ROI while building foundational capabilities for long-term strategic impact. Always involve human oversight for critical decisions.",
                size: 24
              })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Next Steps: Review the phased roadmap and begin implementation with the provided guidance. Re-run agents as your business evolves.",
                italics: true,
                size: 24
              })
            ],
            alignment: AlignmentType.CENTER
          })
        ]
      }]
    });

    try {
      setLoading(true);
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AIROI-Report.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating Word document. Please ensure all data is available.');
    }
    setLoading(false);
  };

  const hasReportData = auditData || analysis || roadmap || implementation;

  const DashboardView = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">AIROI - AI Return on Investment</h1>
          <p className="text-blue-100">Systematic AI transformation assessment and roadmap generation</p>
        </div>
        <button
          onClick={resetAll}
          disabled={loading || !hasReportData}
          className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 disabled:bg-gray-400 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(agents).map(([key, agent]) => {
          const Icon = agent.icon;
          const isActive = currentAgent === key;
          const hasData = key === 'discovery' ? auditData : 
                          (key === 'analyzer' ? analysis : 
                           (key === 'strategist' ? roadmap : implementation));
          return (
            <div key={key} className={`bg-white rounded-lg border-2 p-4 ${isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-blue-100'}`}>
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold">{agent.name}</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-2">
                <div>
                  <div className="font-medium text-green-600 flex items-center gap-1 mb-1">
                    <CheckCircle className="w-4 h-4" /> Can Do:
                  </div>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    {agent.capabilities.slice(0, 2).map((cap, i) => (
                      <li key={i}>{cap}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-amber-600 flex items-center gap-1 mb-1">
                    <AlertCircle className="w-4 h-4" /> Limitations:
                  </div>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    {agent.limitations.slice(0, 2).map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                onClick={() => startAgent(key)}
                disabled={loading || (hasData && !confirm('Overwrite existing results?'))}
                className="mt-3 w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400"
              >
                {hasData ? 'Re-run' : 'Start'}
              </button>
            </div>
          );
        })}
      </div>

      {/* New: Download Report Button */}
      {hasReportData && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
          <h3 className="font-semibold text-green-900 mb-3">Download Your Report</h3>
          <button
            onClick={downloadReport}
            disabled={loading}
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2 mx-auto"
          >
            <Download className="w-5 h-5" />
            {loading ? 'Generating...' : 'Download Word Report'}
          </button>
          <p className="text-sm text-green-700 mt-2">Includes all sections and a final summary</p>
        </div>
      )}

      {/* Display Results Summary */}
      {auditData && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Discovery Summary</h2>
          <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto whitespace-pre-wrap max-w-full break-words">{JSON.stringify(auditData, null, 2)}</pre>
          <button
            onClick={() => startAgent('analyzer')}
            className="mt-3 bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
          >
            Continue to Opportunity Analyzer
          </button>
        </div>
      )}

      {analysis && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Analysis Results</h2>
          <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto whitespace-pre-wrap max-w-full break-words">{JSON.stringify(analysis, null, 2)}</pre>
          <button
            onClick={() => startAgent('strategist')}
            className="mt-3 bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
          >
            Continue to Roadmap Strategist
          </button>
        </div>
      )}

      {roadmap && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Roadmap</h2>
          <pre className="text-sm bg-gray-50 p-4 rounded overflow-x-auto whitespace-pre-wrap max-w-full break-words">{JSON.stringify(roadmap, null, 2)}</pre>
          <button
            onClick={() => startAgent('executor')}
            className="mt-3 bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700"
          >
            Continue to Implementation Assistant
          </button>
        </div>
      )}

      {implementation && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Implementation Guidance</h2>
          <div className="text-sm bg-gray-50 p-4 rounded overflow-x-auto whitespace-pre-wrap max-w-full break-words">{implementation}</div>
        </div>
      )}

      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-4">Implementation Phases</h2>
        <div className="space-y-4">
          {phases.map((phase, idx) => {
            const Icon = phase.icon;
            return (
              <div key={idx} className="border-l-4 border-gray-300 pl-4">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`w-6 h-6 ${phase.color}`} />
                  <div>
                    <h3 className="font-semibold">{phase.name}</h3>
                    <p className="text-sm text-gray-600">{phase.timeframe}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <div className="text-sm font-medium text-green-600 mb-1">✓ AI Can:</div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {phase.canDo.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-red-600 mb-1">✗ AI Cannot:</div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {phase.cannotDo.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!auditData && !analysis && !roadmap && !implementation && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Ready to start your AI transformation?</h3>
          <p className="text-gray-700 mb-4">Select any agent above to begin. Use "Continue to [Next]" buttons to move deliberately between stages. Auto-chaining is disabled for better control.</p>
        </div>
      )}
    </div>
  );

  const ChatView = () => (
    <div className="flex flex-col h-[600px] bg-white rounded-lg border-2 border-gray-200">
      <div className="bg-gray-50 p-4 border-b-2 border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">AIROI Assistant</h2>
          {currentAgent && <p className="text-sm text-blue-600 font-medium">Active: {agents[currentAgent]?.name}</p>}
          <p className="text-sm text-gray-600">Interactive assessment and consultation</p>
        </div>
        <button
          onClick={() => {
            setChatHistory([]);
            setCurrentAgent(null);
            setActiveTab('dashboard');
          }}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Back to Dashboard
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-900'
            }`}>
              {msg.agent && (
                <div className="text-xs font-semibold mb-1 opacity-70">
                  {agents[msg.agent]?.name || 'AIROI'}
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t-2 border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChat();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <button
            onClick={handleChat}
            disabled={loading || !userInput.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );

  const SettingsView = () => (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6 space-y-6">
      <h2 className="text-xl font-bold">API Configuration</h2>
      
      <div>
        <label className="block text-sm font-medium mb-2">LLM Provider</label>
        <select
          value={apiConfig.provider}
          onChange={(e) => setApiConfig({...apiConfig, provider: e.target.value})}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="ollama">Ollama (Local)</option>
          <option value="groq">Groq</option>
          <option value="openrouter">OpenRouter</option>
        </select>
      </div>

      {apiConfig.provider === 'ollama' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Ollama URL</label>
            <input
              type="text"
              value={apiConfig.ollamaUrl}
              onChange={(e) => setApiConfig({...apiConfig, ollamaUrl: e.target.value})}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Model</label>
            <input
              type="text"
              value={apiConfig.model}
              onChange={(e) => setApiConfig({...apiConfig, model: e.target.value})}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </>
      )}

      {apiConfig.provider === 'groq' && (
        <div>
          <label className="block text-sm font-medium mb-2">Groq API Key</label>
          <input
            type="password"
            value={apiConfig.groqKey}
            onChange={(e) => setApiConfig({...apiConfig, groqKey: e.target.value})}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {apiConfig.provider === 'openrouter' && (
        <div>
          <label className="block text-sm font-medium mb-2">OpenRouter API Key</label>
          <input
            type="password"
            value={apiConfig.openrouterKey}
            onChange={(e) => setApiConfig({...apiConfig, openrouterKey: e.target.value})}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Migration Path to Claude</h3>
        <p className="text-sm text-gray-700">
          This POC uses Ollama/Groq/OpenRouter. When migrated to AWS Marketplace, 
          the same agent logic will use Claude via AWS Bedrock for production-grade performance.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'dashboard' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border-2 border-gray-200'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'chat' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border-2 border-gray-200'
            }`}
          >
            Chat Assistant
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'settings' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border-2 border-gray-200'
            }`}
          >
            Settings
          </button>
        </div>

        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'settings' && <SettingsView />}
      </div>
    </div>
  );
};

export default AIROI;