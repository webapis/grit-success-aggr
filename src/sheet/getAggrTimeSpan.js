export default  function getAggrTimeSpan({data}) {

    const sortedData =data.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateA.getTime() - dateB.getTime();
      });
    
    // 2. Extract the oldest (first element after ascending sort)
    const oldestEntry = sortedData[0];
    const oldestTimestamp = oldestEntry.timestamp ||0;
    console.log("oldestTimestamp", oldestTimestamp);
    // 3. Extract the newest (last element after ascending sort)
    const newestEntry = sortedData[sortedData.length - 1];
    const newestTimestamp = newestEntry.timestamp||0;
    console.log("newestTimestamp", newestTimestamp);

    const tsTimeDifferenceMillis = new Date(newestTimestamp).getTime() - new Date(oldestTimestamp).getTime();
    const minutesSpan = tsTimeDifferenceMillis / (1000 * 60);

    return {

        oldestTimestamp,
        newestTimestamp,
        minutesSpan: minutesSpan.toFixed(1)
    };
}