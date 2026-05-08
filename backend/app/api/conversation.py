from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.user import User
from app.schemas.conversation import (
    ConversationMessageRequest,
    ConversationMessageResponse,
    ConversationResponse,
    ConversationStartRequest,
)

PLACEHOLDER_ASSISTANT_MESSAGE = "I noted that. CareerPal's AI response will be enabled in a later milestone."

router = APIRouter(prefix="/conversation", tags=["conversation"])


def _conversation_response(conversation: Conversation) -> ConversationResponse:
    return ConversationResponse(
        id=conversation.id,
        context_type=conversation.context_type,
        focus_node=conversation.focus_node,
        messages=conversation.messages or [],
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@router.post("/start", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def start_conversation(
    payload: ConversationStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationResponse:
    conversation = Conversation(
        user_id=current_user.id,
        context_type=payload.context_type,
        focus_node=payload.focus_node,
        messages=[],
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return _conversation_response(conversation)


@router.get("/history", response_model=list[ConversationResponse])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConversationResponse]:
    conversations = db.scalars(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.desc())
    ).all()
    return [_conversation_response(conversation) for conversation in conversations]


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationResponse:
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    return _conversation_response(conversation)


@router.post("/message", response_model=ConversationMessageResponse)
def send_message(
    payload: ConversationMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationMessageResponse:
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == payload.conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    now = datetime.now(timezone.utc).isoformat()
    user_message = {"role": "user", "content": payload.content, "timestamp": now}
    assistant_message = {"role": "assistant", "content": PLACEHOLDER_ASSISTANT_MESSAGE, "timestamp": now}
    conversation.messages = [*(conversation.messages or []), user_message, assistant_message]
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return ConversationMessageResponse(
        conversation_id=conversation.id,
        assistant_message=assistant_message,
        messages=conversation.messages,
    )
