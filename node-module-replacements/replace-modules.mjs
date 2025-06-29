import fs from 'fs';
import path from 'path';

const __dirname = path.resolve();
const nodeModulesDir = path.join(__dirname, 'node_modules');
const replacementsDir = path.join(__dirname, 'node-module-replacements');

function replaceFiles(srcDir, destDir) {
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);

    if (fs.lstatSync(srcFile).isDirectory()) {
      // If the source file is a directory, create it in the destination
      if (!fs.existsSync(destFile)) {
        fs.mkdirSync(destFile);
      }
      // Recursively replace files in the directory
      replaceFiles(srcFile, destFile);
    } else {
      // Replace the file if it exists in the destination
      console.log(`Copying ${srcFile} to ${destFile}`);
      if (fs.existsSync(destFile)) {
        fs.unlinkSync(destFile);
      }
      fs.copyFileSync(srcFile, destFile);
    }
  }
}

function replaceNodeModules() {
  for (const folder of fs.readdirSync(replacementsDir)) {
    const replacementFolder = path.join(replacementsDir, folder);
    const nodeModuleFolder = path.join(nodeModulesDir, folder);

    if (fs.lstatSync(replacementFolder).isDirectory()) {
      // Only replace directories that exist in node_modules
      if (fs.existsSync(nodeModuleFolder) && fs.lstatSync(nodeModuleFolder).isDirectory()) {
        replaceFiles(replacementFolder, nodeModuleFolder);
      }
    }
  }
}

replaceNodeModules();
