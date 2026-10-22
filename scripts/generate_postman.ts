import fs from 'node:fs';
import path from 'node:path';

/**
 * Script to maintain and validate the single consolidated LifeTracker Postman Collection
 * and Environment across documentation/ and docs/ directories.
 */

const COLLECTION_FILE = 'LifeTracker.postman_collection.json';
const ENVIRONMENT_FILE = 'LifeTracker_Environment.postman_environment.json';

const targetDirs = [
  path.join(__dirname, '../documentation'),
  path.join(__dirname, '../docs'),
];

export const countRequests = (item: any): number => {
  if (!item.item) return 1;
  return item.item.reduce((sum: number, child: any) => sum + countRequests(child), 0);
};

export const validateAndSyncPostman = () => {
  const primaryDocDir = path.join(__dirname, '../documentation');
  const collectionPath = path.join(primaryDocDir, COLLECTION_FILE);
  const environmentPath = path.join(primaryDocDir, ENVIRONMENT_FILE);

  if (!fs.existsSync(collectionPath)) {
    throw new Error(`Collection file not found: ${collectionPath}`);
  }
  if (!fs.existsSync(environmentPath)) {
    throw new Error(`Environment file not found: ${environmentPath}`);
  }

  const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
  const environment = JSON.parse(fs.readFileSync(environmentPath, 'utf8'));

  const totalRequests = countRequests(collection);
  console.log(`Validated consolidated collection "${collection.info.name}" with ${totalRequests} requests.`);
  console.log(`Validated environment "${environment.name}" with ${environment.values.length} variables.`);

  // Synchronize to all target directories
  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(path.join(dir, COLLECTION_FILE), JSON.stringify(collection, null, 2), 'utf-8');
    fs.writeFileSync(path.join(dir, ENVIRONMENT_FILE), JSON.stringify(environment, null, 2), 'utf-8');
    console.log(`Synced Postman collection & environment to: ${dir}`);
  }
};

if (require.main === module) {
  validateAndSyncPostman();
}
