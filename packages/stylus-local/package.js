Package.describe({
  summary: "Expressive, dynamic, robust CSS!",
  name: "stylus-local",
  version: "1.1.1",
});

Package._transitional_registerBuildPlugin({
  name: "compileStylus",
  use: [],
  sources: [
    'plugin/compile-stylus.js'
  ],
  npmDependencies: {
    stylus: "0.51.1",
    nib: "1.1.0",
    jeet: "6.1.2",
    rupture: "0.6.1",
    axis: "0.3.2",
    typographic: "2.9.3",
    "autoprefixer-stylus": "0.6.0"
  }
});

Package.on_test(function (api) {
  api.use(['tinytest', 'mquandalle:stylus', 'test-helpers']);
  api.add_files([
    'tests/presence.styl',
    'tests/importer.styl',
    'tests/relative.import.styl',
    'tests/absolute.import.styl',
    'tests/nib_.styl',
    'tests/jeet_.styl',
    'tests/rupture_.styl',
    'tests/axis_.styl',
    'tests/typographic_.styl',
    'tests/autoprefixer_.styl',
    'tests/tinytest.js'
  ],'client');
});
