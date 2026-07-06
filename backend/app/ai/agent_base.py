import logging
from typing import List, Dict, Any, Optional, Callable, Type
from pydantic import BaseModel
from google.genai import types
from .client import ai_client

logger = logging.getLogger("CommunityOS.AgentBase")

class BaseAgent:
    def __init__(
        self,
        name: str,
        system_instruction: str,
        tools: Optional[List[Callable]] = None,
        response_schema: Optional[Type[BaseModel]] = None,
        model: str = "gemini-2.5-flash"
    ):
        self.name = name
        self.system_instruction = system_instruction
        self.tools = tools or []
        self.response_schema = response_schema
        self.model = model
        self.history: List[Dict[str, str]] = []

    def clear_memory(self):
        self.history = []

    async def execute(self, prompt: str, chat_history: Optional[List[Dict[str, str]]] = None) -> Any:
        # Sync memory if custom chat history is passed
        current_history = chat_history if chat_history is not None else self.history
        
        logger.info(f"[{self.name}] Executing model {self.model} with prompt: {prompt[:100]}...")

        # Setup configuration
        config = types.GenerateContentConfig(
            system_instruction=self.system_instruction,
            temperature=0.1
        )

        # Hook up tools if present
        if self.tools:
            config.tools = self.tools

        # Hook up schema if present
        if self.response_schema:
            config.response_mime_type = "application/json"
            # In official google-genai, you can pass Pydantic model directly or JSON schema. We will let the API handle Pydantic model or schema formatting.
            config.response_schema = self.response_schema

        # Convert simple chat history dict to Google GenAI Types if necessary,
        # but for simple direct execution we format messages array
        contents = []
        for h in current_history:
            contents.append(types.Content(
                role="user" if h.get("role") == "user" else "model",
                parts=[types.Part.from_text(text=h.get("text", h.get("content", "")))]
            ))
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)]
        ))

        if not ai_client:
            logger.warning(f"[{self.name}] Gemini Client is offline. Returning simulated mock placeholder.")
            return self.fallback_response(prompt)

        try:
            response = ai_client.models.generate_content(
                model=self.model,
                contents=contents,
                config=config
            )
            
            # Save message to internal memory history
            self.history.append({"role": "user", "text": prompt})
            self.history.append({"role": "model", "text": response.text or ""})
            
            return response.text
        except Exception as e:
            logger.error(f"[{self.name}] Error during generation: {e}")
            raise e

    def fallback_response(self, prompt: str) -> str:
        # Base fallback handler, subclass can override
        return "{}"
