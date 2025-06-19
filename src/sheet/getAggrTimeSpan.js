export default function getAggrTimeSpan({ data }) {
    // 1. Filter out entries without a valid timestamp
    const validData = data.filter(entry => entry.timestamp && !isNaN(new Date(entry.timestamp).getTime()));

    // 2. If no valid timestamps, return defaults
    if (validData.length === 0) {
        return {
            oldestTimestamp: 0,
            newestTimestamp: 0,
            minutesSpan: 0
        };
    }

    // 3. Sort by timestamp
    const sortedData = validData.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    const oldestTimestamp = sortedData[0].timestamp;
    const newestTimestamp = sortedData[sortedData.length - 1].timestamp;

    const tsTimeDifferenceMillis = new Date(newestTimestamp).getTime() - new Date(oldestTimestamp).getTime();
    const minutesSpan = tsTimeDifferenceMillis / (1000 * 60);

    return {
        oldestTimestamp,
        newestTimestamp,
        minutesSpan: minutesSpan.toFixed(1)
    };
}
