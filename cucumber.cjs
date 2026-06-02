// cucumber-js configuration.
// CommonJS because cucumber-js 13 double-wraps ESM default exports
// in its config loader — see node_modules/@cucumber/cucumber/lib/configuration/from_file.js.

const support = ['e2e/step-definitions/**/*.js', 'e2e/support/**/*.js'];

const features = ['e2e/features/**/*.feature'];

const baseFormat = ['progress', 'summary', 'html:e2e/reports/cucumber-report.html'];

// snippetInterface controls how undefined-step snippets are rendered
// (so we get `async function() { ... }` rather than the synchronous
// default). snippetSyntax is intentionally left unset so cucumber
// uses its built-in JavaScript syntax — setting it would be treated
// as a custom module name and cause a load error.
const baseFormatOptions = {
  snippetInterface: 'async-await'
};

module.exports = {
  default: {
    import: support,
    paths: features,
    format: baseFormat,
    formatOptions: baseFormatOptions,
    parallel: 1,
    publishQuiet: true,
    failFast: false
  },
  smoke: {
    import: support,
    paths: features,
    tags: '@smoke',
    format: ['progress', 'summary'],
    formatOptions: baseFormatOptions,
    parallel: 1,
    publishQuiet: true
  }
};
