import fs from "fs";
import path from "path";

const logFilePath = path.resolve("logToSheet.json");

export default function addDataToLogToSheet(sheetTitle, sheetValue) {
  if (typeof sheetTitle !== "string") {
    throw new Error("sheetTitle must be a string");
  }

  if (typeof sheetValue !== "string" && typeof sheetValue !== "number") {
    throw new Error("sheetValue must be a string or number");
  }

  let existingData = {};

  // Read existing data if file exists
  if (fs.existsSync(logFilePath)) {
    try {
      const fileContent = fs.readFileSync(logFilePath, "utf-8");
      existingData = JSON.parse(fileContent);
    } catch (err) {
      console.error("Error reading or parsing log file:", err);
    }
  }

  // Update or add new property
  existingData[sheetTitle] = sheetValue;

  // Write updated data back
  fs.writeFileSync(logFilePath, JSON.stringify(existingData, null, 2), "utf-8");
}
