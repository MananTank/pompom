# pompom

Create TypeSafe design-system with powerful inline styles. Inspired by [CSS-Hooks](https://css-hooks.com/)

## TLDR;

- It allows you to define conditional styles just using inline styles ( example: selectors like `:hover` or queries like `@media`, `@container` etc.. )
- There is no build step
- It does not inject stylesheets into the DOM - the `style` API simply returns a modified object that you pass to it. so very little runtime overhead.

Here's how it looks like:

### define your design system

```ts
import { defineConfig } from '@pompom/react';

const colors = {
	accent: 'blue',
	secondary: 'gray',
	primary: 'white',
};

type Spacing = 0 | 1 | 2 | 3 | 4 | 5;
type Color = keyof typeof colors;

export const { stylesheet, style } = defineConfig({
	// define what conditions you want to use
	conditions: {
		hover: '&:hover',
		md: '@media (min-width: 768px)',
		dark: '.dark &',
	},
	// define your design system
	// custom properties or override existing CSS properties and restrict their values to a specific set of values
	properties: {
		color: (c: Color) => ({ color: colors[c] }),
		p: (v: Spacing) => ({ padding: v * 4 + 'px' }),
	},
});
```

### render `stylesheet` in root

```ts
import { stylesheet } from './config';

// stylesheet is a static string that contains the magic to make the conditions work on inline styles

function App() {
	return (
		<div>
			<style dangerouslySetInnerHTML={{ __html: stylesheet }} />
			...
		</div>
	);
}
```

### Use `style` in components

```tsx
import { style } from './config';

const container = style({
	p: 2,
	color: 'primary',
	hover: {
		color: 'accent',
	},
	md: {
		p: 4,
	},
});

function Example() {
	return <div style={container}> Hello </div>;
}
```

## Installation

```bash
npm i @pompom/react
```
