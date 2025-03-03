import fs from "fs";

export function formatDate(timestamp){
  if(!timestamp) timestamp = Date.now();
  const currentDate = new Date(timestamp);
  return currentDate.toISOString();
}
export function isValidDir(dirPath){
  try {
    if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return false
    }
  } catch (err) {
    return false
  }
  return true;
}

export function stringify(d){
  if (typeof d === "object") {
    return JSON.stringify(d);
  } else {
    return String(d);
  }
}