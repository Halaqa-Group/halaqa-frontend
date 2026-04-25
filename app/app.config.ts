export default defineAppConfig({
  toaster: {
    expand: false,
    position: 'top-center' as const
  },
  ui: {
    colors: {
      primary: 'primary',
      secondary: 'secondary'
    },

    formField: {
      slots: {
        error: 'mt-1 text-error text-sm lowercase ltr:first-letter:uppercase',
        help: 'mt-1 text-muted text-sm'
      }
    },

    input: {
      slots: {
        root: 'relative flex items-center'
      },
      defaultVariants: {
        // variant: 'subtle'
      }
    },

    inputNumber: {
      slots: {
        root: 'relative flex items-center'
      },
      defaultVariants: {
        // variant: 'subtle'
      }
    },

    radioGroup: {
      defaultVariants: {
        // variant: 'subtle'
      }
    },

    textarea: {
      slots: {
        root: 'relative flex items-center'
      },
      defaultVariants: {
        // variant: 'subtle'
      }
    },

    selectMenu: {
      slots: {
        base: 'w-full',
        value: 'ltr:first-letter:uppercase',
        itemLabel: 'ltr:first-letter:uppercase'
      },
      defaultVariants: {
        // variant: 'subtle'
      }
    },

    breadcrumb: {
      variants: {
        active: {
          true: {
            link: 'font-medium'
          }
        }
      }
    },

    navigationMenu: {
      slots: {
        link: 'before:rounded-lg',
        childLink: 'before:rounded-lg'
      },
      compoundVariants: [{
        orientation: 'vertical',
        class: {
          list: 'flex flex-col gap-1',
          link: 'py-2'
        }
      }, {
        variant: 'pill',
        active: true,
        highlight: false,
        class: {
          link: 'before:bg-primary/10 font-bold'
        }
      }]
    },

    table: {
      slots: {
        th: 'font-medium border-x border-x-default first-of-type:border-s-0 last-of-type:border-e-0 bg-default',
        td: 'px-4 py-3.5 border-x border-x-default first-of-type:border-s-0 last-of-type:border-e-0 bg-default'
      }
    },

    avatar: {
      variants: {
        size: {
          lg: {
            fallback: 'leading-[var(--text-lg--line-height)]'
          },
          xl: {
            fallback: 'leading-[var(--text-xl--line-height)]'
          }
        }
      }
    },

    modal: {
      slots: {
        title: 'text-xl',
        description: 'mt-0'
      }
    }
  }
})
