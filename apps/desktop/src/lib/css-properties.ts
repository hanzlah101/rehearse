// Lets `style` set CSS custom properties (`{ "--fill": "40%" }`), the way
// dynamic values reach Tailwind classes like `w-(--fill)`. React's types are
// `export = React`, so this merges into the React namespace itself.
export type CustomProperty = `--${string}`;

declare global {
  // oxlint-disable-next-line typescript/no-namespace
  namespace React {
    // oxlint-disable-next-line typescript/consistent-type-definitions
    interface CSSProperties {
      // An index signature, not a Record, so it merges into React's interface.
      // oxlint-disable-next-line typescript/consistent-indexed-object-style
      [property: CustomProperty]: string | number | undefined;
    }
  }
}
