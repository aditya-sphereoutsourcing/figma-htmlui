/// <reference types="@figma/plugin-typings" />

import { HTMLParser } from './src/parsers/htmlParser';
import { CSSParser } from './src/parsers/cssParser';
import { FigmaUtils } from './src/utils/figmaUtils';
import { StyleConverter } from './src/utils/styleConverter';

figma.showUI(__html__, { width: 400, height: 300 });

figma.ui.onmessage = async (msg) => {
    if (msg.type === 'convert-website') {
        try {
            console.log('Starting website conversion:', msg.url);
            figma.ui.postMessage({ type: 'status', message: 'Starting conversion...' });

            // Create main frame for the website
            const mainFrame = figma.createFrame();
            mainFrame.name = 'Website Convert';
            mainFrame.resize(1440, 900);
            mainFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

            // Fetch website content with CORS handling
            console.log('Fetching website content...');
            figma.ui.postMessage({ type: 'status', message: 'Fetching website content...' });

            try {
                const response = await fetch(msg.url, {
                    mode: 'cors',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
                }

                const html = await response.text();

                // Parse HTML and CSS
                console.log('Parsing HTML and CSS...');
                figma.ui.postMessage({ type: 'status', message: 'Parsing HTML and CSS...' });

                const htmlParser = new HTMLParser();
                const cssParser = new CSSParser();

                const parsedHTML = await htmlParser.parseHTML(html);
                console.log('HTML parsing complete, structure:', parsedHTML);

                // Convert and create Figma nodes
                console.log('Starting conversion to Figma nodes...');
                figma.ui.postMessage({ type: 'status', message: 'Converting to Figma nodes...' });

                await convertElementToFigma(parsedHTML, mainFrame);

                figma.viewport.scrollAndZoomIntoView([mainFrame]);
                console.log('Conversion complete!');

                figma.ui.postMessage({ 
                    type: 'status', 
                    message: 'Conversion completed successfully!' 
                });
                figma.ui.postMessage({ type: 'conversion-complete' });
            } catch (fetchError) {
                console.error('Fetch error:', fetchError);
                throw new Error('Unable to access the website. Please ensure the URL is accessible and supports CORS.');
            }
        } catch (error) {
            console.error('Conversion error:', error);
            figma.ui.postMessage({ 
                type: 'error',
                message: 'Failed to convert website: ' + (error instanceof Error ? error.message : String(error))
            });
        }
    }
};

async function convertElementToFigma(element: any, parent: FrameNode | GroupNode) {
    try {
        console.log('Converting element:', {
            tag: element.tag,
            hasImage: !!element.imageData,
            hasSVG: !!element.svgData,
            hasText: !!element.textContent,
            styles: element.style
        });

        const figmaStyles = StyleConverter.cssToFigma(element.style);
        console.log('Converted styles:', figmaStyles);

        let node: SceneNode;

        if (element.svgData) {
            console.log('Processing SVG element:', element.svgData);
            try {
                node = await FigmaUtils.createNode({
                    type: 'SVG',
                    svgString: element.svgData.path,
                    width: element.svgData.width,
                    height: element.svgData.height,
                    styles: figmaStyles
                });
            } catch (svgError) {
                console.error('SVG conversion error:', svgError);
                figma.ui.postMessage({ 
                    type: 'status', 
                    message: `Warning: Could not convert SVG element, falling back to frame: ${svgError.message}`
                });
                node = await FigmaUtils.createNode({
                    type: 'FRAME',
                    styles: figmaStyles
                });
            }
        } else if (element.imageData) {
            console.log('Processing image element:', element.imageData);
            try {
                node = await FigmaUtils.createNode({
                    type: 'IMAGE',
                    imageUrl: element.imageData.src,
                    width: element.imageData.width || 200,
                    height: element.imageData.height || 200,
                    styles: figmaStyles
                });
            } catch (imageError) {
                console.error('Image conversion error:', imageError);
                figma.ui.postMessage({ 
                    type: 'status', 
                    message: `Warning: Could not load image, falling back to placeholder: ${imageError.message}`
                });
                node = await FigmaUtils.createNode({
                    type: 'RECTANGLE',
                    width: element.imageData.width || 200,
                    height: element.imageData.height || 200,
                    styles: { ...figmaStyles, fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }] }
                });
            }
        } else if (element.textContent) {
            console.log('Processing text element:', element.textContent);
            node = await FigmaUtils.createTextNode(element.textContent, figmaStyles);
        } else {
            console.log('Processing container element');
            node = await FigmaUtils.createNode({
                type: 'FRAME',
                styles: figmaStyles
            });
        }

        // Set name based on element tag and class
        node.name = element.tag + (element.attributes.class ? `.${element.attributes.class}` : '');

        // Add to parent
        if ('appendChild' in parent) {
            parent.appendChild(node);
        }

        // Process children
        if (element.children && element.children.length > 0) {
            console.log(`Processing ${element.children.length} children of`, element.tag);
            for (const child of element.children) {
                if (node.type === 'FRAME' || node.type === 'GROUP') {
                    await convertElementToFigma(child, node);
                }
            }
        }

        // Apply auto-layout if needed
        if (node.type === 'FRAME') {
            if (element.style.display === 'flex') {
                console.log('Applying flex layout:', {
                    direction: element.style.flexDirection,
                    tag: element.tag
                });
                node.layoutMode = 'HORIZONTAL';
                node.primaryAxisSizingMode = 'AUTO';
                node.counterAxisSizingMode = 'AUTO';

                // Handle flex direction
                if (element.style.flexDirection === 'column') {
                    node.layoutMode = 'VERTICAL';
                }
            }
        }

    } catch (error) {
        console.error('Error converting element:', element.tag, error);
        figma.ui.postMessage({ 
            type: 'status', 
            message: `Error converting ${element.tag}: ${error instanceof Error ? error.message : String(error)}`
        });
    }
}