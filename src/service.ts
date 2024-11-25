/**
 * Imports from Crawlee and Node.js URL module
 */
import { PlaywrightCrawler, ProxyConfiguration } from "crawlee";
import { createPlaywrightRouter, Dataset } from "crawlee";
import { URL } from "url";

/**
 * Types for the configuration of the EcommerceCrawler
 */
export interface CrawlerConfig {
  /** Array of initial URLs to start the crawl from */
  startUrls: string[];
  // /** Array of regex patterns to identify listing pages */
  productListingUrlPatterns: string[];
  // /** Array of regex patterns to identify product cards */
  productCardSelectors: string[];
  /** Array of regex patterns to identify product pages */
  productUrlPatterns: string[];
  /** CSS selectors for pagination links */
  paginationSelectors: string[];
  /** CSS selectors for product links */
  productLinkSelectors: string[];
  /** Optional maximum number of pages to process */
  maxPages?: number;
}

/**
 * Helper function to check if a given URL matches any product URL pattern
 * @param {string} url - The URL to check
 * @param {string[]} patterns - Array of regex patterns
 * @returns {boolean} - True if the URL matches any pattern
 */
const isProductUrl = (url: string, patterns: string[]): boolean => {
  return patterns.some((pattern) => {
    const regex = new RegExp(pattern);
    return regex.test(url);
  });
};

const isListingUrl = (url: string, patterns: string[]): boolean => {
  return patterns.some((pattern) => {
    const regex = new RegExp(pattern);
    return regex.test(url);
  });
};

/**
 * Helper function to extract the domain name from a URL
 * @param {string} url - The URL to parse
 * @returns {string} - The domain name
 */
const getDomain = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (error) {
    return "";
  }
};

/**
 * Helper function to normalize URLs relative to a base URL
 * @param {string} url - The URL to normalize
 * @param {string} baseUrl - The base URL
 * @returns {string} - The normalized absolute URL
 */
const normalizeUrl = (url: string, baseUrl: string): string => {
  try {
    return new URL(url, baseUrl).href;
  } catch (error) {
    return "";
  }
};

/**
 * A class to manage e-commerce web scraping using Crawlee
 */
export class EcommerceCrawler {
  /** Configuration object for the crawler */
  private config: CrawlerConfig;
  /** Set to track processed URLs */
  private processedUrls: Set<string> = new Set();
  /** Counter to track the number of pages processed */
  private pageCount: number = 0;

  /**
   * Constructor to initialize the crawler
   * @param {CrawlerConfig} config - Configuration object
   */
  constructor(config: CrawlerConfig) {
    this.config = {
      maxPages: 1000, // Default maximum pages
      ...config,
    };
  }

  /**
   * Main function to run the crawler
   */
  async run() {
    const router = createPlaywrightRouter();

    /**
     * Default route handler for category or listing pages
     */
    router.addDefaultHandler(async ({ request, enqueueLinks, log }) => {
      const baseUrl = request.loadedUrl;
      if (!baseUrl) return;

      await enqueueLinks({
        transformRequestFunction: (req) => {
          const url = normalizeUrl(req.url, baseUrl);
          if (
            !this.processedUrls.has(url) &&
            isListingUrl(url, this.config.productListingUrlPatterns)
          ) {
            this.processedUrls.add(url);
            return req;
          }
          return false;
        },
        label: "detail",
      });
    });

    router.addHandler("detail", async ({ request, page, log }) => {
      try {
        log.info(`Processing URL: ${request.loadedUrl}`);

        // Extract product details
        const products = await page.evaluate(() => {
          const productCards = document.querySelectorAll(
            ".rilrtl-products-list__item"
          );
          return Array.from(productCards).map((card) => {
            const linkElement = card.querySelector("a[href]");
            return {
              link: linkElement?.href || null,
            };
          });
        });

        log.info(
          `Extracted ${products.length} products: ${JSON.stringify(
            products,
            null,
            2
          )}`
        );
      } catch (error) {
        log.error(
          `Error while processing URL ${request.loadedUrl}: ${error.message}`
        );
      }
    });

    // Create and configure the CheerioCrawler
    const crawler = new PlaywrightCrawler({
      requestHandler: router,
      maxRequestsPerCrawl: this.config.maxPages! * 2, // Account for product & category pages
      maxConcurrency: 10,
      //requestHandlerTimeoutSecs: 30,
      //navigationTimeoutSecs: 30,
    });

    // Start the crawl
    await crawler.run(this.config.startUrls);

    // Open the dataset for further processing
    return Dataset.open();
  }
}
