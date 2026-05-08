from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ContextType = Literal["career", "page"]
MessageRole = Literal["user", "assistant"]


class ConversationStartRequest(BaseModel):
    context_type: ContextType
    focus_node: str | None = None


class ConversationMessage(BaseModel):
    role: MessageRole
    content: str
    timestamp: datetime | None = None


class ConversationResponse(BaseModel):
    id: str
    context_type: ContextType
    focus_node: str | None = None
    messages: list[ConversationMessage] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ConversationMessageRequest(BaseModel):
    conversation_id: str
    content: str


class ConversationMessageResponse(BaseModel):
    conversation_id: str
    assistant_message: ConversationMessage
    messages: list[ConversationMessage]
    extraction_diff: dict | None = None
