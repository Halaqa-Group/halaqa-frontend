export default defineAppConfig({
  toaster: {
    expand: false,
    position: "top-center" as const,
  },
  ui: {
    colors: {
      primary: "primary",
      secondary: "secondary",
      neutral: "neutral",
      error: "error",
      warning: "warning",
      success: "success",
      info: "info",
    },

    formField: {
      slots: {
        error: "mt-1 text-error text-sm lowercase ltr:first-letter:uppercase",
        help: "mt-1 text-muted text-sm",
      },
    },

    input: {
      slots: {
        root: "relative flex items-center",
        base: [
          "w-full rounded-md border-0 appearance-none placeholder:text-dimmed focus:outline-none disabled:cursor-not-allowed disabled:opacity-75",
          "transition-all",
        ],
      },
      defaultVariants: {},
    },

    inputNumber: {
      slots: {
        root: "relative flex items-center",
      },
      defaultVariants: {},
    },

    radioGroup: {
      defaultVariants: {},
    },

    textarea: {
      slots: {
        root: "relative flex items-center",
      },
      defaultVariants: {},
    },

    selectMenu: {
      slots: {
        base: "w-full",
        value: "ltr:first-letter:uppercase",
        itemLabel: "ltr:first-letter:uppercase",
      },
      defaultVariants: {},
    },

    breadcrumb: {
      variants: {
        active: {
          true: {
            link: "font-medium",
          },
        },
      },
    },

    navigationMenu: {
      slots: {
        link: "before:rounded-lg",
        childLink: "before:rounded-lg",
      },
      compoundVariants: [
        {
          orientation: "vertical",
          class: {
            list: "flex flex-col gap-1",
            link: "py-2",
          },
        },
        {
          variant: "pill",
          active: true,
          highlight: false,
          class: {
            link: "before:bg-primary hover:before:bg-primary text-white hover:text-white font-medium",
            linkLeadingIcon: "text-white group-hover:text-white",
            linkLabel: "text-white",
          },
        },
      ],
    },

    dashboardSidebar: {
      slots: {
        handle:
          "bg-[var(--color-sidebar-border)] hover:bg-[var(--color-outline-variant)] transition-colors duration-150",
      },
    },

    dashboardNavbar: {
      slots: {
        root: "border-b border-[var(--color-card-border)]",
      },
    },

    // Cleaner, lighter tables: a quiet tinted header (no vertical grid lines),
    // horizontal row dividers only, and a hover highlight on every row. No
    // letter-spacing/uppercase — those break Arabic's connected script.
    table: {
      slots: {
        root: "relative overflow-x-auto",
        thead: "bg-elevated/40",
        th: "px-4 py-3 text-xs font-semibold text-muted",
        td: "px-4 py-3.5 text-sm text-muted",
        tr: "hover:bg-elevated/30 transition-colors",
      },
    },

    avatar: {
      variants: {
        size: {
          lg: {
            fallback: "leading-[var(--text-lg--line-height)]",
          },
          xl: {
            fallback: "leading-[var(--text-xl--line-height)]",
          },
        },
      },
    },

    // Smaller, simpler toasts across all screen sizes. Width shrinks to fit the
    // content (centered) instead of filling the full toaster width, and caps at
    // the viewport width so long messages still wrap instead of overflowing.
    toast: {
      slots: {
        root: "p-2.5 gap-2 w-max max-w-full mx-auto",
        wrapper: "w-auto flex-initial min-w-0",
        title: "text-xs",
        description: "text-xs",
        icon: "size-4",
        // Hide the dismiss (X) on phones — toasts auto-dismiss and the X crowds the
        // compact mobile layout; it stays available from the sm breakpoint up.
        close: "p-0 max-sm:hidden",
      },
    },

    // Same dim as the modal overlay below, so drawers and modals read as one system.
    drawer: {
      slots: {
        overlay: "bg-gray-950/60",
      },
    },

    slideover: {
      slots: {
        overlay: "bg-gray-950/60",
      },
    },

    modal: {
      slots: {
        overlay: "fixed inset-0",
        title: "text-xl",
        description: "mt-0",
      },
      variants: {
        overlay: {
          true: {
            overlay: "bg-gray-950/60",
          },
        },
      },
    },
  },
});
