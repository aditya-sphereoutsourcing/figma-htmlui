interface ParsedElement {
    tag: string;
    children: ParsedElement[];
    attributes: { [key: string]: string };
    style: { [key: string]: string };
    textContent?: string;
    imageData?: {
        src: string;
        width?: number;
        height?: number;
        alt?: string;
    };
    svgData?: {
        path: string;
        width?: number;
        height?: number;
        viewBox?: string;
    };
}

export class HTMLParser {
    private domParser: DOMParser;

    constructor() {
        this.domParser = new DOMParser();
    }

    async parseHTML(html: string): Promise<ParsedElement> {
        const doc = this.domParser.parseFromString(html, 'text/html');
        return this.parseElement(doc.body);
    }

    private async parseElement(element: Element): Promise<ParsedElement> {
        const parsed: ParsedElement = {
            tag: element.tagName.toLowerCase(),
            children: [],
            attributes: {},
            style: {},
        };

        // Parse attributes
        Array.from(element.attributes).forEach(attr => {
            if (attr.name === 'style') {
                parsed.style = this.parseInlineStyles(attr.value);
            } else {
                parsed.attributes[attr.name] = attr.value;
            }
        });

        // Handle images
        if (element.tagName.toLowerCase() === 'img') {
            parsed.imageData = {
                src: element.getAttribute('src') || '',
                width: element.getAttribute('width') ? parseInt(element.getAttribute('width')!) : undefined,
                height: element.getAttribute('height') ? parseInt(element.getAttribute('height')!) : undefined,
                alt: element.getAttribute('alt') || undefined
            };
        }

        // Handle SVG elements
        if (element.tagName.toLowerCase() === 'svg') {
            parsed.svgData = {
                path: element.outerHTML,
                width: element.getAttribute('width') ? parseInt(element.getAttribute('width')!) : undefined,
                height: element.getAttribute('height') ? parseInt(element.getAttribute('height')!) : undefined,
                viewBox: element.getAttribute('viewBox') || undefined
            };
        }

        // Parse computed styles
        const computedStyle = window.getComputedStyle(element);
        Object.keys(computedStyle).forEach(key => {
            if (typeof key === 'string' && computedStyle[key]) {
                parsed.style[key] = computedStyle[key];
            }
        });

        // Parse children
        for (const child of Array.from(element.children)) {
            parsed.children.push(await this.parseElement(child));
        }

        // Handle text content
        if (element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
            const content = element.textContent;
            parsed.textContent = content ? content.trim() : '';
        }

        return parsed;
    }

    private parseInlineStyles(styleString: string): { [key: string]: string } {
        const styles: { [key: string]: string } = {};
        styleString.split(';').forEach(style => {
            const [property, value] = style.split(':').map(s => s.trim());
            if (property && value) {
                styles[property] = value;
            }
        });
        return styles;
    }
}