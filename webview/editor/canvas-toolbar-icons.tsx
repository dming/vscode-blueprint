import React from "react";

const iconProps = {
  className: "bp-canvas-toolbar-icon",
  viewBox: "0 0 16 16",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true as const,
};

/** Undo — back chevron + stem */
export const IconUndo = () => (
  <svg {...iconProps}>
    <path
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 4L3 7l3 3M3 7h9"
    />
  </svg>
);

/** Redo — forward chevron + stem */
export const IconRedo = () => (
  <svg {...iconProps}>
    <path
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 4l3 3-3 3M13 7H4"
    />
  </svg>
);

/** Add node */
export const IconPlus = () => (
  <svg {...iconProps}>
    <path stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" d="M8 3.5v9M3.5 8h9" />
  </svg>
);

/** Focus / find selection */
export const IconFocusNode = () => (
  <svg {...iconProps}>
    <circle cx="8" cy="8" r="2.75" fill="none" stroke="currentColor" strokeWidth="1.15" />
    <path
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      d="M8 2v1.75M8 12.25V14M14 8h-1.75M3.75 8H2"
    />
  </svg>
);

/** Delete selected nodes */
export const IconDeleteNode = () => (
  <svg {...iconProps}>
    <path
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinejoin="round"
      d="M3 5.5h10M5.5 5.5V4h5v1.5M5 5.5l.75 8h4.5l.75-8"
    />
    <path stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" d="M6.5 8v4M9.5 8v4" />
  </svg>
);

/** Delete selected edge */
export const IconDeleteEdge = () => (
  <svg {...iconProps}>
    <path stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" d="M3 8h13" />
    <path stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" d="M6.5 5.5l3 5M9.5 5.5l-3 5" />
  </svg>
);

/** Reset viewport */
export const IconResetView = () => (
  <svg {...iconProps}>
    <path
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinejoin="round"
      d="M4 5.5h8v7H4zM2.5 3.5l2 2M13.5 3.5l-2 2"
    />
  </svg>
);

/** Reload node definitions */
export const IconReloadDefs = () => (
  <svg {...iconProps}>
    <path
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.5 4.5A5 5 0 1 0 13 10M11.5 4.5V2.5M11.5 4.5h2"
    />
  </svg>
);

/** Build */
export const IconBuild = () => (
  <svg {...iconProps}>
    <path
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.5 11l-2 2.5h3L9 11M6.5 6.5l4 4M10 5l1.5-1.5a1 1 0 0 0 0-1.4l-.6-.6a1 1 0 0 0-1.4 0L8 3l-4.5 4.5"
    />
  </svg>
);

/** Legend toggle */
export const IconLegend = () => (
  <svg {...iconProps}>
    <path stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" d="M3 4.5h10M3 8h10M3 11.5h7" />
  </svg>
);

/** Vertical guide left, block to the right */
export const IconAlignLeft = () => (
  <svg {...iconProps}>
    <path
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      d="M2.5 2v12M4.75 5h9.25v6h-9.25z"
    />
  </svg>
);

/** Vertical guide right, block to the left */
export const IconAlignRight = () => (
  <svg {...iconProps}>
    <path
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      d="M13.5 2v12M2 5h9.25v6H2z"
    />
  </svg>
);

/** Horizontal guide top, block below */
export const IconAlignTop = () => (
  <svg {...iconProps}>
    <path
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      d="M2 2.5h12M5 4.75v9.25h6V4.75z"
    />
  </svg>
);

/** Horizontal guide bottom, block above */
export const IconAlignBottom = () => (
  <svg {...iconProps}>
    <path
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      d="M2 13.5h12M5 2h6v9.25H5z"
    />
  </svg>
);

/** Distribute spacing along X (vertical bars) */
export const IconDistributeH = () => (
  <svg {...iconProps}>
    <path
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      d="M4 3v10M8 5v6M12 3v10"
    />
  </svg>
);

/** Distribute spacing along Y (horizontal bars) */
export const IconDistributeV = () => (
  <svg {...iconProps}>
    <path
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      d="M3 4h10M5 8h6M3 12h10"
    />
  </svg>
);

/** 2×2 grid — auto-arrange hint */
export const IconAutoLayout = () => (
  <svg {...iconProps}>
    <rect x="2" y="2" width="5" height="5" rx="0.75" fill="none" stroke="currentColor" strokeWidth="1.1" />
    <rect x="9" y="2" width="5" height="5" rx="0.75" fill="none" stroke="currentColor" strokeWidth="1.1" />
    <rect x="2" y="9" width="5" height="5" rx="0.75" fill="none" stroke="currentColor" strokeWidth="1.1" />
    <rect x="9" y="9" width="5" height="5" rx="0.75" fill="none" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);
