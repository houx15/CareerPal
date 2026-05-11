from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class GrowthNode(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=120)
    label: str = Field(min_length=1, max_length=160)
    state: Literal["done", "active", "locked"]
    quality: float = Field(ge=0, le=1)
    parent: str | None = None
    x: float
    y: float


class GrowthPlanUpsert(BaseModel):
    model_config = ConfigDict(extra="forbid")

    goal: str = Field(max_length=1000)
    nodes: list[GrowthNode] = Field(min_length=1)

    @field_validator("goal")
    @classmethod
    def goal_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Goal must not be blank")
        return stripped

    @model_validator(mode="after")
    def nodes_must_form_a_valid_tree(self) -> "GrowthPlanUpsert":
        node_ids = [node.id for node in self.nodes]
        if len(node_ids) != len(set(node_ids)):
            raise ValueError("Growth plan contains duplicate node ids")

        node_id_set = set(node_ids)
        parent_by_id = {node.id: node.parent for node in self.nodes}
        for node in self.nodes:
            if node.parent is None:
                continue
            if node.parent == node.id:
                raise ValueError("Growth plan node cannot use itself as parent")
            if node.parent not in node_id_set:
                raise ValueError("Growth plan node parent must reference an existing node")

        for node in self.nodes:
            seen: set[str] = set()
            current = node.id
            while parent_by_id[current] is not None:
                parent = parent_by_id[current]
                if parent in seen:
                    raise ValueError("Growth plan parent cycle detected")
                seen.add(current)
                current = parent

        return self


class GrowthPlanResponse(BaseModel):
    id: str
    goal: str
    nodes: list[GrowthNode]
    created_at: datetime
    updated_at: datetime
