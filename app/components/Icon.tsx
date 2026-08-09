import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "activity" | "approval" | "approvalToken" | "arrow" | "atomicDecision" | "bolt" | "book" | "check"
  | "chevron" | "clock" | "code" | "copy" | "crewai" | "dashboard" | "github"
  | "key" | "langchain" | "lock" | "mail" | "menu" | "pulse"
  | "replayWebhook" | "settings" | "shield" | "spark" | "tenantKey"
  | "terminal" | "autogen" | "user" | "webhook" | "x";

const paths: Record<IconName, ReactNode> = {
  activity: <><path d="M3 12h4l2.2-6 4.1 12 2.2-6H21" /></>,
  approval: <><path d="M12 3 4.5 6.5v5.8c0 4.7 3.2 7.5 7.5 8.7 4.3-1.2 7.5-4 7.5-8.7V6.5L12 3Z" /><path d="m8.8 12.1 2.1 2.1 4.5-4.6" /></>,
  approvalToken: <><path d="M5 5h14v4a3 3 0 0 0 0 6v4H5v-4a3 3 0 0 0 0-6V5Z" /><circle cx="12" cy="12" r="1.7" /><path d="M12 8.2V7M12 17v-1.2" /></>,
  arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
  atomicDecision: <><circle cx="12" cy="12" r="8.5" /><path d="m8.3 12 2.5 2.5 4.9-5" /><path d="M12 3.5v2M20.5 12h-2M12 20.5v-2M3.5 12h2" /></>,
  bolt: <><path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" /></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  code: <><path d="m8 9-4 3 4 3" /><path d="m16 9 4 3-4 3" /><path d="m14 5-4 14" /></>,
  copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  crewai: <><circle cx="12" cy="5" r="2.25" /><circle cx="5" cy="18" r="2.25" /><circle cx="19" cy="18" r="2.25" /><circle cx="12" cy="12" r="1.5" /><path d="M12 7.25v3.25M10.9 13.1 6.5 16.3M13.1 13.1l4.4 3.2" /></>,
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  github: <><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9" /><path d="m16 7 3 3" /></>,
  langchain: <><circle cx="5" cy="6" r="2.5" /><circle cx="12" cy="12" r="2.5" /><circle cx="19" cy="18" r="2.5" /><path d="m6.9 7.65 3.2 2.7M13.9 13.65l3.2 2.7" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  pulse: <><path d="M4 13h4l2-7 4 12 2-5h4" /></>,
  replayWebhook: <><path d="M19.2 8A7.5 7.5 0 0 0 6.3 5.8L4 8" /><path d="M4 4v4h4" /><path d="M4.8 16A7.5 7.5 0 0 0 17.7 18.2L20 16" /><path d="M20 20v-4h-4" /><path d="m9 12 2 2 4-4" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.7V21h-4v-.1a1.8 1.8 0 0 0-1-1.7 1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 3 14H3v-4h.1a1.8 1.8 0 0 0 1.7-1 1.8 1.8 0 0 0-.4-2l-.1-.1 2.8-2.8.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 3V3h4v.1a1.8 1.8 0 0 0 1 1.7 1.8 1.8 0 0 0 2-.4l.1-.1 2.8 2.8-.1.1a1.8 1.8 0 0 0-.4 2A1.8 1.8 0 0 0 21 10h.1v4H21a1.8 1.8 0 0 0-1.6 1Z" /></>,
  shield: <><path d="M12 3 4.5 6.5v5.8c0 4.7 3.2 7.5 7.5 8.7 4.3-1.2 7.5-4 7.5-8.7V6.5L12 3Z" /><path d="M12 8v4" /><path d="M12 16h.01" /></>,
  spark: <><path d="m12 2 1.4 4.6L18 8l-4.6 1.4L12 14l-1.4-4.6L6 8l4.6-1.4L12 2Z" /><path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z" /></>,
  tenantKey: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M9 4v16" /><circle cx="14" cy="11" r="2.5" /><path d="m15.8 12.8 3.2 3.2M17.6 14.6 16 16.2" /></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3" /><path d="M13 15h4" /></>,
  autogen: <><rect x="9" y="9" width="6" height="6" rx="1.5" /><path d="M6.4 7.2A7.5 7.5 0 0 1 19 9" /><path d="m16 9 3 .2.8-2.9" /><path d="M17.6 16.8A7.5 7.5 0 0 1 5 15" /><path d="m8 15-3-.2-.8 2.9" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  webhook: <><circle cx="6" cy="7" r="3" /><circle cx="18" cy="17" r="3" /><path d="M9 7h3a5 5 0 0 1 5 5v2" /><path d="m14 12 3 3 3-3" /></>,
  x: <path d="m6 6 12 12M18 6 6 18" />,
};

export function Icon({ name, size = 18, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}
