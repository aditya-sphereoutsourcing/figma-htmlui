"use strict";
(() => {
  // src/parsers/htmlParser.ts
  var HTMLParser = class {
    constructor() {
      this.domParser = new DOMParser();
    }
    async parseHTML(html) {
      const doc = this.domParser.parseFromString(html, "text/html");
      return this.parseElement(doc.body);
    }
    async parseElement(element) {
      const parsed = {
        tag: element.tagName.toLowerCase(),
        children: [],
        attributes: {},
        style: {}
      };
      Array.from(element.attributes).forEach((attr) => {
        if (attr.name === "style") {
          parsed.style = this.parseInlineStyles(attr.value);
        } else {
          parsed.attributes[attr.name] = attr.value;
        }
      });
      if (element.tagName.toLowerCase() === "img") {
        parsed.imageData = {
          src: element.getAttribute("src") || "",
          width: element.getAttribute("width") ? parseInt(element.getAttribute("width")) : void 0,
          height: element.getAttribute("height") ? parseInt(element.getAttribute("height")) : void 0,
          alt: element.getAttribute("alt") || void 0
        };
      }
      if (element.tagName.toLowerCase() === "svg") {
        parsed.svgData = {
          path: element.outerHTML,
          width: element.getAttribute("width") ? parseInt(element.getAttribute("width")) : void 0,
          height: element.getAttribute("height") ? parseInt(element.getAttribute("height")) : void 0,
          viewBox: element.getAttribute("viewBox") || void 0
        };
      }
      const computedStyle = window.getComputedStyle(element);
      Object.keys(computedStyle).forEach((key) => {
        if (typeof key === "string" && computedStyle[key]) {
          parsed.style[key] = computedStyle[key];
        }
      });
      for (const child of Array.from(element.children)) {
        parsed.children.push(await this.parseElement(child));
      }
      if (element.childNodes.length === 1 && element.childNodes[0].nodeType === 3) {
        const content = element.textContent;
        parsed.textContent = content ? content.trim() : "";
      }
      return parsed;
    }
    parseInlineStyles(styleString) {
      const styles = {};
      styleString.split(";").forEach((style) => {
        const [property, value] = style.split(":").map((s) => s.trim());
        if (property && value) {
          styles[property] = value;
        }
      });
      return styles;
    }
  };

  // src/parsers/cssParser.ts
  var CSSParser = class {
    parseCSSRules(styleSheets) {
      const styleMap = /* @__PURE__ */ new Map();
      Array.from(styleSheets).forEach((sheet) => {
        try {
          if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
            console.log("Skipping external stylesheet:", sheet.href);
            return;
          }
          Array.from(sheet.cssRules).forEach((rule) => {
            if (rule instanceof CSSStyleRule) {
              const selector = rule.selectorText;
              const styles = this.parseStyleDeclaration(rule.style);
              console.log("Parsed styles for selector:", selector, styles);
              styleMap.set(selector, styles);
            } else if (rule instanceof CSSMediaRule) {
              console.log("Processing media query:", rule.conditionText);
              Array.from(rule.cssRules).forEach((mediaRule) => {
                if (mediaRule instanceof CSSStyleRule) {
                  const selector = mediaRule.selectorText;
                  const styles = this.parseStyleDeclaration(mediaRule.style);
                  styleMap.set(`${rule.conditionText} ${selector}`, styles);
                }
              });
            }
          });
        } catch (e) {
          console.error("Error parsing stylesheet:", e);
          if (e instanceof Error) {
            console.error("Error details:", e.message, e.stack);
          }
        }
      });
      return styleMap;
    }
    parseStyleDeclaration(style) {
      const properties = {};
      try {
        Array.from(style).forEach((property) => {
          const value = style.getPropertyValue(property).trim();
          if (value) {
            properties[property] = value;
            if (property === "background") {
              this.parseBackgroundShorthand(value, properties);
            } else if (property === "border") {
              this.parseBorderShorthand(value, properties);
            } else if (property === "font") {
              this.parseFontShorthand(value, properties);
            }
          }
        });
        if (style.backgroundImage && style.backgroundImage !== "none") {
          properties.backgroundImage = style.backgroundImage;
        }
        if (style.boxShadow && style.boxShadow !== "none") {
          properties.boxShadow = style.boxShadow;
        }
      } catch (e) {
        console.error("Error parsing style declaration:", e);
        if (e instanceof Error) {
          console.error("Error details:", e.message, e.stack);
        }
      }
      return properties;
    }
    parseBackgroundShorthand(value, properties) {
      const parts = value.split(" ");
      parts.forEach((part) => {
        if (part.startsWith("#") || part.startsWith("rgb") || part.includes("color")) {
          properties.backgroundColor = part;
        } else if (part.includes("url")) {
          properties.backgroundImage = part;
        }
      });
    }
    parseBorderShorthand(value, properties) {
      const parts = value.split(" ");
      if (parts.length >= 3) {
        properties.borderWidth = parts[0];
        properties.borderStyle = parts[1];
        properties.borderColor = parts[2];
      }
    }
    parseFontShorthand(value, properties) {
      const parts = value.split(" ");
      parts.forEach((part) => {
        if (part.includes("px") || part.includes("em") || part.includes("rem")) {
          properties.fontSize = part;
        } else if (!part.includes("/")) {
          properties.fontFamily = part;
        }
      });
    }
    convertToFigmaStyle(cssProperties) {
      const figmaStyle = {};
      if (cssProperties["background-color"]) {
        figmaStyle.fills = [{ type: "SOLID", color: this.parseColor(cssProperties["background-color"]) }];
      }
      if (cssProperties["border"]) {
        const [width, style, color] = cssProperties["border"].split(" ");
        figmaStyle.strokes = [{
          type: "SOLID",
          color: this.parseColor(color),
          width: parseFloat(width)
        }];
      }
      if (cssProperties["font-family"]) {
        figmaStyle.fontName = { family: cssProperties["font-family"].replace(/['"]/g, "") };
      }
      if (cssProperties["font-size"]) {
        figmaStyle.fontSize = parseFloat(cssProperties["font-size"]);
      }
      return figmaStyle;
    }
    parseColor(color) {
      const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
      return {
        r: rgb[0] / 255,
        g: rgb[1] / 255,
        b: rgb[2] / 255
      };
    }
  };

  // src/utils/figmaUtils.ts
  var FigmaUtils = class {
    static async createNode(props) {
      let node;
      switch (props.type) {
        case "FRAME":
          node = figma.createFrame();
          break;
        case "TEXT":
          node = figma.createText();
          break;
        case "RECTANGLE":
          node = figma.createRectangle();
          break;
        case "IMAGE":
          try {
            const response = await fetch(props.imageUrl);
            const arrayBuffer = await response.arrayBuffer();
            const imageHash = await figma.createImage(new Uint8Array(arrayBuffer)).hash;
            const rect = figma.createRectangle();
            rect.fills = [{
              type: "IMAGE",
              scaleMode: "FILL",
              imageHash
            }];
            node = rect;
          } catch (error) {
            console.error("Error creating image:", error);
            node = figma.createRectangle();
          }
          break;
        case "SVG":
          try {
            if (props.svgString) {
              const vector = figma.createNodeFromSvg(props.svgString);
              node = vector;
            } else {
              throw new Error("SVG string is required for SVG type");
            }
          } catch (error) {
            console.error("Error creating SVG:", error);
            node = figma.createFrame();
          }
          break;
        default:
          throw new Error(`Unsupported node type: ${props.type}`);
      }
      if (props.x !== void 0) node.x = props.x;
      if (props.y !== void 0) node.y = props.y;
      if (props.width !== void 0 && props.height !== void 0) {
        if ("resize" in node) {
          node.resize(props.width, props.height);
        }
      }
      if (props.styles) {
        await this.applyStyles(node, props.styles);
      }
      return node;
    }
    static async applyStyles(node, styles) {
      if (styles.fills && this.canHaveFills(node)) {
        node.fills = styles.fills;
      }
      if (styles.strokes && this.canHaveStrokes(node)) {
        node.strokes = styles.strokes;
      }
      if (styles.effects && "effects" in node) {
        node.effects = styles.effects;
      }
      if (node.type === "TEXT") {
        if (styles.fontName) {
          try {
            await figma.loadFontAsync(styles.fontName);
            node.fontName = styles.fontName;
          } catch (e) {
            console.error("Error loading font:", e);
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
    static async createTextNode(text, styles = {}) {
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
    static canHaveFills(node) {
      return ["RECTANGLE", "FRAME", "ELLIPSE", "POLYGON", "STAR", "LINE", "VECTOR"].includes(node.type);
    }
    static canHaveStrokes(node) {
      return ["RECTANGLE", "FRAME", "ELLIPSE", "POLYGON", "STAR", "LINE", "VECTOR"].includes(node.type);
    }
  };

  // src/utils/styleConverter.ts
  var StyleConverter = class {
    static cssToFigma(cssStyles) {
      const figmaStyles = {};
      if (cssStyles.width) {
        figmaStyles.width = this.parseUnitValue(cssStyles.width);
      }
      if (cssStyles.height) {
        figmaStyles.height = this.parseUnitValue(cssStyles.height);
      }
      if (cssStyles.backgroundColor) {
        figmaStyles.fills = [{
          type: "SOLID",
          color: this.parseColor(cssStyles.backgroundColor)
        }];
      }
      if (cssStyles.backgroundImage && cssStyles.backgroundImage.includes("gradient")) {
        figmaStyles.fills = [this.parseGradient(cssStyles.backgroundImage)];
      }
      if (cssStyles.border) {
        const borderProps = cssStyles.border.split(" ");
        figmaStyles.strokes = [{
          type: "SOLID",
          color: this.parseColor(borderProps[2]),
          width: this.parseUnitValue(borderProps[0])
        }];
      }
      if (cssStyles.boxShadow) {
        figmaStyles.effects = [this.parseBoxShadow(cssStyles.boxShadow)];
      }
      if (cssStyles.fontFamily) {
        figmaStyles.fontName = {
          family: cssStyles.fontFamily.replace(/['"]/g, ""),
          style: cssStyles.fontWeight === "700" ? "Bold" : "Regular"
        };
      }
      if (cssStyles.fontSize) {
        figmaStyles.fontSize = this.parseUnitValue(cssStyles.fontSize);
      }
      if (cssStyles.textAlign) {
        figmaStyles.textAlignHorizontal = cssStyles.textAlign.toUpperCase();
      }
      if (cssStyles.letterSpacing) {
        figmaStyles.letterSpacing = this.parseUnitValue(cssStyles.letterSpacing);
      }
      if (cssStyles.lineHeight) {
        figmaStyles.lineHeight = {
          value: this.parseUnitValue(cssStyles.lineHeight),
          unit: "PIXELS"
        };
      }
      return figmaStyles;
    }
    static parseUnitValue(value) {
      const num = parseFloat(value);
      if (value.includes("px")) {
        return num;
      } else if (value.includes("rem")) {
        return num * 16;
      } else if (value.includes("em")) {
        return num * 16;
      }
      return num;
    }
    static parseColor(color) {
      if (color.startsWith("#")) {
        const hex = color.replace("#", "");
        return {
          r: parseInt(hex.substr(0, 2), 16) / 255,
          g: parseInt(hex.substr(2, 2), 16) / 255,
          b: parseInt(hex.substr(4, 2), 16) / 255
        };
      }
      if (color.startsWith("rgba")) {
        const rgba = color.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 1];
        return {
          r: rgba[0] / 255,
          g: rgba[1] / 255,
          b: rgba[2] / 255,
          a: rgba[3]
        };
      }
      const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
      return {
        r: rgb[0] / 255,
        g: rgb[1] / 255,
        b: rgb[2] / 255
      };
    }
    static parseGradient(gradient) {
      if (gradient.includes("linear-gradient")) {
        const matches = gradient.match(/linear-gradient\((.*?)\)/);
        if (!matches) return null;
        const parts = matches[1].split(",");
        const angle = parts[0].includes("deg") ? parseInt(parts[0]) : 0;
        const stops = parts.slice(1).map((stop) => {
          const [color, position] = stop.trim().split(" ");
          return {
            position: parseInt(position) / 100,
            color: this.parseColor(color)
          };
        });
        return {
          type: "GRADIENT_LINEAR",
          gradientTransform: [[Math.cos(angle * Math.PI / 180), Math.sin(angle * Math.PI / 180), 0]],
          gradientStops: stops
        };
      }
      return null;
    }
    static parseBoxShadow(shadow) {
      const parts = shadow.match(/(-?\d+px)\s+(-?\d+px)\s+(-?\d+px)\s+(rgba?\(.*?\))/);
      if (!parts) return null;
      const [_, offsetX, offsetY, blur, color] = parts;
      return {
        type: "DROP_SHADOW",
        color: this.parseColor(color),
        offset: {
          x: this.parseUnitValue(offsetX),
          y: this.parseUnitValue(offsetY)
        },
        radius: this.parseUnitValue(blur),
        visible: true,
        blendMode: "NORMAL"
      };
    }
  };

  // code.ts
  figma.showUI(__html__, { width: 400, height: 300 });
  figma.ui.onmessage = async (msg) => {
    if (msg.type === "convert-website") {
      try {
        console.log("Starting website conversion:", msg.url);
        figma.ui.postMessage({ type: "status", message: "Starting conversion..." });
        const mainFrame = figma.createFrame();
        mainFrame.name = "Website Convert";
        mainFrame.resize(1440, 900);
        mainFrame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
        console.log("Fetching website content...");
        figma.ui.postMessage({ type: "status", message: "Fetching website content..." });
        try {
          const response = await fetch(msg.url, {
            mode: "cors",
            headers: {
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5"
            }
          });
          if (!response.ok) {
            throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
          }
          const html = await response.text();
          console.log("Parsing HTML and CSS...");
          figma.ui.postMessage({ type: "status", message: "Parsing HTML and CSS..." });
          const htmlParser = new HTMLParser();
          const cssParser = new CSSParser();
          const parsedHTML = await htmlParser.parseHTML(html);
          console.log("HTML parsing complete, structure:", parsedHTML);
          console.log("Starting conversion to Figma nodes...");
          figma.ui.postMessage({ type: "status", message: "Converting to Figma nodes..." });
          await convertElementToFigma(parsedHTML, mainFrame);
          figma.viewport.scrollAndZoomIntoView([mainFrame]);
          console.log("Conversion complete!");
          figma.ui.postMessage({
            type: "status",
            message: "Conversion completed successfully!"
          });
          figma.ui.postMessage({ type: "conversion-complete" });
        } catch (fetchError) {
          console.error("Fetch error:", fetchError);
          throw new Error("Unable to access the website. Please ensure the URL is accessible and supports CORS.");
        }
      } catch (error) {
        console.error("Conversion error:", error);
        figma.ui.postMessage({
          type: "error",
          message: "Failed to convert website: " + (error instanceof Error ? error.message : String(error))
        });
      }
    }
  };
  async function convertElementToFigma(element, parent) {
    try {
      console.log("Converting element:", {
        tag: element.tag,
        hasImage: !!element.imageData,
        hasSVG: !!element.svgData,
        hasText: !!element.textContent,
        styles: element.style
      });
      const figmaStyles = StyleConverter.cssToFigma(element.style);
      console.log("Converted styles:", figmaStyles);
      let node;
      if (element.svgData) {
        console.log("Processing SVG element:", element.svgData);
        try {
          node = await FigmaUtils.createNode({
            type: "SVG",
            svgString: element.svgData.path,
            width: element.svgData.width,
            height: element.svgData.height,
            styles: figmaStyles
          });
        } catch (svgError) {
          console.error("SVG conversion error:", svgError);
          figma.ui.postMessage({
            type: "status",
            message: `Warning: Could not convert SVG element, falling back to frame: ${svgError.message}`
          });
          node = await FigmaUtils.createNode({
            type: "FRAME",
            styles: figmaStyles
          });
        }
      } else if (element.imageData) {
        console.log("Processing image element:", element.imageData);
        try {
          node = await FigmaUtils.createNode({
            type: "IMAGE",
            imageUrl: element.imageData.src,
            width: element.imageData.width || 200,
            height: element.imageData.height || 200,
            styles: figmaStyles
          });
        } catch (imageError) {
          console.error("Image conversion error:", imageError);
          figma.ui.postMessage({
            type: "status",
            message: `Warning: Could not load image, falling back to placeholder: ${imageError.message}`
          });
          node = await FigmaUtils.createNode({
            type: "RECTANGLE",
            width: element.imageData.width || 200,
            height: element.imageData.height || 200,
            styles: { ...figmaStyles, fills: [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }] }
          });
        }
      } else if (element.textContent) {
        console.log("Processing text element:", element.textContent);
        node = await FigmaUtils.createTextNode(element.textContent, figmaStyles);
      } else {
        console.log("Processing container element");
        node = await FigmaUtils.createNode({
          type: "FRAME",
          styles: figmaStyles
        });
      }
      node.name = element.tag + (element.attributes.class ? `.${element.attributes.class}` : "");
      if ("appendChild" in parent) {
        parent.appendChild(node);
      }
      if (element.children && element.children.length > 0) {
        console.log(`Processing ${element.children.length} children of`, element.tag);
        for (const child of element.children) {
          if (node.type === "FRAME" || node.type === "GROUP") {
            await convertElementToFigma(child, node);
          }
        }
      }
      if (node.type === "FRAME") {
        if (element.style.display === "flex") {
          console.log("Applying flex layout:", {
            direction: element.style.flexDirection,
            tag: element.tag
          });
          node.layoutMode = "HORIZONTAL";
          node.primaryAxisSizingMode = "AUTO";
          node.counterAxisSizingMode = "AUTO";
          if (element.style.flexDirection === "column") {
            node.layoutMode = "VERTICAL";
          }
        }
      }
    } catch (error) {
      console.error("Error converting element:", element.tag, error);
      figma.ui.postMessage({
        type: "status",
        message: `Error converting ${element.tag}: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
})();
