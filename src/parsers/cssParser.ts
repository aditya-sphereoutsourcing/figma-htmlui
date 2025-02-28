interface CSSProperties {
    [key: string]: string;
}

export class CSSParser {
    parseCSSRules(styleSheets: StyleSheetList): Map<string, CSSProperties> {
        const styleMap = new Map<string, CSSProperties>();

        Array.from(styleSheets).forEach(sheet => {
            try {
                if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
                    // Skip external stylesheets for now
                    console.log('Skipping external stylesheet:', sheet.href);
                    return;
                }

                Array.from(sheet.cssRules).forEach(rule => {
                    if (rule instanceof CSSStyleRule) {
                        const selector = rule.selectorText;
                        const styles = this.parseStyleDeclaration(rule.style);
                        console.log('Parsed styles for selector:', selector, styles);
                        styleMap.set(selector, styles);
                    } else if (rule instanceof CSSMediaRule) {
                        // Handle media queries
                        console.log('Processing media query:', rule.conditionText);
                        Array.from(rule.cssRules).forEach(mediaRule => {
                            if (mediaRule instanceof CSSStyleRule) {
                                const selector = mediaRule.selectorText;
                                const styles = this.parseStyleDeclaration(mediaRule.style);
                                styleMap.set(`${rule.conditionText} ${selector}`, styles);
                            }
                        });
                    }
                });
            } catch (e) {
                console.error('Error parsing stylesheet:', e);
                if (e instanceof Error) {
                    console.error('Error details:', e.message, e.stack);
                }
            }
        });

        return styleMap;
    }

    private parseStyleDeclaration(style: CSSStyleDeclaration): CSSProperties {
        const properties: CSSProperties = {};

        try {
            // Parse standard CSS properties
            Array.from(style).forEach(property => {
                const value = style.getPropertyValue(property).trim();
                if (value) {
                    properties[property] = value;

                    // Handle shorthand properties
                    if (property === 'background') {
                        this.parseBackgroundShorthand(value, properties);
                    } else if (property === 'border') {
                        this.parseBorderShorthand(value, properties);
                    } else if (property === 'font') {
                        this.parseFontShorthand(value, properties);
                    }
                }
            });

            // Parse computed styles for gradients and complex values
            if (style.backgroundImage && style.backgroundImage !== 'none') {
                properties.backgroundImage = style.backgroundImage;
            }

            // Parse box shadow
            if (style.boxShadow && style.boxShadow !== 'none') {
                properties.boxShadow = style.boxShadow;
            }

        } catch (e) {
            console.error('Error parsing style declaration:', e);
            if (e instanceof Error) {
                console.error('Error details:', e.message, e.stack);
            }
        }

        return properties;
    }

    private parseBackgroundShorthand(value: string, properties: CSSProperties): void {
        const parts = value.split(' ');
        parts.forEach(part => {
            if (part.startsWith('#') || part.startsWith('rgb') || part.includes('color')) {
                properties.backgroundColor = part;
            } else if (part.includes('url')) {
                properties.backgroundImage = part;
            }
        });
    }

    private parseBorderShorthand(value: string, properties: CSSProperties): void {
        const parts = value.split(' ');
        if (parts.length >= 3) {
            properties.borderWidth = parts[0];
            properties.borderStyle = parts[1];
            properties.borderColor = parts[2];
        }
    }

    private parseFontShorthand(value: string, properties: CSSProperties): void {
        const parts = value.split(' ');
        parts.forEach(part => {
            if (part.includes('px') || part.includes('em') || part.includes('rem')) {
                properties.fontSize = part;
            } else if (!part.includes('/')) {
                properties.fontFamily = part;
            }
        });
    }

    convertToFigmaStyle(cssProperties: CSSProperties): any {
        const figmaStyle: any = {};

        // Convert basic properties
        if (cssProperties['background-color']) {
            figmaStyle.fills = [{ type: 'SOLID', color: this.parseColor(cssProperties['background-color']) }];
        }

        if (cssProperties['border']) {
            const [width, style, color] = cssProperties['border'].split(' ');
            figmaStyle.strokes = [{
                type: 'SOLID',
                color: this.parseColor(color),
                width: parseFloat(width)
            }];
        }

        // Handle typography
        if (cssProperties['font-family']) {
            figmaStyle.fontName = { family: cssProperties['font-family'].replace(/['"]/g, '') };
        }

        if (cssProperties['font-size']) {
            figmaStyle.fontSize = parseFloat(cssProperties['font-size']);
        }

        return figmaStyle;
    }

    private parseColor(color: string): { r: number, g: number, b: number } {
        // Simple RGB color parser
        const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
        return {
            r: rgb[0] / 255,
            g: rgb[1] / 255,
            b: rgb[2] / 255
        };
    }
}