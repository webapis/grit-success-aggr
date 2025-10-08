import fs from 'fs/promises';
import path from 'path';

export default async function findFile(root, fileName) {
  try {
    const items = await fs.readdir(root);

    for (const item of items) {
      const fullPath = path.join(root, item);
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        const foundPath = await findFile(fullPath, fileName);
        if (foundPath) {
          return foundPath;
        }
      } else if (item === fileName) {
        return fullPath;
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding file:', error);
    return null;
  }
}