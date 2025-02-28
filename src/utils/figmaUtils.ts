/// <reference types="@figma/plugin-typings" />

interface FigmaNodeCreationProps {
    type: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    styles?: any;
    imageUrl?: string;
    svgString?: string;
}

export class FigmaUtils {
    static async createNode(props: FigmaNodeCreationProps): Promise<SceneNode> {
        let node: SceneNode;

        switch (props.type) {
            case 'FRAME':
                node = figma.createFrame();
                break;
            case 'TEXT':
                node = figma.createText();
                break;
            case 'RECTANGLE':
                node = figma.createRectangle();
                break;
            case 'IMAGE':
                try {
                    // Fetch image data
                    const response = await fetch(props.imageUrl!);
                    const arrayBuffer = await response.arrayBuffer();
                    const imageHash = await figma.createImage(new Uint8Array(arrayBuffer)).hash;

                    // Create rectangle with image fill
                    const rect = figma.createRectangle();
                    rect.fills = [{
                        type: 'IMAGE',
                        scaleMode: 'FILL',
                        imageHash: imageHash
                    }];
                    node = rect;
                } catch (error) {
                    console.error('Error creating image:', error);
                    // Fallback to empty rectangle
                    node = figma.createRectangle();
                }
                break;
            case 'SVG':
                try {
                    // Create a vector node from SVG
                    if (props.svgString) {
                        const vector = figma.createNodeFromSvg(props.svgString);
                        // If SVG contains multiple paths, it returns a FRAME
                        // If it's a single path, it returns a VECTOR
                        node = vector;
                    } else {
                        throw new Error('SVG string is required for SVG type');
                    }
                } catch (error) {
                    console.error('Error creating SVG:', error);
                    // Fallback to empty frame
                    node = figma.createFrame();
                }
                break;
            default:
                throw new Error(`Unsupported node type: ${props.type}`);
        }

        // Position the node
        if (props.x !== undefined) node.x = props.x;
        if (props.y !== undefined) node.y = props.y;

        // Resize the node using the resize method instead of direct assignment
        if (props.width !== undefined && props.height !== undefined) {
            if ('resize' in node) {
                node.resize(props.width, props.height);
            }
        }

        if (props.styles) {
            await this.applyStyles(node, props.styles);
        }

        return node;
    }

    static async applyStyles(node: SceneNode, styles: any) {
        // Apply fills to shapes and frames
        if (styles.fills && this.canHaveFills(node)) {
            node.fills = styles.fills;
        }

        // Apply strokes to shapes and frames
        if (styles.strokes && this.canHaveStrokes(node)) {
            node.strokes = styles.strokes;
        }

        // Apply effects (shadows, etc)
        if (styles.effects && 'effects' in node) {
            node.effects = styles.effects;
        }

        // Apply text-specific styles
        if (node.type === 'TEXT') {
            if (styles.fontName) {
                try {
                    await figma.loadFontAsync(styles.fontName);
                    node.fontName = styles.fontName;
                } catch (e) {
                    console.error('Error loading font:', e);
                }
            }

            if (styles.fontSize) {
                node.fontSize = styles.fontSize;
            }

            if (styles.textAlignHorizontal) {
                node.textAlignHorizontal = styles.textAlignHorizontal;
            }

            if (styles.letterSpacing) {
                node.letterSpacing = styles.letterSpacing;
            }

            if (styles.lineHeight) {
                node.lineHeight = styles.lineHeight;
            }
        }
    }

    static async createTextNode(text: string, styles: any = {}): Promise<TextNode> {
        const textNode = figma.createText();

        if (styles.fontName) {
            await figma.loadFontAsync(styles.fontName);
        } else {
            await figma.loadFontAsync({ family: "Inter", style: "Regular" });
        }

        textNode.characters = text;
        await this.applyStyles(textNode, styles);

        return textNode;
    }

    private static canHaveFills(node: SceneNode): node is RectangleNode | FrameNode | EllipseNode | PolygonNode | StarNode | LineNode | VectorNode {
        return ['RECTANGLE', 'FRAME', 'ELLIPSE', 'POLYGON', 'STAR', 'LINE', 'VECTOR'].includes(node.type);
    }

    private static canHaveStrokes(node: SceneNode): node is RectangleNode | FrameNode | EllipseNode | PolygonNode | StarNode | LineNode | VectorNode {
        return ['RECTANGLE', 'FRAME', 'ELLIPSE', 'POLYGON', 'STAR', 'LINE', 'VECTOR'].includes(node.type);
    }
}