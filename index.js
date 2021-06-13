const flowRemoveTypes = require('flow-remove-types')
const fs = require('fs')
const path = require('path')
const esbuild = require('esbuild')

const IS_PREACT = /from\s+['"]preact['"]/;
function checkIsPreact(contents) {
  return IS_PREACT.test(contents);
}

module.exports = function(config, {input}) {
  return {
    name: 'snowpack-flow-remove-types',
    resolve: {
      input: ['.js', '.jsx', '.mjs'],
      output: ['.js'],
    },
    async load({filePath}) {
      let contents = await fs.promises
        .readFile(filePath, 'utf8')
        .then(flowRemoveTypes)
        .then(code => code.toString())
      const ext = path.extname(filePath);
      const isJSX = ext.endsWith('x');
      if (isJSX) {
        const jsxInject = config.buildOptions.jsxInject ? `${config.buildOptions.jsxInject}\n` : '';
        contents = jsxInject + contents;
      }
      const isPreact = isJSX && checkIsPreact(contents);
      const jsxFactory = config.buildOptions.jsxFactory || (isPreact ? 'h' : undefined);
      const jsxFragment = config.buildOptions.jsxFragment || (isPreact ? 'Fragment' : undefined);

      const {code, map, warnings} = await esbuild.transform(contents, {
        loader: isJSX ? 'jsx' : 'js',
        jsxFactory,
        jsxFragment,
        sourcefile: filePath,
        sourcemap: config.buildOptions.sourcemap && 'inline',
        charset: 'utf8',
        sourcesContent: config.mode !== 'production',
      });
      for (const warning of warnings) {
        console.error(`! ${filePath}
  ${warning.text}`);
      }
      return {
        '.js': {
          code: code || '',
          map,
        },
      };
    },
  };
}
