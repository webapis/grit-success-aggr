function countUniquePages({data}) {
    const uniquePages = new Set();

    data.forEach(product => {
        if (product.pageURL) {
            uniquePages.add(product.pageURL);
        }
    });

    return {
        count: uniquePages.size,
        uniquePageURLs: Array.from(uniquePages)
    };
}
export default countUniquePages ||0;