const concat = require('concat');
const glob = require('glob');

(async function build() {
  glob("./dist/<%= angularSolutionName %>/*.js", async function (er, files) {
    await concat(files, '../<%= spfxSolutionName %>/src/ext/bundle.js');
  });
})();
