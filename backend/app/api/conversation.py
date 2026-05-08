import json
from datetime import datetime, timezone

import anyio
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.api.auth import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.conversation import Conversation
from app.models.user import User
from app.schemas.conversation import (
    ConversationMessageRequest,
    ConversationMessageResponse,
    ConversationResponse,
    ConversationStartRequest,
)
from app.services.llm import LLMMessage, LLMProviderError, build_llm_client

router = APIRouter(prefix="/conversation", tags=["conversation"])

CAREER_SYSTEM_PROMPT = """You are a career planning companion for university students.

Your goals:
- Help the student articulate and refine their experiences
- Ask specific, targeted questions, not generic advice
- When the student describes an experience, probe for what they did, what impact it had, what they learned, and any quantifiable outcomes
- Never fabricate information; only work with what the student tells you
- Keep the tone warm and encouraging, like a supportive mentor
"""


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


def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _profile_prompt_context(current_user: User) -> dict:
    profile = current_user.profile
    if profile is None:
        return {}

    return {
        "name": profile.name,
        "phone": profile.phone,
        "contact_email": profile.contact_email,
        "location": profile.location,
        "headline": profile.headline,
        "target_direction": profile.target_direction,
        "comment": profile.comment,
        "education": [
            {
                "school": item.school,
                "degree": item.degree,
                "time": item.time,
                "comment": item.comment,
            }
            for item in profile.education_items
        ],
        "experience": [
            {
                "company": item.company,
                "role": item.role,
                "time": item.time,
                "description": item.description,
                "achievements": item.achievements,
                "comment": item.comment,
            }
            for item in profile.experience_items
        ],
        "projects": [
            {
                "name": item.name,
                "description": item.description,
                "tech_stack": item.tech_stack,
                "achievements": item.achievements,
                "link": item.link,
                "comment": item.comment,
                "completeness": item.completeness,
            }
            for item in profile.project_items
        ],
        "skills": [
            {
                "name": item.name,
                "category": item.category,
                "proficiency": item.proficiency,
                "comment": item.comment,
            }
            for item in profile.skill_items
        ],
        "certificates": [
            {
                "name": item.name,
                "issuer": item.issuer,
                "date": item.date.isoformat(),
                "comment": item.comment,
            }
            for item in profile.certificate_items
        ],
    }


def _sections_needing_more_information(profile_context: dict) -> list[str]:
    sections = []
    if not all(profile_context.get(field) for field in ["name", "headline", "target_direction"]):
        sections.append("basics")
    if not all(profile_context.get(field) for field in ["phone", "contact_email", "location"]):
        sections.append("contact")
    if not profile_context.get("comment"):
        sections.append("summary")
    for section in ["education", "experience", "projects", "skills", "certificates"]:
        if not profile_context.get(section):
            sections.append(section)
    return sections


def _llm_messages(conversation: Conversation, user_content: str, current_user: User) -> list[LLMMessage]:
    focus = conversation.focus_node or "general"
    profile_context = _profile_prompt_context(current_user)
    sections_needing_info = _sections_needing_more_information(profile_context)
    profile_context_json = json.dumps(profile_context, ensure_ascii=True)
    missing_sections_json = json.dumps(sections_needing_info, ensure_ascii=True)
    messages = [
        LLMMessage(
            role="system",
            content=(
                f"{CAREER_SYSTEM_PROMPT}\nCurrent student's profile JSON:\n{profile_context_json}"
                f"\n\nSections that need more information:\n{missing_sections_json}"
                f"\n\nCurrent conversation focus: {focus}"
            ),
        )
    ]
    for message in conversation.messages or []:
        role = message.get("role")
        content = message.get("content")
        if role in {"user", "assistant"} and content:
            messages.append(LLMMessage(role=role, content=content))
    messages.append(LLMMessage(role="user", content=user_content))
    return messages


def _append_assistant_message(
    session_factory: sessionmaker,
    conversation_id: str,
    assistant_message: dict,
) -> ConversationMessageResponse:
    db = session_factory()
    try:
        conversation = db.scalar(select(Conversation).where(Conversation.id == conversation_id))
        if conversation is None:
            raise RuntimeError("Conversation disappeared while streaming")
        conversation.messages = [*(conversation.messages or []), assistant_message]
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return ConversationMessageResponse(
            conversation_id=conversation.id,
            assistant_message=assistant_message,
            messages=conversation.messages,
        )
    finally:
        db.close()


@router.post("/message")
def send_message(
    payload: ConversationMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == payload.conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    llm_client = build_llm_client(get_settings())
    llm_messages = _llm_messages(conversation, payload.content, current_user)
    now = datetime.now(timezone.utc).isoformat()
    user_message = {"role": "user", "content": payload.content, "timestamp": now}
    conversation.messages = [*(conversation.messages or []), user_message]
    db.add(conversation)
    db.commit()
    conversation_id = conversation.id
    session_factory = sessionmaker(bind=db.get_bind(), autoflush=False, autocommit=False)

    async def stream():
        assistant_content = ""
        try:
            async for chunk in llm_client.stream_chat(llm_messages):
                assistant_content += chunk
                yield _sse_event("message", {"delta": chunk})
        except LLMProviderError as exc:
            yield _sse_event("error", {"message": str(exc)})
            return
        except httpx.HTTPError as exc:
            yield _sse_event("error", {"message": f"LLM provider error: {exc}"})
            return

        assistant_message = {
            "role": "assistant",
            "content": assistant_content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        done_payload = await anyio.to_thread.run_sync(
            _append_assistant_message,
            session_factory,
            conversation_id,
            assistant_message,
        )
        yield f"event: done\ndata: {done_payload.model_dump_json()}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")
