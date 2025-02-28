export class StyleConverter {
    static cssToFigma(cssStyles: { [key: string]: string }): any {
        const figmaStyles: any = {};

        // Convert layout properties
        if (cssStyles.width) {
            figmaStyles.width = this.parseUnitValue(cssStyles.width);
        }
        if (cssStyles.height) {
            figmaStyles.height = this.parseUnitValue(cssStyles.height);
        }

        // Convert colors and fills
        if (cssStyles.backgroundColor) {
            figmaStyles.fills = [{
                type: 'SOLID',
                color: this.parseColor(cssStyles.backgroundColor)
            }];
        }

        // Handle gradients
        if (cssStyles.backgroundImage && cssStyles.backgroundImage.includes('gradient')) {
            figmaStyles.fills = [this.parseGradient(cssStyles.backgroundImage)];
        }

        // Convert borders
        if (cssStyles.border) {
            const borderProps = cssStyles.border.split(' ');
            figmaStyles.strokes = [{
                type: 'SOLID',
                color: this.parseColor(borderProps[2]),
                width: this.parseUnitValue(borderProps[0])
            }];
        }

        // Handle box shadow
        if (cssStyles.boxShadow) {
            figmaStyles.effects = [this.parseBoxShadow(cssStyles.boxShadow)];
        }

        // Convert text properties
        if (cssStyles.fontFamily) {
            figmaStyles.fontName = {
                family: cssStyles.fontFamily.replace(/['"]/g, ''),
                style: cssStyles.fontWeight === '700' ? 'Bold' : 'Regular'
            };
        }

        if (cssStyles.fontSize) {
            figmaStyles.fontSize = this.parseUnitValue(cssStyles.fontSize);
        }

        // Handle text alignment
        if (cssStyles.textAlign) {
            figmaStyles.textAlignHorizontal = cssStyles.textAlign.toUpperCase();
        }

        // Handle letter spacing
        if (cssStyles.letterSpacing) {
            figmaStyles.letterSpacing = this.parseUnitValue(cssStyles.letterSpacing);
        }

        // Handle line height
        if (cssStyles.lineHeight) {
            figmaStyles.lineHeight = {
                value: this.parseUnitValue(cssStyles.lineHeight),
                unit: 'PIXELS'
            };
        }

        return figmaStyles;
    }

    private static parseUnitValue(value: string): number {
        const num = parseFloat(value);
        if (value.includes('px')) {
            return num;
        } else if (value.includes('rem')) {
            return num * 16; // Assuming 1rem = 16px
        } else if (value.includes('em')) {
            return num * 16; // Simplified em conversion
        }
        return num;
    }

    private static parseColor(color: string): { r: number, g: number, b: number, a?: number } {
        // Handle hex colors
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            return {
                r: parseInt(hex.substr(0, 2), 16) / 255,
                g: parseInt(hex.substr(2, 2), 16) / 255,
                b: parseInt(hex.substr(4, 2), 16) / 255
            };
        }

        // Handle rgba colors
        if (color.startsWith('rgba')) {
            const rgba = color.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 1];
            return {
                r: rgba[0] / 255,
                g: rgba[1] / 255,
                b: rgba[2] / 255,
                a: rgba[3]
            };
        }

        // Handle rgb colors
        const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
        return {
            r: rgb[0] / 255,
            g: rgb[1] / 255,
            b: rgb[2] / 255
        };
    }

    private static parseGradient(gradient: string): any {
        // Example: "linear-gradient(45deg, #ff0000 0%, #00ff00 100%)"
        if (gradient.includes('linear-gradient')) {
            const matches = gradient.match(/linear-gradient\((.*?)\)/);
            if (!matches) return null;

            const parts = matches[1].split(',');
            const angle = parts[0].includes('deg') ? 
                parseInt(parts[0]) :
                0;

            const stops = parts.slice(1).map(stop => {
                const [color, position] = stop.trim().split(' ');
                return {
                    position: parseInt(position) / 100,
                    color: this.parseColor(color)
                };
            });

            return {
                type: 'GRADIENT_LINEAR',
                gradientTransform: [[Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180), 0]],
                gradientStops: stops
            };
        }
        return null;
    }

    private static parseBoxShadow(shadow: string): any {
        // Example: "0px 4px 8px rgba(0, 0, 0, 0.1)"
        const parts = shadow.match(/(-?\d+px)\s+(-?\d+px)\s+(-?\d+px)\s+(rgba?\(.*?\))/);
        if (!parts) return null;

        const [_, offsetX, offsetY, blur, color] = parts;

        return {
            type: 'DROP_SHADOW',
            color: this.parseColor(color),
            offset: {
                x: this.parseUnitValue(offsetX),
                y: this.parseUnitValue(offsetY)
            },
            radius: this.parseUnitValue(blur),
            visible: true,
            blendMode: 'NORMAL'
        };
    }
}