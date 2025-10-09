import countUnique from "./countUnique.js";
import countByField from "./countByField.js";
import getAggrTimeSpan from "./getAggrTimeSpan.js";
import findDuplicatesByLink from './findDuplicatesByLink.js';
import getUniquePageURLs from "./getUniquePageURLs.js";

/**
 * Calculates a comprehensive set of metrics from the scraped data.
 * @param {Array<Object>} data - The raw scraped data array.
 * @returns {Object} An object containing all calculated metrics and data subsets.
 */
export function calculateMetrics(data) {
    const dataWithoutError = data.filter(f => !f.error);
    const dataWithError = data.filter(f => f.error);

    const invalidItems = data.filter(item =>
        !item.imgValid ||
        !item.linkValid ||
        !item.titleValid ||
        !item.pageTitleValid ||
        !item.priceValid
    );

    return {
        // Data subsets
        dataWithoutError,
        dataWithError,
        invalidItems,
        duplicateURLs: findDuplicatesByLink(data),
        uniquePageURLs: getUniquePageURLs({ data: dataWithoutError }),

        // Time metrics
        ...getAggrTimeSpan({ data }),

        // Count metrics
        totalPages: countUnique({ data, key: 'pageURL' }),
        totalUniqueItems: countUnique({ data, key: 'link' }),
        totalInvalidLinks: countByField(data, 'linkValid', false),
        totalInvalidImgs: countByField(data.filter(f => f.mediaType === 'image'), 'imgValid', false),
        totalInvalidVideos: countByField(data.filter(f => f.mediaType === 'video'), 'videoValid', false),
        totalInvalidTitles: countByField(data, 'titleValid', false),
        totalInvalidPageTitles: countByField(data, 'pageTitleValid', false),
        totalInvalidPrices: countByField(data, 'priceValid', false),
        totalUnsetPrices: countByField(data, 'priceisUnset', true),
        totalPriceScrapeErrors: countByField(data, 'priceScrapeError', true),
        totalNotAvailables: countByField(data, 'productNotInStock', true),
    };
}