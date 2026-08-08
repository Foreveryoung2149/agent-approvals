"use client";

import { useRef, useState } from "react";
import { Icon } from "./Icon";

const restExample = [
  "curl https://api.nodsend.com/v1/approvals \\",
  "  -H \"Authorization: Bearer appr_live_...\" \\",
  "  -H \"Idempotency-Key: deploy-prod-1042\" \\",
  "  -d '{ \"action\": \"deploy_production\",",
  "       \"summary\": \"Release v4.2 to production\",",
  "       \"recipient\": \"owner@company.com\" }'",
].join("\n");

const examples = {
  REST: restExample,
  LangChain: `from nodsend.integrations.langchain import approval_kwargs_from_interrupt\n\napproval = nodsend.approvals.create(\n    **approval_kwargs_from_interrupt(\n        interrupt, recipient="owner@company.com",\n        thread_id=thread_id,\n    )\n)`,
  CrewAI: `from nodsend.integrations.crewai import NodsendFeedbackProvider\n\nprovider = NodsendFeedbackProvider(\n    nodsend, recipient="finance@company.com",\n)\n# Pass provider to CrewAI's @human_feedback gate.`,
  AutoGen: `from nodsend.integrations.autogen import function_tool\n\nguarded_deploy = function_tool(\n    deploy, client=nodsend,\n    recipient="ops@company.com",\n    summary="Deploy to production",\n    description="Deploy after human approval",\n)`,
};

export default function TerminalDemo() {
  const [active, setActive] = useState<keyof typeof examples>("REST");
  const tabRefs = useRef<Partial<Record<keyof typeof examples, HTMLButtonElement | null>>>({});
  const exampleNames = Object.keys(examples) as Array<keyof typeof examples>;

  function selectFromKeyboard(event: React.KeyboardEvent<HTMLButtonElement>, current: keyof typeof examples) {
    const currentIndex = exampleNames.indexOf(current);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % exampleNames.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + exampleNames.length) % exampleNames.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = exampleNames.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const next = exampleNames[nextIndex];
    setActive(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="terminal-stage" aria-label="Nodsend integration example">
      <div className="terminal-window">
        <div className="terminal-toolbar"><Icon name="terminal" size={14} /><strong>human-checkpoint.py</strong><span>live</span></div>
        <div className="terminal-tabs" role="tablist" aria-label="Integration examples">
          {exampleNames.map((name) => (
            <button
              key={name}
              ref={(element) => { tabRefs.current[name] = element; }}
              id={`integration-tab-${name.toLowerCase()}`}
              type="button"
              role="tab"
              aria-selected={active === name}
              aria-controls="integration-example-panel"
              tabIndex={active === name ? 0 : -1}
              className="terminal-tab"
              data-active={active === name}
              onClick={() => setActive(name)}
              onKeyDown={(event) => selectFromKeyboard(event, name)}
            >
              <Icon name={name === "REST" ? "code" : "spark"} size={16} />{name}
            </button>
          ))}
        </div>
        <pre
          id="integration-example-panel"
          className="terminal-code"
          role="tabpanel"
          aria-labelledby={`integration-tab-${active.toLowerCase()}`}
          tabIndex={0}
        ><code><b>$ </b>{examples[active]}</code></pre>
      </div>
    </div>
  );
}
