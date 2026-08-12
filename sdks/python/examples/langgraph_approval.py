"""Run a complete LangGraph approval gate with a harmless simulated tool."""

from __future__ import annotations

import os
import uuid

from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from nodsend import Nodsend
from nodsend.integrations.langchain import approval_kwargs_from_interrupt


def archive_records(before_date: str) -> str:
    """Simulate archiving records created before a date."""

    return f"Simulated archive completed for records before {before_date}."


def main() -> None:
    reviewer = os.environ["NODSEND_REVIEWER_EMAIL"]
    model = os.getenv("NODSEND_EXAMPLE_MODEL", "openai:gpt-4.1-mini")
    thread_id = f"example-{uuid.uuid4()}"
    config = {"configurable": {"thread_id": thread_id}}

    agent = create_agent(
        model=model,
        tools=[archive_records],
        middleware=[
            HumanInTheLoopMiddleware(
                interrupt_on={
                    "archive_records": {"allowed_decisions": ["approve", "reject"]}
                }
            )
        ],
        # For a demo only. Use a durable checkpointer in production.
        checkpointer=InMemorySaver(),
    )

    result = agent.invoke(
        {
            "messages": [
                {
                    "role": "user",
                    "content": "Archive records created before 2026-01-01.",
                }
            ]
        },
        config=config,
        version="v2",
    )
    if not result.interrupts:
        raise RuntimeError("The agent finished without requesting approval.")

    with Nodsend() as client:
        approval = client.approvals.create(
            **approval_kwargs_from_interrupt(
                result.interrupts[0],
                recipient=reviewer,
                thread_id=thread_id,
            )
        )
        print(f"Approval {approval.id} sent to {reviewer}; waiting for a decision...")
        client.approvals.require_approved(approval.id, timeout=3600)

    resumed = agent.invoke(
        Command(resume={"decisions": [{"type": "approve"}]}),
        config=config,
        version="v2",
    )
    print(resumed.value["messages"][-1].content)


if __name__ == "__main__":
    main()
