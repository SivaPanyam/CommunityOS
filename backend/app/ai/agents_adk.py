import json
import random
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from .agent_base import BaseAgent
from .tools import domain_tools

# ==========================================
# 1. Structured Output Schemas
# ==========================================

class DomainAnalysisSchema(BaseModel):
    summary: str = Field(description="Summary overview of the current status in this specific domain.")
    evidence: str = Field(description="Key metrics and telemetry values justifying the status.")
    predictions: str = Field(description="Forecasted alerts or issues in the next 12-24 hours.")
    recommendations: List[str] = Field(description="List of domain-specific recommendations.")
    confidenceScore: int = Field(description="Confidence rating of this analysis (0-100).")
    affectedAreas: List[str] = Field(description="Municipal zones or roads affected.")
    priority: str = Field(description="Domain priority level: 'Low', 'Medium', 'High', or 'Critical'.")

class ProposedActionSchema(BaseModel):
    id: str = Field(description="Unique ID for the proposed action (e.g., ACT-201).")
    title: str = Field(description="Action directive title.")
    description: str = Field(description="Short operational instruction.")
    targetSector: str = Field(description="Domain sector targeted.")
    impactMetric: str = Field(description="Forecasted percentage or speed optimization benefit.")
    automatedWorkflow: bool = Field(description="True if this can execute automatically.")
    cost: str = Field(description="Cost estimate to execute the action: 'Low', 'Medium', or 'High'.")
    urgency: str = Field(description="Action urgency level: 'Critical', 'High', 'Medium', or 'Low'.")
    explainableReasoning: str = Field(description="Detailed explainable reasoning describing why this action is necessary.")
    supportingEvidence: str = Field(description="Verifiable metrics, telemetry values, or SOP sections supporting this action to avoid hallucinations.")

class DecisionSchema(BaseModel):
    summary: str = Field(description="Integrated overview of entire municipal health based on domain analysis.")
    evidence: str = Field(description="Synthesized evidence points.")
    predictions: str = Field(description="Integrated predictions.")
    recommendations: List[str] = Field(description="Consolidated list of urgent actions.")
    confidenceScore: int = Field(description="Composite confidence score.")
    affectedAreas: List[str] = Field(description="Consolidated affected municipal sectors.")
    responsibleDepartments: List[str] = Field(description="City agencies assigned to coordinate response.")
    priority: str = Field(description="Overall city warning level.")
    anomalies: List[str] = Field(description="List of detected telemetry anomalies or outliers across datasets.")
    domainRelationships: List[str] = Field(description="Analysis explaining relationships and correlations between domain parameters (e.g. Weather -> Traffic).")
    proposedActions: List[ProposedActionSchema] = Field(description="List of automated dispatch actions.")

# ==========================================
# 2. ADK Agents Subclasses
# ==========================================

class TrafficAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Traffic Agent",
            system_instruction=(
                "You are the Traffic Agent of CommunityOS. Your domain is urban mobility, congestion forecasting, road safety, "
                "signal timing, and public transit routing. Use query_telemetry_state('traffic') to audit speeds and check constraints. "
                "Output must strictly match DomainAnalysisSchema."
            ),
            tools=domain_tools,
            response_schema=DomainAnalysisSchema
        )

    def fallback_response(self, prompt: str) -> str:
        return json.dumps({
            "summary": "[Simulated] Traffic flowing normally on Downtown Expressway. Minor speed variation detected.",
            "evidence": "Average speed: 45 km/h. Congestion index: 0.45.",
            "predictions": "Peak congestion expected in 2 hours near Exit 2 underpass.",
            "recommendations": ["Optimize signal priority cycle on main arteries."],
            "confidenceScore": 88,
            "affectedAreas": ["Exit 2 Underpass"],
            "priority": "Medium"
        })

class EnvironmentAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Environment Agent",
            system_instruction=(
                "You are the Environment Agent of CommunityOS. Your domain is meteorological monitoring, AQI sensing, flood modeling, "
                "and carbon reporting. Use query_telemetry_state('weather') and query_telemetry_state('airQuality') to check levels. "
                "Output must strictly match DomainAnalysisSchema."
            ),
            tools=domain_tools,
            response_schema=DomainAnalysisSchema
        )

    def fallback_response(self, prompt: str) -> str:
        return json.dumps({
            "summary": "[Simulated] Environmental sensors normal. Moderate air quality values registered.",
            "evidence": "AQI: 72 (Moderate). PM2.5 levels normal.",
            "predictions": "Minor rainfall forecasted for evening. No flood warnings active.",
            "recommendations": ["Alert park systems to monitor drainage channels."],
            "confidenceScore": 85,
            "affectedAreas": ["Central District"],
            "priority": "Low"
        })

class CitizenAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Citizen Agent",
            system_instruction=(
                "You are the Citizen Agent of CommunityOS. Your domain is public relation audits, triaging citizen complaints, "
                "monitoring street repairs, and sentiment analysis. Use query_telemetry_state('complaints') to audit outstanding tickets. "
                "Output must strictly match DomainAnalysisSchema."
            ),
            tools=domain_tools,
            response_schema=DomainAnalysisSchema
        )

    def fallback_response(self, prompt: str) -> str:
        return json.dumps({
            "summary": "[Simulated] Triage completed for incoming citizen claims. 3 new tickets resolved.",
            "evidence": "Open tickets: 12. Most frequent category: waste collection delay.",
            "predictions": "Increased report frequency expected around public holiday zones.",
            "recommendations": ["Schedule waste disposal sweeps in Sector 4."],
            "confidenceScore": 90,
            "affectedAreas": ["Sector 4 Residential Block"],
            "priority": "Low"
        })

class HealthcareAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Healthcare Agent",
            system_instruction=(
                "You are the Healthcare Agent of CommunityOS. Your domain is emergency rooms waiting times, bed occupancy monitoring, "
                "medical supply logs, and epidemic surge tracking. Use query_telemetry_state('hospital') to check metrics. "
                "Output must strictly match DomainAnalysisSchema."
            ),
            tools=domain_tools,
            response_schema=DomainAnalysisSchema
        )

    def fallback_response(self, prompt: str) -> str:
        return json.dumps({
            "summary": "[Simulated] Hospital wait times normal. Emergency beds availability check completed.",
            "evidence": "Occupancy rate: 76%. ICU vacancy: 4 beds.",
            "predictions": "Routine weekend surge expected near general wards.",
            "recommendations": ["Pre-allocate standby medical shift personnel."],
            "confidenceScore": 92,
            "affectedAreas": ["City General Hospital"],
            "priority": "Low"
        })

class EmergencyAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Emergency Agent",
            system_instruction=(
                "You are the Emergency Agent of CommunityOS. Your domain is critical dispatches, structural hazards coordination, "
                "and disaster rescue alerts. Use query_telemetry_state('emergency') to check active alarms. "
                "Output must strictly match DomainAnalysisSchema."
            ),
            tools=domain_tools,
            response_schema=DomainAnalysisSchema
        )

    def fallback_response(self, prompt: str) -> str:
        return json.dumps({
            "summary": "[Simulated] No critical active alarms. Standby fire and medical rescue teams registered.",
            "evidence": "Active fire block alarms: 0. Responding rescue units: 0.",
            "predictions": "No structural risk alerts forecasted.",
            "recommendations": ["Maintain standard standby rescue parameters."],
            "confidenceScore": 95,
            "affectedAreas": ["All sectors"],
            "priority": "Low"
        })

class UtilityAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Utility Agent",
            system_instruction=(
                "You are the Utility Agent of CommunityOS. Your domain is utility pipeline checking, electricity grids monitoring, "
                "and water reservoir leaks tracking. Use query_telemetry_state('power') and query_telemetry_state('water') to audit grids. "
                "Output must match DomainAnalysisSchema."
            ),
            tools=domain_tools,
            response_schema=DomainAnalysisSchema
        )

    def fallback_response(self, prompt: str) -> str:
        return json.dumps({
            "summary": "[Simulated] Utilities and grid metrics stable. Reservoirs checked.",
            "evidence": "Reservoir level: 78.5%. Grid capacity demand stable.",
            "predictions": "Peak power demand expected during late afternoon heat index increase.",
            "recommendations": ["Audit backup generators on Substation B."],
            "confidenceScore": 87,
            "affectedAreas": ["Substation B Grid"],
            "priority": "Low"
        })

class ResourceAllocationAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Resource Allocation Agent",
            system_instruction=(
                "You are the Resource Allocation Agent of CommunityOS. Your domain is logistics optimization, allocating fleet resources, "
                "and auditing municipal response budgets. Check telemetry variables and coordinate dispatches. "
                "Output must match DomainAnalysisSchema."
            ),
            tools=domain_tools,
            response_schema=DomainAnalysisSchema
        )

    def fallback_response(self, prompt: str) -> str:
        return json.dumps({
            "summary": "[Simulated] Fleet response vehicles allocated to pending road clearing works.",
            "evidence": "Available service units: 8. Dispatched units: 2.",
            "predictions": "Additional fleet required if rainfall forecast increases.",
            "recommendations": ["Coordinate fuel reserve levels for emergency fleet."],
            "confidenceScore": 89,
            "affectedAreas": ["Depot Yard Alpha"],
            "priority": "Low"
        })

class DecisionAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Decision Agent",
            system_instruction=(
                "You are the Master Decision Agent of the CommunityOS Decision Intelligence Engine.\n"
                "Your task is to synthesize the structured reports of all specialized Domain Agents "
                "(Traffic, Environment, Citizen, Healthcare, Emergency, Utility, and Resource Allocation).\n\n"
                "CRITICAL DECISION DIRECTIVES:\n"
                "1. Analyze cross-domain relationships (e.g. how high rainfall from the environment agent triggers speed degradation from the traffic agent).\n"
                "2. Detect anomalies or outliers in active metrics.\n"
                "3. Prioritize proposed actions, assessing cost ('Low'|'Medium'|'High'), urgency ('Critical'|'High'|'Medium'|'Low'), and impact.\n"
                "4. STRICT TRUTH MANDATE: Never hallucinate proposed action parameters or evidence. Every recommendation must cite supporting evidence (e.g., active telemetry values, citizen complaint descriptions, or SOP rules) and include explainable reasoning.\n\n"
                "Output must strictly match DecisionSchema."
            ),
            tools=domain_tools,
            response_schema=DecisionSchema
        )

    def fallback_response(self, prompt: str) -> str:
        is_emergency = any(kw in prompt.lower() for kw in ["flood", "accident", "fire"])
        return json.dumps({
            "summary": f"[Simulated Decision] Municipal status audited. Prompt context analyzed: \"{prompt}\".",
            "evidence": "Synthesis of traffic speed, weather variables, and utilities index completed.",
            "predictions": "Normal evening operational flows forecasted. Low risk parameters.",
            "recommendations": ["Optimizing highway signal times.", "Diverting peak load to Sector 2 grid."],
            "confidenceScore": 90,
            "affectedAreas": ["Downtown Core", "Metro Bridge underpass"],
            "responsibleDepartments": ["Emergency Management Agency" if is_emergency else "Department of Transportation"],
            "priority": "High" if is_emergency else "Medium",
            "anomalies": ["None detected in local cache."],
            "domainRelationships": ["Weather variables currently normal. No traffic congestion correlation."],
            "proposedActions": [
                {
                    "id": f"ACT-{random.randint(100, 999)}",
                    "title": "Automate Underpass Exit Diversion" if is_emergency else "Optimize Smart Power Grid Load",
                    "description": "Adjusts local grid allocations or signals to mitigate minor delay.",
                    "targetSector": "Emergency" if is_emergency else "Smart Utilities",
                    "impactMetric": "Saves 12 minutes in transit bottlenecks.",
                    "automatedWorkflow": True,
                    "cost": "Low",
                    "urgency": "High" if is_emergency else "Medium",
                    "explainableReasoning": "Underpass exit priority redirect prevents secondary block accumulation.",
                    "supportingEvidence": "Rainfall index is stable. Primary signal lines show green corridors."
                }
            ]
        })
