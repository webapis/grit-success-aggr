// Basic usage


import { identifyProductContainer,testProductContainer } from "./identifyProductContainer.js";
const result = identifyProductContainer(testProductContainer());
console.log(result);
// Output: { tagName: "DIV", className: "product-item", selector: ".product-item", count: 12, confidence: 0.85 }
