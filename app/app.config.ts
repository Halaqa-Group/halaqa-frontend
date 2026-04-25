export default defineAppConfig({
  ui: {
    colors: {
      primary: 'purple',
      secondary: 'teal',
      neutral: 'slate'
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
    }
  }
})
