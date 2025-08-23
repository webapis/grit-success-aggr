import fs from "fs";
import path from "path";

const logFilePath = path.resolve("logToSheet.json");

export default function logToLocalSheet(newData) {
  let existingData = {};

  // Load existing data if available
  if (fs.existsSync(logFilePath)) {
    try {
      const fileContent = fs.readFileSync(logFilePath, "utf-8");
      existingData = JSON.parse(fileContent);
    } catch (err) {
      console.error("Error reading or parsing log file:", err);
    }
  }

  // If no data passed → just return stored data
  if (!newData) {
    return existingData;
  }

  if (typeof newData !== "object" || Array.isArray(newData) || newData === null) {
    throw new Error("Argument must be a non-null object if provided");
  }

  // Merge new data
  const mergedData = { ...existingData, ...newData };

  // Save merged data
  fs.writeFileSync(logFilePath, JSON.stringify(mergedData, null, 2), "utf-8");

  return mergedData;
}
