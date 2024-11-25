import type { CrawlerConfig } from "./service.js";
import { EcommerceCrawler } from "./service.js";

async function main() {
  // Example configuration for an e-commerce site
  const config: CrawlerConfig = {
    startUrls: ["https://www.ajio.com/"],
    productListingUrlPatterns: [
      "^https://www.myntra.com/(?:[a-z0-9-]+)$",
      "^https://www.ajio.com/.*/c/[0-9]+$",
    ],
    productUrlPatterns: ["/buy/", "/p/", "/item/", "products?id="],
    productCardSelectors: [".product-base"],
    productLinkSelectors: [
      'a[href*="/product/"]',
      'a[href*="/p/"]',
      ".product-card a",
      ".product-link",
    ],
    paginationSelectors: [".pagination a", 'a[href*="page="]', ".next-page"],
    maxPages: 100,
  };

  const crawler = new EcommerceCrawler(config);
  const dataset = await crawler.run();
  console.log("Crawling completed. Results saved to:");
}

main();
