// Internal Types -------------------------------------------------------------------
import type { CSSProperties } from 'react';

type CSSProps = CSSProperties;
type Properties = Record<string, (v: any) => CSSProps>;
type Conditions = Record<string, string>;

// Public Types ----------------------------------------------------------------------

export type ConfigOptions<C extends Conditions, P extends Properties> = {
	/**
	 * Define set of conditions to used. Use `&` to refer to current element.
	 *
	 * @example
	 * ```ts
	 * {
	 * 	hover: "&:hover",
	 * 	md: "@media (min-width: 768px)",
	 * 	dark: '.dark &',
	 * }
	 * ```
	 */
	conditions?: C;
	/**
	 * Build a design system by defiining either custom shorthand properties or restrcting the values of existing properties.
	 *
	 * @example
	 * ```ts
	 * type Spacing = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
	 *
	 * const colors = { accent: 'blue', secondary: 'gray' };
	 * type Color = keyof typeof colors;
	 *
	 * defineConfig({
	 * 	properties: {
	 * 		m: (v: Spacing) => ({ margin: v * 4 + 'px' }),
	 * 		text: (v: Color) => ({ color: colors[v] }),
	 * 	}
	 * })
	 * ```
	 */
	properties?: P;
	/**
	 * Prefix to apply to the generated CSS variables names in the returned `stylesheet` string.
	 * The default is `p` which will generate variables like `--p1-1`, `--p1-0`, `--p2-1`, `--p2-0`, etc.
	 */
	cssVariablePrefix?: string;
};

export type PomPomStyle<C extends Conditions, P extends Properties> =
	// remove the defined properties from the Framework CSS Properties
	// add the user defined properties
	| (Omit<CSSProps, keyof P> & {
			[K in keyof P]?: Parameters<P[K]>[0];
	  })
	| {
			[K in keyof C]?: PomPomStyle<C, P>;
	  };

// Internal -------------------------------------------------------------------

/**
 * Get the stylesheet required for defining given selector
 */
function getSelectorStylesheet(selector: string, id: string) {
	const s = selector.replace('&', '*');
	return `*{--${id}-0:initial;--${id}-1: ;} ${s}{--${id}-0: ;--${id}-1:initial;}`;
}

/**
 * Get the stylesheet required for defining given block ( @media, @supports, etc query )
 */
function getBlockStylesheet(block: string, id: string) {
	return `*{--${id}-0:initial;--${id}-1: ;} ${block}{*{--${id}-0: ;--${id}-1:initial;}}`;
}

/**
 * Get the CSS Property for given `on`, `varId` and `off` values
 * @returns
 */
function getPropertyValue(varId: string, on: string, off?: string) {
	return `var(--${varId}-1,${on}) var(--${varId}-0,${off || 'revert-layer'})`;
}

// maps the condition name to generated css variable id
const conditionIdMap: Map<string, string> = new Map();

// Public ---------------------------------------------------------------------

/**
 * Define configuration for the Pompom CSS
 */
export function defineConfig<C extends Conditions, P extends Properties>(
	options: ConfigOptions<C, P>
) {
	const stylesheet: string[] = [];
	const cssVarPrefix = options.cssVariablePrefix || 'p';

	let idx = 0;
	const getId = (name: string) => {
		idx++;
		const id = cssVarPrefix + idx;
		conditionIdMap.set(name, id);
		return id;
	};

	const { conditions, properties } = options;

	if (conditions) {
		for (const name in conditions) {
			const value = conditions[name];
			if (!value) {
				continue;
			}

			if (value.startsWith('@')) {
				stylesheet.push(getBlockStylesheet(value, getId(name)));
			} else {
				stylesheet.push(getSelectorStylesheet(value, getId(name)));
			}
		}
	}

	function style(styles: PomPomStyle<C, P>): CSSProps {
		function processStyles(_styles: PomPomStyle<C, P>) {
			const pStyles: CSSProps = {};

			// conditions to process after all base styles are processed
			const conditionsToProcess: { name: string; id: string; value: PomPomStyle<C, P> }[] = [];

			for (const _key in _styles) {
				const key = _key as string;
				const value = _styles[key];

				const id = conditionIdMap.get(key);

				// if the value is object
				if (id) {
					// ensure it is an object
					if (typeof value === 'object' && value !== null) {
						conditionsToProcess.push({
							name: key,
							id,
							value,
						});
					} else {
						console.warn(`${key} is defined as a condition and it must be passed on object`);
						console.log('Expected object, but received:', value);
					}
				} else {
					const fn = properties && properties[key];

					// if the property is a "special" defined property
					if (fn) {
						const returnVal = fn(value);
						// add all the values defined
						for (const k in returnVal) {
							// @ts-expect-error
							pStyles[k] = returnVal[k];
						}
					} else {
						// else, just assign the value to the finalStyles object
						// @ts-expect-error
						pStyles[key] = value;
					}
				}
			}

			conditionsToProcess.forEach(c => {
				const processedValue = processStyles(c.value);
				// get the base value
				for (const k in processedValue) {
					// @ts-expect-error
					pStyles[k] = getPropertyValue(
						c.id,
						// @ts-expect-error
						processedValue[k],
						// @ts-expect-error
						pStyles[k]
					);
				}
			});

			return pStyles;
		}

		return processStyles(styles);
	}

	return {
		stylesheet: stylesheet.join('\n'),
		style,
	};
}
