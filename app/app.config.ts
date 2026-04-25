export default defineAppConfig({
  ui: {
    colors: {
      primary: "primary",
      secondary: "secondary"
    },
    button: {
      slots: {
        base: 'rounded-lg font-bold cursor-pointer transition-all'
      },
      defaultVariants: {
        size: 'md',
        color: 'primary',
        variant: 'solid'
      }
    },
    input: {
      slots: {
        base: 'rounded-lg transition-all',
        root: 'w-full'
      },
      defaultVariants: {
        size: 'md',
        color: 'neutral',
        variant: 'outline'
      }
    },
    textarea: {
      slots: {
        base: 'rounded-lg transition-all resize-none',
        root: 'w-full'
      },
      defaultVariants: {
        size: 'md',
        color: 'neutral',
        variant: 'outline'
      }
    },
    select: {
      slots: {
        base: 'rounded-lg transition-all',
        root: 'w-full'
      },
      defaultVariants: {
        size: 'md',
        color: 'neutral',
        variant: 'outline'
      }
    },
    formField: {
      slots: {
        label: 'font-semibold text-sm',
        error: 'mt-1 text-error',
      }
    }
  }
})
