import json
import logging
import asyncio
from typing import List, Dict, Any
from .agent_base import BaseAgent
from .agents_adk import (
    TrafficAgent,
    EnvironmentAgent,
    CitizenAgent,
    HealthcareAgent,
    EmergencyAgent,
    UtilityAgent,
    ResourceAllocationAgent,
    DecisionAgent
)

logger = logging.getLogger("CommunityOS.Orchestrator")

class AgentOrchestrator:
    def __init__(self):
        self.domain_agents: Dict[str, BaseAgent] = {}
        self.decision_agent = DecisionAgent()

        # Bootstrap default ADK agents
        self.register_agent(TrafficAgent())
        self.register_agent(EnvironmentAgent())
        self.register_agent(CitizenAgent())
        self.register_agent(HealthcareAgent())
        self.register_agent(EmergencyAgent())
        self.register_agent(UtilityAgent())
        self.register_agent(ResourceAllocationAgent())

    def register_agent(self, agent: BaseAgent):
        """
        Dynamically registers a new domain agent into the orchestrator.
        """
        self.domain_agents[agent.name] = agent
        logger.info(f"[Orchestrator] Successfully registered agent: {agent.name}")

    async def route_and_resolve(self, message: str, history: List[Dict[str, str]], target_agent: str = "Decision Agent") -> Dict[str, Any]:
        """
        Orchestration flow:
        - If query is targetted to a specific domain agent, run that agent only and return its structured domain report.
        - If query is targeted to 'Decision Agent', orchestrate all domain agents in parallel, collect their reports,
          pass the combined reports context to the DecisionAgent, and output a unified, final action plan.
        """
        logger.info(f"[Orchestrator] Resolving query targeting: {target_agent}")

        if target_agent != "Decision Agent" and target_agent in self.domain_agents:
            agent = self.domain_agents[target_agent]
            raw_response = await agent.execute(message, history)
            try:
                return json.loads(raw_response)
            except Exception:
                # Handle fallback if response was string/corrupted
                return json.loads(agent.fallback_response(message))

        # Full multi-agent orchestration for Master Decision Agent
        logger.info("[Orchestrator] Launching parallel domain agents execution...")
        
        tasks = []
        agent_names = list(self.domain_agents.keys())
        
        for name in agent_names:
            agent = self.domain_agents[name]
            # Domain agents analyze the query based on their local telemetry states
            tasks.append(agent.execute(message, history))
        
        # Gather all domain reports concurrently
        raw_reports = await asyncio.gather(*tasks, return_exceptions=True)
        
        domain_insights = ""
        for name, report in zip(agent_names, raw_reports):
            if isinstance(report, Exception):
                logger.error(f"[Orchestrator] Agent {name} raised an error during parallel execution: {report}")
                # Fallback to simulated response
                report_str = self.domain_agents[name].fallback_response(message)
            else:
                report_str = str(report)
            
            domain_insights += f"\n--- Insight from {name} ---\n{report_str}\n"

        # Construct Master system prompt with accumulated insights
        decision_prompt = f"""
        User Query: "{message}"
        
        Here are the structured analysis reports from our specialized Smart City Domain Agents:
        {domain_insights}
        
        Please synthesize this data, evaluate SOP rules, and compile the final Master CommunityOS action plan.
        """

        logger.info("[Orchestrator] Launching Master Decision Agent synthesis...")
        raw_decision = await self.decision_agent.execute(decision_prompt, history)
        
        try:
            return json.loads(raw_decision)
        except Exception as e:
            logger.error(f"[Orchestrator] Master Decision Agent returned non-JSON. Loading fallback schema: {e}")
            return json.loads(self.decision_agent.fallback_response(message))

# Shared instance
orchestrator = AgentOrchestrator()
