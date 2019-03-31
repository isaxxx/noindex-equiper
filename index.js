/**
 *
 * Import
 *
 */

const chalk = require('chalk');
const cpx = require('cpx');
const glob = require('glob');
const globBase = require('glob-base');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const rimraf = require('rimraf');
const cheerio = require('cheerio');


/**
 *
 * getDestDirectoryPath
 * @param {string} srcFilePath
 * @return {string}
 *
 */

const getDestDirectoryPath = (srcFilePath) => {
  const globStats = globBase('./src');
  const extName = path.extname(srcFilePath);
  const fileName = path.basename(srcFilePath, extName);
  const dirName = path.dirname(srcFilePath).replace(globStats.base + '/src', '');
  return './' + path.join('./dest', dirName, '/');
};


/**
 *
 * getSrcFilesPath
 * @param {string} srcFilesPathPattern
 * @return {array}
 *
 */

const getSrcFilesPath = (srcFilesPathPattern) => {
  return glob.sync(srcFilesPathPattern).filter((srcFilePath) => {
    if (!fs.statSync(srcFilePath).isDirectory()) {
      return srcFilePath;
    }
  });
};


/**
 *
 * Builder
 *
 */

return new Promise((resolve) => {
  rimraf('./dest/', () => {
    resolve();
  });
}).then(() => {
  return new Promise((resolve) => {
    const srcFilesPath = getSrcFilesPath('./src/**/{*,.*}');
    resolve(srcFilesPath);
  });
}).then((srcFilesPath) => {
  if (srcFilesPath.length) {
    const processing = [];
    srcFilesPath.forEach((srcFilePath) => {
      const destDirectoryPath = getDestDirectoryPath(srcFilePath);
      processing.push(new Promise((resolve, reject) => {
        if (path.extname(srcFilePath).match(/\.(htm|html)$/)) {
          fs.readFile(srcFilePath, 'utf-8', (err, data) => {
            if (err) {
              reject(err);
            } else {
              const $ = cheerio.load(data, {
                decodeEntities: false
              });
              const $meta = $('meta[name=robots]');
              if ($meta.length) {
                $meta.each((index, target) => {
                  $(target).attr('content', 'noindex,nofollow');
                });
              } else {
                const $newMeta = $('<meta name="robots" content="noindex,nofollow" />');
                const $head = $('head');
                $head.append($newMeta);
              }
              fsExtra.outputFile(destDirectoryPath + path.basename(srcFilePath) , $.html(), 'utf-8', (err) => {
                if (err) {
                  reject(err);
                } else {
                  console.log(chalk.green('Output: ' + destDirectoryPath + path.basename(srcFilePath)));
                  resolve();
                }
              });
            }
          });
        } else {
          cpx.copy(srcFilePath, destDirectoryPath, (err) => {
            if (err) {
              reject(err);
            } else {
              console.log(chalk.green('Output: ' + destDirectoryPath + path.basename(srcFilePath)));
              resolve();
            }
          });
        }
      }));
    });
    return Promise.all(processing);
  } else {
    return new Promise((resolve, reject) => {
      reject(new Error('ERROR: no file'));
    });
  }
}).catch((err) => {
  console.error(chalk.red(err));
});
