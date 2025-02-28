# Website to Figma Converter Plugin

A Figma plugin that converts websites into editable Figma designs. This plugin fetches website content and transforms HTML/CSS into Figma components while preserving styles, layout, and assets.

## 🔄 Backend Process Flow

1. **Initial Request Processing**
   ```typescript
   // code.ts
   figma.ui.onmessage = async (msg) => {
     if (msg.type === 'convert-website') {
       // Start conversion process
       const response = await fetch(msg.url);
       const html = await response.text();
     }
   }
   ```

2. **HTML Parsing**
   - Location: `src/parsers/htmlParser.ts`
   - Process:
     1. Creates DOM structure from HTML string
     2. Extracts element properties, styles, and attributes
     3. Handles special elements (images, SVGs)
     4. Builds element hierarchy
   ```typescript
   class HTMLParser {
     async parseHTML(html: string): Promise<ParsedElement> {
       const doc = this.domParser.parseFromString(html, 'text/html');
       return this.parseElement(doc.body);
     }
   }
   ```

3. **CSS Processing**
   - Location: `src/parsers/cssParser.ts`
   - Steps:
     1. Extracts CSS rules from stylesheets
     2. Computes final styles for each element
     3. Handles media queries and inheritance
     4. Resolves CSS shorthand properties
   ```typescript
   class CSSParser {
     parseCSSRules(styleSheets: StyleSheetList): Map<string, CSSProperties> {
       // Process each stylesheet
       Array.from(styleSheets).forEach(sheet => {
         Array.from(sheet.cssRules).forEach(rule => {
           // Extract and compute styles
         });
       });
     }
   }
   ```

4. **Style Conversion**
   - Location: `src/utils/styleConverter.ts`
   - Process:
     1. Converts CSS properties to Figma format
     2. Handles colors, gradients, and shadows
     3. Converts units (px, rem, em)
     4. Applies text styles and effects
   ```typescript
   class StyleConverter {
     static cssToFigma(cssStyles: { [key: string]: string }): any {
       // Convert colors, layouts, typography, etc.
     }
   }
   ```

5. **Figma Node Creation**
   - Location: `src/utils/figmaUtils.ts`
   - Steps:
     1. Creates appropriate node types
     2. Applies converted styles
     3. Handles images and SVGs
     4. Sets up auto-layout
   ```typescript
   class FigmaUtils {
     static async createNode(props: FigmaNodeCreationProps): Promise<SceneNode> {
       // Create and configure Figma nodes
     }
   }
   ```

## 🏗️ Project Structure

```
├── src/
│   ├── parsers/
│   │   ├── htmlParser.ts     # Parses HTML into structured data
│   │   └── cssParser.ts      # Handles CSS parsing and computation
│   └── utils/
│       ├── figmaUtils.ts     # Figma node creation utilities
│       └── styleConverter.ts # CSS to Figma style conversion
├── code.ts                   # Main plugin logic
├── ui.html                   # Plugin UI interface
└── manifest.json            # Plugin configuration
```

## 🔧 Core Components

1. **HTML Parser** (`src/parsers/htmlParser.ts`)
   - Converts HTML into a structured object format
   - Handles text content, images, and SVG elements
   - Preserves element attributes and inline styles

2. **CSS Parser** (`src/parsers/cssParser.ts`)
   - Parses CSS rules and computes styles
   - Handles various CSS properties and values
   - Supports media queries and style inheritance

3. **Style Converter** (`src/utils/styleConverter.ts`)
   - Converts CSS styles to Figma format
   - Handles colors, gradients, shadows, and typography
   - Manages unit conversions (px, rem, em)

4. **Figma Utilities** (`src/utils/figmaUtils.ts`)
   - Creates and configures Figma nodes
   - Handles different node types (frames, text, images)
   - Manages auto-layout and constraints

## 🔄 Conversion Process
1. **Website Content Fetching**
   ```typescript
   // code.ts
   const response = await fetch(url, {
     mode: 'cors',
     headers: {
       'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
       'Accept-Language': 'en-US,en;q=0.5',
     }
   });
   ```

2. **HTML Parsing**
   - Converts HTML string to DOM structure
   - Extracts element properties and styles
   - Creates a tree of parsed elements

3. **Style Processing**
   - Computes and inherits CSS styles
   - Converts units to Figma-compatible format
   - Handles complex properties (gradients, shadows)

4. **Figma Node Creation**
   - Creates appropriate node types based on elements
   - Applies converted styles
   - Sets up auto-layout for flex containers


## 🚀 Error Handling & Fallbacks

1. **Network Errors**
   ```typescript
   try {
     const response = await fetch(url);
   } catch (fetchError) {
     throw new Error('Unable to access the website. Check CORS and URL validity.');
   }
   ```

2. **Image Loading Fallbacks**
   ```typescript
   if (element.imageData) {
     try {
       node = await FigmaUtils.createNode({
         type: 'IMAGE',
         imageUrl: element.imageData.src
       });
     } catch (imageError) {
       // Fallback to placeholder rectangle
       node = await FigmaUtils.createNode({
         type: 'RECTANGLE',
         fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]
       });
     }
   }
   ```

3. **SVG Processing Fallbacks**
   ```typescript
   if (element.svgData) {
     try {
       node = await FigmaUtils.createNode({
         type: 'SVG',
         svgString: element.svgData.path
       });
     } catch (svgError) {
       // Fallback to frame
       node = await FigmaUtils.createNode({
         type: 'FRAME'
       });
     }
   }
   ```

## 🚀 Setup and Usage

1. **Install in Figma**
   - Go to Plugins → Development → Import plugin from manifest
   - Select the `manifest.json` file

2. **Using the Plugin**
   - Create a new Figma file
   - Right-click → Plugins → Development → Website to Figma
   - Enter a website URL (e.g., https://example.com)
   - Watch the status log for progress

## 🛠️ Implementation Details

### Element Type Handling

```typescript
// Different node types based on element
if (element.svgData) {
    // Create SVG node
    node = await FigmaUtils.createNode({
        type: 'SVG',
        svgString: element.svgData.path,
        // ...
    });
} else if (element.imageData) {
    // Create image node
    node = await FigmaUtils.createNode({
        type: 'IMAGE',
        imageUrl: element.imageData.src,
        // ...
    });
} else if (element.textContent) {
    // Create text node
    node = await FigmaUtils.createTextNode(element.textContent, styles);
}
```

### Style Conversion

```typescript
// Converting CSS to Figma styles
const figmaStyles = StyleConverter.cssToFigma({
    width: '200px',
    backgroundColor: '#ff0000',
    fontFamily: 'Arial',
    fontSize: '16px'
});
```

### Auto-layout Implementation

```typescript
// Handling flex containers
if (element.style.display === 'flex') {
    node.layoutMode = element.style.flexDirection === 'column' 
        ? 'VERTICAL' 
        : 'HORIZONTAL';
    node.primaryAxisSizingMode = 'AUTO';
    node.counterAxisSizingMode = 'AUTO';
}
```

## 📝 Testing & Verification

1. **Status Updates**
   ```typescript
   figma.ui.postMessage({ 
     type: 'status', 
     message: 'Converting website...' 
   });
   ```

2. **Console Logging**
   ```typescript
   console.log('Converting element:', {
     tag: element.tag,
     hasImage: !!element.imageData,
     hasSVG: !!element.svgData,
     hasText: !!element.textContent,
     styles: element.style
   });
   ```

## 🔨 Development Guidelines

1. **Adding New Features**
   - Create parser in `src/parsers/`
   - Add utility functions in `src/utils/`
   - Update main conversion logic in `code.ts`

2. **Testing Process**
   - Use sample URLs (e.g., https://example.com)
   - Monitor status log in plugin UI
   - Check console for detailed logs
   - Verify node creation in Figma canvas

## 🔜 Future Features

1. **Dynamic Website Support**
   - Integration with Playwright for dynamic content
   - JavaScript execution support
   - Form and interaction handling

2. **Advanced CSS Support**
   - Complex animations
   - Custom properties (CSS variables)
   - Advanced selectors

3. **Batch Processing**
   - Convert multiple pages simultaneously
   - Site crawling and structure preservation
   - Asset optimization

## 🐛 Debugging

- Check the plugin's status log for conversion progress
- Monitor the Figma console for detailed logs
- Verify network access in manifest.json configuration

## 📝 Notes

- The plugin requires proper CORS configuration on target websites
- Some complex CSS properties might have simplified implementations
- Performance depends on website complexity and asset count