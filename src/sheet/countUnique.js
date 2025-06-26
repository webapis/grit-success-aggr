function countUnique({data,key}) {
    const uniquePages = new Set();

    data.forEach(product => {
        if (product[key]) {
            uniquePages.add(product[key]);
        }
    });

    return {
        count: uniquePages.size,
        uniquePageURLs: Array.from(uniquePages)
    };
}
export default countUnique;