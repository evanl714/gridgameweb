/**
 * HTMLSanitizer - Secure HTML sanitization utility
 * Provides safe methods for handling HTML content and preventing XSS attacks
 */
class HTMLSanitizer {
    constructor() {
        // Check if DOMPurify is available for complex HTML sanitization
        this.hasDOMPurify = typeof window !== 'undefined' && window.DOMPurify;
        
        // HTML entity map for escaping
        this.entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };
        
        // Reverse entity map for unescaping
        this.reverseEntityMap = {};
        Object.keys(this.entityMap).forEach(key => {
            this.reverseEntityMap[this.entityMap[key]] = key;
        });
        
        // Allowed HTML tags for basic sanitization (whitelist approach)
        this.allowedTags = new Set([
            'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'span', 'div',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'
        ]);
        
        // Allowed attributes (very restrictive)
        this.allowedAttributes = new Set([
            'class', 'id'
        ]);
    }
    
    /**
     * Escape text content to prevent XSS
     * Use this for plain text that should be displayed as-is
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text safe for innerHTML
     */
    escapeText(text) {
        if (typeof text !== 'string') {
            return '';
        }
        
        return text.replace(/[&<>"'`=\/]/g, (match) => {
            return this.entityMap[match];
        });
    }
    
    /**
     * Unescape HTML entities back to text
     * @param {string} html - HTML to unescape
     * @returns {string} - Unescaped text
     */
    unescapeText(html) {
        if (typeof html !== 'string') {
            return '';
        }
        
        return html.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&#x2F;|&#x60;|&#x3D;/g, (match) => {
            return this.reverseEntityMap[match] || match;
        });
    }
    
    /**
     * Sanitize HTML content using DOMPurify if available, fallback to basic sanitization
     * Use this for HTML content that needs to preserve some formatting
     * @param {string} html - HTML content to sanitize
     * @param {Object} options - Sanitization options
     * @returns {string} - Sanitized HTML
     */
    sanitize(html, options = {}) {
        if (typeof html !== 'string') {
            return '';
        }
        
        // If DOMPurify is available, use it for comprehensive sanitization
        if (this.hasDOMPurify) {
            const config = {
                ALLOWED_TAGS: options.allowedTags || Array.from(this.allowedTags),
                ALLOWED_ATTR: options.allowedAttributes || Array.from(this.allowedAttributes),
                KEEP_CONTENT: options.keepContent !== false,
                RETURN_DOM: false,
                RETURN_DOM_FRAGMENT: false,
                RETURN_DOM_IMPORT: false,
                SANITIZE_DOM: true,
                ...options.domPurifyConfig
            };
            
            try {
                return window.DOMPurify.sanitize(html, config);
            } catch (error) {
                console.error('DOMPurify sanitization failed:', error);
                // Fallback to basic sanitization
                return this._basicSanitize(html, options);
            }
        }
        
        // Fallback to basic sanitization
        return this._basicSanitize(html, options);
    }
    
    /**
     * Basic HTML sanitization without external dependencies
     * @param {string} html - HTML to sanitize
     * @param {Object} options - Sanitization options
     * @returns {string} - Sanitized HTML
     * @private
     */
    _basicSanitize(html, options = {}) {
        // Create a temporary DOM element to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Recursively clean the DOM tree
        this._cleanNode(tempDiv, options);
        
        return tempDiv.innerHTML;
    }
    
    /**
     * Recursively clean DOM nodes
     * @param {Node} node - Node to clean
     * @param {Object} options - Cleaning options
     * @private
     */
    _cleanNode(node, options) {
        const allowedTags = new Set(options.allowedTags || this.allowedTags);
        const allowedAttributes = new Set(options.allowedAttributes || this.allowedAttributes);
        
        // Get all child nodes before we start modifying
        const childNodes = Array.from(node.childNodes);
        
        childNodes.forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toLowerCase();
                
                // Remove disallowed tags
                if (!allowedTags.has(tagName)) {
                    if (options.keepContent !== false) {
                        // Move children to parent before removing the node
                        while (child.firstChild) {
                            node.insertBefore(child.firstChild, child);
                        }
                    }
                    node.removeChild(child);
                    return;
                }
                
                // Clean attributes
                const attributes = Array.from(child.attributes);
                attributes.forEach(attr => {
                    if (!allowedAttributes.has(attr.name.toLowerCase())) {
                        child.removeAttribute(attr.name);
                    }
                });
                
                // Recursively clean child nodes
                this._cleanNode(child, options);
            }
        });
    }
    
    /**
     * Create safe DOM elements without using innerHTML
     * @param {string} tagName - HTML tag name
     * @param {Object} attributes - Element attributes
     * @param {string|Node[]} content - Text content or child nodes
     * @returns {Element} - Created DOM element
     */
    createElement(tagName, attributes = {}, content = '') {
        // Validate tag name
        if (typeof tagName !== 'string' || !tagName.match(/^[a-zA-Z][a-zA-Z0-9]*$/)) {
            throw new Error('Invalid tag name provided');
        }
        
        const element = document.createElement(tagName);
        
        // Set attributes safely
        Object.keys(attributes).forEach(key => {
            if (this.allowedAttributes.has(key.toLowerCase())) {
                element.setAttribute(key, this.escapeText(String(attributes[key])));
            }
        });
        
        // Set content safely
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (Array.isArray(content)) {
            content.forEach(child => {
                if (child instanceof Node) {
                    element.appendChild(child);
                }
            });
        }
        
        return element;
    }
    
    /**
     * Safe way to set text content on an element
     * @param {Element} element - Target element
     * @param {string} text - Text content to set
     */
    setTextContent(element, text) {
        if (element && element.textContent !== undefined) {
            element.textContent = String(text || '');
        }
    }
    
    /**
     * Safe way to set HTML content on an element
     * @param {Element} element - Target element
     * @param {string} html - HTML content to set
     * @param {Object} options - Sanitization options
     */
    setHTMLContent(element, html, options = {}) {
        if (element) {
            const sanitizedHTML = this.sanitize(html, options);
            element.innerHTML = sanitizedHTML;
        }
    }
    
    /**
     * Validate and sanitize user input for specific contexts
     * @param {string} input - User input to validate
     * @param {string} context - Context type ('text', 'html', 'attribute')
     * @param {Object} options - Validation options
     * @returns {string} - Validated and sanitized input
     */
    validateInput(input, context = 'text', options = {}) {
        if (typeof input !== 'string') {
            return '';
        }
        
        // Trim whitespace
        input = input.trim();
        
        // Apply length limits
        if (options.maxLength && input.length > options.maxLength) {
            input = input.substring(0, options.maxLength);
        }
        
        switch (context) {
            case 'text':
                return this.escapeText(input);
            case 'html':
                return this.sanitize(input, options);
            case 'attribute':
                // Extra strict for attributes
                return this.escapeText(input).replace(/[^a-zA-Z0-9\-_\s]/g, '');
            default:
                return this.escapeText(input);
        }
    }
}

// Create singleton instance
const htmlSanitizer = new HTMLSanitizer();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HTMLSanitizer;
    module.exports.default = htmlSanitizer;
} else if (typeof define === 'function' && define.amd) {
    define([], () => HTMLSanitizer);
}

// Make available globally
if (typeof window !== 'undefined') {
    window.HTMLSanitizer = HTMLSanitizer;
    window.htmlSanitizer = htmlSanitizer;
}