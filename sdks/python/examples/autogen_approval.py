"""Execute an approval-gated AutoGen FunctionTool without a model provider."""

from __future__ import annotations

import asyncio
import os
import uuid

from autogen_core import CancellationToken

from nodsend import AsyncNodsend
from nodsend.integrations.autogen import function_tool


async def deploy(environment: str, release: str) -> str:
    """Simulate deploying a release to an environment."""

    return f"Simulated deployment of {release} to {environment} completed."


async def main() -> None:
    reviewer = os.environ["NODSEND_REVIEWER_EMAIL"]
    operation_id = str(uuid.uuid4())

    async with AsyncNodsend() as client:
        tool = function_tool(
            deploy,
            client=client,
            recipient=reviewer,
            action="deploy_release",
            summary=lambda args: (
                f"Deploy {args['release']} to {args['environment']}"
            ),
            description="Deploy a release after mandatory human approval.",
            idempotency_key=lambda args: (
                f"example:{operation_id}:{args['environment']}:{args['release']}"
            ),
        )
        print(f"Sending approval to {reviewer}; the tool will wait for a decision...")
        result = await tool.run_json(
            {"environment": "staging", "release": "example-1"},
            CancellationToken(),
        )
        print(tool.return_value_as_string(result))


if __name__ == "__main__":
    asyncio.run(main())
