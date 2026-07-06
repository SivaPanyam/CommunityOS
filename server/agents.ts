import { GoogleGenAI, Type } from "@google/genai";

// ==========================================
// Google's Agent Development Kit (ADK) Pattern
// ==========================================

export interface AgentMemoryMessage {
  role: "user" | "model" | "system";
  text: string;
}

/**
 * Memory manager for managing agent-specific chat history
 */
export class AgentMemory {
  private messages: AgentMemoryMessage[] = [];

  constructor(initialMessages?: AgentMemoryMessage[]) {
    if (initialMessages) {
      this.messages = [...initialMessages];
    }
  }

  getHistory(): AgentMemoryMessage[] {
    return this.messages;
  }

  addMessage(role: "user" | "model" | "system", text: string) {
    this.messages.push({ role, text });
    // Keep history bounded to avoid token overflow
    if (this.messages.length > 30) {
      this.messages.shift();
    }
  }

  clear() {
    this.messages = [];
  }
}

/**
 * Interface representing a tool available to an agent
 */
export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: any) => Promise<any> | any;
}

/**
 * Individual Agent definition
 */
export class Agent {
  public id: string;
  public name: string;
  public systemPrompt: string;
  public memory: AgentMemory;
  public tools: AgentTool[];
  public modelName: string;
  public responseSchema: any;

  constructor(config: {
    id: string;
    name: string;
    systemPrompt: string;
    tools?: AgentTool[];
    modelName?: string;
    responseSchema?: any;
  }) {
    this.id = config.id;
    this.name = config.name;
    this.systemPrompt = config.systemPrompt;
    this.memory = new AgentMemory();
    this.tools = config.tools || [];
    this.modelName = config.modelName || "gemini-3.5-flash";
    this.responseSchema = config.responseSchema;
  }

  /**
   * Run the agent with native tool execution and reasoning.
   */
  async run(
    userInput: string,
    aiClient: GoogleGenAI | null,
    customContext?: string
  ): Promise<{
    text: string;
    reasoning: string[];
    toolCalls: { tool: string; args: any; result: any }[];
    data: any;
  }> {
    const reasoning: string[] = [];
    const toolCallsPerformed: { tool: string; args: any; result: any }[] = [];

    // 1. Initial reasoning block
    reasoning.push(`[${this.name}] Starting session execution to evaluate query: "${userInput}"`);

    // 2. Fetch context via tools or build-in telemetry functions
    let toolContextString = "";
    if (this.tools.length > 0) {
      reasoning.push(`[${this.name}] Executing relevant diagnostic tools...`);
      for (const tool of this.tools) {
        try {
          reasoning.push(`[${this.name}] Tool Call: Executing ${tool.name}()`);
          const result = await tool.execute({});
          toolContextString += `\n[Tool output of ${tool.name}]:\n${JSON.stringify(result, null, 2)}\n`;
          toolCallsPerformed.push({
            tool: tool.name,
            args: {},
            result,
          });
        } catch (err) {
          console.error(`Error running tool ${tool.name}:`, err);
          reasoning.push(`[${this.name}] Tool Error: Failed executing ${tool.name}`);
        }
      }
    }

    // 3. Assemble complete context for generation
    const fullSystemPrompt = `
      ${this.systemPrompt}
      
      CRITICAL INSTRUCTION: You are a smart city AI agent. You must execute precise reasoning based ONLY on real telemetry.
      
      ${customContext ? `\nADDITIONAL CURRENT STATE / CONTEXT:\n${customContext}` : ""}
      
      ${toolContextString ? `\nDIAGNOSTIC TOOL TELEMETRY RETRIEVED:\n${toolContextString}` : ""}
      
      You must think step-by-step to arrive at your final answers. Include your detailed reasoning.
    `;

    // 4. Save input to memory
    this.memory.addMessage("user", userInput);

    // 5. Build contents array combining memory and current request
    const contents: any[] = [];
    this.memory.getHistory().forEach((msg) => {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      });
    });

    // If no AI key, return simulated structure
    if (!aiClient) {
      reasoning.push(`[${this.name}] Simulation Mode Active: Creating mock structured report.`);
      const simulatedData = this.getSimulatedFallback(userInput, toolCallsPerformed);
      this.memory.addMessage("model", JSON.stringify(simulatedData));
      return {
        text: simulatedData.summary,
        reasoning,
        toolCalls: toolCallsPerformed,
        data: simulatedData,
      };
    }

    try {
      reasoning.push(`[${this.name}] Querying Gemini API for structured coordination.`);
      const response = await aiClient.models.generateContent({
        model: this.modelName,
        contents,
        config: {
          systemInstruction: fullSystemPrompt,
          responseMimeType: "application/json",
          responseSchema: this.responseSchema,
        },
      });

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText.trim());

      // Save to memory
      this.memory.addMessage("model", responseText);

      reasoning.push(`[${this.name}] Execution successful. Generated structured recommendation.`);
      return {
        text: parsedData.summary || "No summary provided.",
        reasoning,
        toolCalls: toolCallsPerformed,
        data: parsedData,
      };
    } catch (error) {
      console.error(`[${this.name}] Execution error:`, error);
      reasoning.push(`[${this.name}] Execution Error: ${String(error)}. Constructing safe recovery model.`);
      const simulatedData = this.getSimulatedFallback(userInput, toolCallsPerformed);
      return {
        text: simulatedData.summary,
        reasoning,
        toolCalls: toolCallsPerformed,
        data: simulatedData,
      };
    }
  }

  /**
   * Safe mock generator for fallback/simulation mode when GEMINI_API_KEY is not supplied
   */
  private getSimulatedFallback(userInput: string, toolCalls: any[]): any {
    const isUrgent = userInput.toLowerCase().match(/(flood|accident|fire|critical|leak|power|bed|icu)/);
    
    // Attempt to pull metrics from tools
    const trafficTool = toolCalls.find((t) => t.tool === "getTrafficStatus");
    const envTool = toolCalls.find((t) => t.tool === "getEnvironmentStatus");
    const healthTool = toolCalls.find((t) => t.tool === "getHealthcareStatus");
    const emergencyTool = toolCalls.find((t) => t.tool === "getEmergencyStatus");
    const citizenTool = toolCalls.find((t) => t.tool === "getCitizenStatus");
    const resourceTool = toolCalls.find((t) => t.tool === "getResourceStatus");

    let statusMetrics = "Heuristic matching shows normal operation.";
    if (this.id === "traffic-agent" && trafficTool?.result?.length > 0) {
      const first = trafficTool.result[0];
      statusMetrics = `Expwy Speed is ${first.average_speed_kmh}km/h with a congestion index of ${first.congestion_index}.`;
    } else if (this.id === "environment-agent" && envTool?.result?.weather?.length > 0) {
      const weather = envTool.result.weather[envTool.result.weather.length - 1];
      statusMetrics = `Current rainfall is ${weather.rainfall_mm}mm/hr with warning: "${weather.warnings || 'None'}".`;
    } else if (this.id === "emergency-agent" && emergencyTool?.result?.length > 0) {
      const active = emergencyTool.result.filter((e: any) => e.status !== "Resolved");
      statusMetrics = `Active emergency calls total is ${active.length}. Recent: ${active[0]?.title || 'None'}.`;
    }

    return {
      summary: `[Simulated Model Mode - ${this.name}] Analyzed context for request: "${userInput}". Domain status: ${statusMetrics}. Recommended automated adjustments initiated.`,
      evidence: `Synthesized Heuristics:\n- Targeted Query: "${userInput}"\n- Domain Key metrics: ${statusMetrics}\n- Simulation baseline verified.`,
      predictions: `12-hour projection indicates a 15% lower queue buildup if recommendations are dispatched immediately.`,
      recommendations: [
        `Automate secondary overrides to balance the load.`,
        `Pre-stage standard divisional response squads in adjacent wards.`
      ],
      confidenceScore: 85,
      affectedAreas: ["Downtown Core", "North sector"],
      responsibleDepartments: ["Municipal Operations", `${this.name.split(" ")[0]} Department`],
      priority: isUrgent ? "High" : "Medium",
      proposedActions: [
        {
          id: `SIM-ACT-${this.id.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900) + 100}`,
          title: `Dispatch Domain Priority Protocol`,
          description: `Initiate active state stabilization based on simulated local heuristics matching "${userInput}".`,
          targetSector: this.name.split(" ")[0],
          impactMetric: `Reduces response lag by 22%`,
          automatedWorkflow: true
        }
      ]
    };
  }
}

// ==========================================
// Orchestrator Coordinator Pattern
// ==========================================

export class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private aiClient: GoogleGenAI | null = null;

  constructor(aiClient: GoogleGenAI | null) {
    this.aiClient = aiClient;
  }

  registerAgent(agent: Agent) {
    this.agents.set(agent.id, agent);
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Orchestrates multi-agent execution.
   * If agent is 'Decision Agent' (Decision Master), we run ALL specialized agents in parallel first,
   * collect their domain summaries and proposals, and feed them into the Decision Agent as context
   * to compile the final consolidated master decision!
   */
  async coordinate(
    targetAgentId: string,
    userInput: string,
    history?: any[]
  ): Promise<{
    agentName: string;
    summary: string;
    evidence: string;
    predictions: string;
    recommendations: string[];
    confidenceScore: number;
    affectedAreas: string[];
    responsibleDepartments: string[];
    priority: string;
    proposedActions: any[];
    // Telemetry trace of the multi-agent activity
    orchestrationTrace?: {
      agentId: string;
      agentName: string;
      text: string;
      reasoning: string[];
      toolCalls: any[];
      data: any;
    }[];
  }> {
    // If targeted agent is not found, fallback to Decision Agent
    const activeAgent = this.getAgent(targetAgentId) || this.getAgent("decision-agent");
    if (!activeAgent) {
      throw new Error("No active agents registered in the Orchestrator.");
    }

    // Set custom history if provided
    if (history && Array.isArray(history)) {
      activeAgent.memory.clear();
      history.forEach((h: any) => {
        activeAgent.memory.addMessage(h.role === "user" ? "user" : "model", h.text);
      });
    }

    // SCENARIO 1: We are calling a specialized domain agent directly
    if (activeAgent.id !== "decision-agent") {
      const runResult = await activeAgent.run(userInput, this.aiClient);
      
      // Inject some orchestration metrics inside trace for UI
      const traceItem = {
        agentId: activeAgent.id,
        agentName: activeAgent.name,
        text: runResult.text,
        reasoning: runResult.reasoning,
        toolCalls: runResult.toolCalls,
        data: runResult.data,
      };

      return {
        agentName: activeAgent.name,
        ...runResult.data,
        orchestrationTrace: [traceItem],
      };
    }

    // SCENARIO 2: We are running the master Decision Agent (Collaborative multi-agent orchestration!)
    console.log(`[Orchestrator] Beginning complete multi-agent collaborative synthesis for Decision Agent.`);
    
    // Get all registered specialized domain agents (excluding decision-agent itself)
    const domainAgents = this.getAllAgents().filter((a) => a.id !== "decision-agent");
    
    // Execute all domain agents in parallel
    const domainRunPromises = domainAgents.map(async (agent) => {
      try {
        console.log(`[Orchestrator] Dispatching domain agent: ${agent.name}`);
        const result = await agent.run(userInput, this.aiClient);
        return {
          agentId: agent.id,
          agentName: agent.name,
          success: true,
          result,
        };
      } catch (err) {
        console.error(`[Orchestrator] Domain agent ${agent.name} failed during dispatch:`, err);
        return {
          agentId: agent.id,
          agentName: agent.name,
          success: false,
          error: String(err),
        };
      }
    });

    const domainResults = await Promise.all(domainRunPromises);

    // Build the collaborative workspace transcript to feed the Decision Agent
    let collaborationWorkspace = "=== COLLABORATIVE DOMAIN ANALYSIS TRANSCRIPTS ===\n";
    const traceItems: any[] = [];

    domainResults.forEach((res: any) => {
      if (res.success && res.result) {
        collaborationWorkspace += `\n---------------------------------------\n`;
        collaborationWorkspace += `AGENT: ${res.agentName} (${res.agentId})\n`;
        collaborationWorkspace += `SUMMARY: ${res.result.text}\n`;
        collaborationWorkspace += `EVIDENCE DETECTED: ${res.result.data?.evidence || ""}\n`;
        collaborationWorkspace += `LOCAL PREDICTIONS: ${res.result.data?.predictions || ""}\n`;
        collaborationWorkspace += `SUGGESTED LOCAL WORKFLOWS: ${JSON.stringify(res.result.data?.proposedActions || [])}\n`;
        collaborationWorkspace += `---------------------------------------\n`;

        traceItems.push({
          agentId: res.agentId,
          agentName: res.agentName,
          text: res.result.text,
          reasoning: res.result.reasoning,
          toolCalls: res.result.toolCalls,
          data: res.result.data,
        });
      } else {
        collaborationWorkspace += `\n[Agent ${res.agentName} encountered an error and could not complete its domain evaluation.]\n`;
      }
    });

    collaborationWorkspace += `\n=== END OF DOMAIN ANALYSES ===\n`;

    // Execute the Decision Agent with the assembled multi-agent workspace transcript as context
    console.log(`[Orchestrator] Executing Master Decision Agent to synthesize final recommendations...`);
    const decisionResult = await activeAgent.run(
      userInput,
      this.aiClient,
      collaborationWorkspace
    );

    return {
      agentName: activeAgent.name,
      ...decisionResult.data,
      orchestrationTrace: traceItems,
    };
  }
}

// ==========================================
// Base Structured Outputs Schemas
// ==========================================

export const masterDecisionSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { 
      type: Type.STRING,
      description: "Clear, direct, polished 2-3 sentence overview synthesizing all expert reports on the current domain status."
    },
    evidence: { 
      type: Type.STRING,
      description: "Bullet points citing specific metrics, thresholds, or agent findings (e.g., 'Traffic Agent reports speed of 22km/h on Expressway', 'Environment Agent reports PM2.5 of 185')."
    },
    predictions: { 
      type: Type.STRING,
      description: "Cross-domain forecasted concerns for the next 12 to 24 hours (e.g. 'Congestion on Metro Bridge risks delaying paramedic arrivals at hospital')."
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Recommended general action bullet points for the administrator."
    },
    confidenceScore: { 
      type: Type.INTEGER,
      description: "Synthesis reliability score from 0 to 100."
    },
    affectedAreas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Key neighborhoods or transit corridors affected by the current analysis."
    },
    responsibleDepartments: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Departments tasked with handling the recommended actions."
    },
    priority: { 
      type: Type.STRING,
      description: "Critical, High, Medium, or Low priority indicator."
    },
    proposedActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          targetSector: { type: Type.STRING },
          impactMetric: { type: Type.STRING },
          automatedWorkflow: { type: Type.BOOLEAN }
        },
        required: ["id", "title", "description", "targetSector", "impactMetric", "automatedWorkflow"]
      },
      description: "Automated workflow items that can be clicked to execute instantly on the municipal dashboard."
    }
  },
  required: [
    "summary",
    "evidence",
    "predictions",
    "recommendations",
    "confidenceScore",
    "affectedAreas",
    "responsibleDepartments",
    "priority",
    "proposedActions"
  ]
};

/**
 * Initializes and registers the 7 independent agents in a structured Orchestrator
 */
export function initializeOrchestrator(aiClient: GoogleGenAI | null, state: any): AgentOrchestrator {
  const orchestrator = new AgentOrchestrator(aiClient);

  // Define dynamic real-time state extraction tools for agents
  const trafficTool: AgentTool = {
    name: "getTrafficStatus",
    description: "Queries active road corridors, speed metrics, and congestion index.",
    parameters: { type: "object", properties: {} },
    execute: () => state.traffic.slice(-5),
  };

  const environmentTool: AgentTool = {
    name: "getEnvironmentStatus",
    description: "Queries historical rain, AQI sensors, and climate forecasts.",
    parameters: { type: "object", properties: {} },
    execute: () => ({
      weather: state.weather.slice(-3),
      airQuality: state.airQuality.slice(-3),
    }),
  };

  const healthcareTool: AgentTool = {
    name: "getHealthcareStatus",
    description: "Queries patient counts, average hospital wait times, and ICU capacities.",
    parameters: { type: "object", properties: {} },
    execute: () => state.hospital,
  };

  const citizenTool: AgentTool = {
    name: "getCitizenStatus",
    description: "Queries outstanding citizen claims, sentiment readings, and feedback categories.",
    parameters: { type: "object", properties: {} },
    execute: () => ({
      complaints: state.complaints.slice(0, 5),
      citizenFeedback: state.citizenFeedback.slice(-5),
    }),
  };

  const emergencyTool: AgentTool = {
    name: "getEmergencyStatus",
    description: "Queries active dispatch logs and critical responder allocations.",
    parameters: { type: "object", properties: {} },
    execute: () => state.emergency.filter((e: any) => e.status !== "Resolved"),
  };

  const resourceTool: AgentTool = {
    name: "getResourceStatus",
    description: "Queries power grids, municipal reservoirs, and approved workflows.",
    parameters: { type: "object", properties: {} },
    execute: () => ({
      power: state.power.slice(-3),
      water: state.water,
      approvedActions: state.approvedActions.slice(0, 5),
    }),
  };

  // 1. Register Traffic Agent
  orchestrator.registerAgent(
    new Agent({
      id: "traffic-agent",
      name: "Traffic Agent",
      systemPrompt: `You are the Traffic Agent of CommunityOS. Your domain is urban mobility, congestion forecasting, road safety, signal controller optimization, and transit routing.
      Analyze current traffic metrics and generate recommendations focusing on traffic signal overrides, lane diversions, and transit priority. Always output matching the structured schema.`,
      tools: [trafficTool],
      responseSchema: masterDecisionSchema,
    })
  );

  // 2. Register Environment Agent
  orchestrator.registerAgent(
    new Agent({
      id: "environment-agent",
      name: "Environment Agent",
      systemPrompt: `You are the Environment Agent of CommunityOS. Your domain is meteorological monitoring, AQI sensing, flood modeling, rainfall correlation, and sustainability tracking.
      Analyze environmental sensors and generate warnings for flood, smog, high UV indexes, and recommend ecological safety protocols. Always output matching the structured schema.`,
      tools: [environmentTool],
      responseSchema: masterDecisionSchema,
    })
  );

  // 3. Register Healthcare Agent
  orchestrator.registerAgent(
    new Agent({
      id: "healthcare-agent",
      name: "Healthcare Agent",
      systemPrompt: `You are the Healthcare Agent of CommunityOS. Your domain is hospital surge prediction, infectious disease tracking, ICU bed capacity routing, and emergency medical triage.
      Analyze clinic loads and hospital capacities, recommending triage relocations, patient diversions, or temporary clinical staff deployment. Always output matching the structured schema.`,
      tools: [healthcareTool],
      responseSchema: masterDecisionSchema,
    })
  );

  // 4. Register Citizen Agent
  orchestrator.registerAgent(
    new Agent({
      id: "citizen-agent",
      name: "Citizen Agent",
      systemPrompt: `You are the Citizen Agent of CommunityOS. Your domain is public relation audits, incoming complaint triaging, public sentiment tracking, and community center resource assignment.
      Analyze citizen reports and sentiment logs, prioritizing complaints, categorizing issues, and assigning street-level repairs to divisions. Always output matching the structured schema.`,
      tools: [citizenTool],
      responseSchema: masterDecisionSchema,
    })
  );

  // 5. Register Emergency Agent
  orchestrator.registerAgent(
    new Agent({
      id: "emergency-agent",
      name: "Emergency Agent",
      systemPrompt: `You are the Emergency Agent of CommunityOS. Your domain is rapid rescue dispatches, fire block containment, road accident routing, and geological hazards.
      Analyze active emergency incidents and coordinate rapid squad allocations, roadblock warnings, and rescue prioritizations. Always output matching the structured schema.`,
      tools: [emergencyTool],
      responseSchema: masterDecisionSchema,
    })
  );

  // 6. Register Resource Allocation Agent
  orchestrator.registerAgent(
    new Agent({
      id: "resource-agent",
      name: "Resource Allocation Agent",
      systemPrompt: `You are the Resource Allocation Agent of CommunityOS. Your domain is municipal assets, power grid demand management, water reservoir safety, power line failures, and municipal crew schedules.
      Analyze utility load parameters, and recommend automated power-saving, water valve control shutdowns, or crew mobilization. Always output matching the structured schema.`,
      tools: [resourceTool],
      responseSchema: masterDecisionSchema,
    })
  );

  // 7. Register Decision Agent (Master Coordinator)
  orchestrator.registerAgent(
    new Agent({
      id: "decision-agent",
      name: "Decision Agent",
      systemPrompt: `You are the Master Decision Agent of CommunityOS, an intelligent AI operating system for smart cities.
      Your primary role is to synthesize the domain-expert structured analyses from all specialized agents (Traffic, Environment, Healthcare, Citizen, Emergency, and Resource Allocation Agents).
      You must look for cross-domain correlations (e.g., how high rainfall reports from the Environment Agent correlate with expressway roadblocks from the Traffic Agent and hospital occupancy surges from the Healthcare Agent).
      Compile a singular, high-level, cohesive, structured tactical recommended decision representing the master operational guidance. Always output matching the structured schema.`,
      responseSchema: masterDecisionSchema,
    })
  );

  return orchestrator;
}

