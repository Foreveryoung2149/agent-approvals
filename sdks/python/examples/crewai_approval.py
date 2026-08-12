"""Run a CrewAI Flow that pauses through Nodsend and then resumes."""

from __future__ import annotations

import os

from crewai.flow import Flow, HumanFeedbackPending, human_feedback, start

from nodsend import Nodsend
from nodsend.integrations.crewai import NodsendFeedbackProvider


def main() -> None:
    reviewer = os.environ["NODSEND_REVIEWER_EMAIL"]

    with Nodsend() as client:
        provider = NodsendFeedbackProvider(client, recipient=reviewer)

        class DeploymentFlow(Flow):
            @start()
            @human_feedback(
                message="Approve this simulated deployment plan?",
                provider=provider,
            )
            def deployment_plan(self) -> dict[str, str]:
                return {"release": "example-1", "environment": "staging"}

        result = DeploymentFlow().kickoff()
        if not isinstance(result, HumanFeedbackPending):
            raise RuntimeError(f"Expected a pending approval, received: {result!r}")

        approval_id = result.callback_info["approval_id"]
        flow_id = result.context.flow_id
        print(f"Approval {approval_id} sent to {reviewer}; waiting for a decision...")
        client.approvals.require_approved(approval_id, timeout=3600)

        # In production, call this from a verified, replay-protected webhook.
        resumed = DeploymentFlow.from_pending(flow_id).resume("approved")
        print(f"Flow resumed: {resumed!r}")


if __name__ == "__main__":
    main()
