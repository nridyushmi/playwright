"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BaseReporter = void 0;
exports.formatError = formatError;
exports.formatFailure = formatFailure;
exports.formatResultFailure = formatResultFailure;
exports.formatTestTitle = formatTestTitle;
exports.kOutputSymbol = void 0;
exports.prepareErrorStack = prepareErrorStack;
exports.stripAnsiEscapes = stripAnsiEscapes;

var _utilsBundle = require("playwright-core/lib/utilsBundle");

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _babelBundle = require("../babelBundle");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const kOutputSymbol = Symbol('output');
exports.kOutputSymbol = kOutputSymbol;

class BaseReporter {
  constructor(options = {}) {
    this.duration = 0;
    this.config = void 0;
    this.suite = void 0;
    this.totalTestCount = 0;
    this.result = void 0;
    this.fileDurations = new Map();
    this.monotonicStartTime = 0;
    this._omitFailures = void 0;
    this._ttyWidthForTest = void 0;
    this._fatalErrors = [];
    this._omitFailures = options.omitFailures || false;
    this._ttyWidthForTest = parseInt(process.env.PWTEST_TTY_WIDTH || '', 10);
  }

  onBegin(config, suite) {
    this.monotonicStartTime = monotonicTime();
    this.config = config;
    this.suite = suite;
    this.totalTestCount = suite.allTests().length;
  }

  onStdOut(chunk, test, result) {
    this._appendOutput({
      chunk,
      type: 'stdout'
    }, result);
  }

  onStdErr(chunk, test, result) {
    this._appendOutput({
      chunk,
      type: 'stderr'
    }, result);
  }

  _appendOutput(output, result) {
    if (!result) return;
    result[kOutputSymbol] = result[kOutputSymbol] || [];
    result[kOutputSymbol].push(output);
  }

  onTestEnd(test, result) {
    // Ignore any tests that are run in parallel.
    for (let suite = test.parent; suite; suite = suite.parent) {
      if (suite._parallelMode === 'parallel') return;
    }

    const projectName = test.titlePath()[1];
    const relativePath = relativeTestPath(this.config, test);
    const fileAndProject = (projectName ? `[${projectName}] › ` : '') + relativePath;
    const duration = this.fileDurations.get(fileAndProject) || 0;
    this.fileDurations.set(fileAndProject, duration + result.duration);
  }

  onError(error) {
    if (!error.__isNotAFatalError) this._fatalErrors.push(error);
  }

  async onEnd(result) {
    this.duration = monotonicTime() - this.monotonicStartTime;
    this.result = result;
  }

  ttyWidth() {
    return this._ttyWidthForTest || process.stdout.columns || 0;
  }

  fitToScreen(line, prefix) {
    const ttyWidth = this.ttyWidth();

    if (!ttyWidth) {
      // Guard against the case where we cannot determine available width.
      return line;
    }

    return fitToWidth(line, ttyWidth, prefix);
  }

  generateStartingMessage() {
    const jobs = Math.min(this.config.workers, this.config._maxConcurrentTestGroups);
    const shardDetails = this.config.shard ? `, shard ${this.config.shard.current} of ${this.config.shard.total}` : '';
    return `\nRunning ${this.totalTestCount} test${this.totalTestCount !== 1 ? 's' : ''} using ${jobs} worker${jobs !== 1 ? 's' : ''}${shardDetails}`;
  }

  getSlowTests() {
    if (!this.config.reportSlowTests) return [];
    const fileDurations = [...this.fileDurations.entries()];
    fileDurations.sort((a, b) => b[1] - a[1]);
    const count = Math.min(fileDurations.length, this.config.reportSlowTests.max || Number.POSITIVE_INFINITY);
    const threshold = this.config.reportSlowTests.threshold;
    return fileDurations.filter(([, duration]) => duration > threshold).slice(0, count);
  }

  generateSummaryMessage({
    skipped,
    expected,
    interrupted,
    unexpected,
    flaky,
    fatalErrors
  }) {
    const tokens = [];

    if (unexpected.length) {
      tokens.push(_utilsBundle.colors.red(`  ${unexpected.length} failed`));

      for (const test of unexpected) tokens.push(_utilsBundle.colors.red(formatTestHeader(this.config, test, '    ')));
    }

    if (interrupted.length) {
      tokens.push(_utilsBundle.colors.yellow(`  ${interrupted.length} interrupted`));

      for (const test of interrupted) tokens.push(_utilsBundle.colors.yellow(formatTestHeader(this.config, test, '    ')));
    }

    if (flaky.length) {
      tokens.push(_utilsBundle.colors.yellow(`  ${flaky.length} flaky`));

      for (const test of flaky) tokens.push(_utilsBundle.colors.yellow(formatTestHeader(this.config, test, '    ')));
    }

    if (skipped) tokens.push(_utilsBundle.colors.yellow(`  ${skipped} skipped`));
    if (expected) tokens.push(_utilsBundle.colors.green(`  ${expected} passed`) + _utilsBundle.colors.dim(` (${(0, _utilsBundle.ms)(this.duration)})`));
    if (this.result.status === 'timedout') tokens.push(_utilsBundle.colors.red(`  Timed out waiting ${this.config.globalTimeout / 1000}s for the entire test run`));
    if (fatalErrors.length) tokens.push(_utilsBundle.colors.red(`  ${fatalErrors.length === 1 ? '1 error was not a part of any test' : fatalErrors.length + ' errors were not a part of any test'}, see above for details`));
    return tokens.join('\n');
  }

  generateSummary() {
    let skipped = 0;
    let expected = 0;
    const interrupted = [];
    const interruptedToPrint = [];
    const unexpected = [];
    const flaky = [];
    this.suite.allTests().forEach(test => {
      switch (test.outcome()) {
        case 'skipped':
          {
            if (test.results.some(result => result.status === 'interrupted')) {
              if (test.results.some(result => !!result.error)) interruptedToPrint.push(test);
              interrupted.push(test);
            } else {
              ++skipped;
            }

            break;
          }

        case 'expected':
          ++expected;
          break;

        case 'unexpected':
          unexpected.push(test);
          break;

        case 'flaky':
          flaky.push(test);
          break;
      }
    });
    const failuresToPrint = [...unexpected, ...flaky, ...interruptedToPrint];
    return {
      skipped,
      expected,
      interrupted,
      unexpected,
      flaky,
      failuresToPrint,
      fatalErrors: this._fatalErrors
    };
  }

  epilogue(full) {
    const summary = this.generateSummary();
    const summaryMessage = this.generateSummaryMessage(summary);
    if (full && summary.failuresToPrint.length && !this._omitFailures) this._printFailures(summary.failuresToPrint);

    this._printSlowTests();

    this._printSummary(summaryMessage);
  }

  _printFailures(failures) {
    console.log('');
    failures.forEach((test, index) => {
      console.log(formatFailure(this.config, test, {
        index: index + 1
      }).message);
    });
  }

  _printSlowTests() {
    const slowTests = this.getSlowTests();
    slowTests.forEach(([file, duration]) => {
      console.log(_utilsBundle.colors.yellow('  Slow test file: ') + file + _utilsBundle.colors.yellow(` (${(0, _utilsBundle.ms)(duration)})`));
    });
    if (slowTests.length) console.log(_utilsBundle.colors.yellow('  Consider splitting slow test files to speed up parallel execution'));
  }

  _printSummary(summary) {
    if (summary.trim()) {
      console.log('');
      console.log(summary);
    }
  }

  willRetry(test) {
    return test.outcome() === 'unexpected' && test.results.length <= test.retries;
  }

}

exports.BaseReporter = BaseReporter;

function formatFailure(config, test, options = {}) {
  const {
    index,
    includeStdio,
    includeAttachments = true
  } = options;
  const lines = [];
  const title = formatTestTitle(config, test);
  const annotations = [];
  const header = formatTestHeader(config, test, '  ', index);
  lines.push(_utilsBundle.colors.red(header));

  for (const result of test.results) {
    const resultLines = [];
    const errors = formatResultFailure(config, test, result, '    ', _utilsBundle.colors.enabled);
    if (!errors.length) continue;
    const retryLines = [];

    if (result.retry) {
      retryLines.push('');
      retryLines.push(_utilsBundle.colors.gray(pad(`    Retry #${result.retry}`, '-')));
    }

    resultLines.push(...retryLines);
    resultLines.push(...errors.map(error => '\n' + error.message));

    if (includeAttachments) {
      for (let i = 0; i < result.attachments.length; ++i) {
        const attachment = result.attachments[i];
        const hasPrintableContent = attachment.contentType.startsWith('text/') && attachment.body;
        if (!attachment.path && !hasPrintableContent) continue;
        resultLines.push('');
        resultLines.push(_utilsBundle.colors.cyan(pad(`    attachment #${i + 1}: ${attachment.name} (${attachment.contentType})`, '-')));

        if (attachment.path) {
          const relativePath = _path.default.relative(process.cwd(), attachment.path);

          resultLines.push(_utilsBundle.colors.cyan(`    ${relativePath}`)); // Make this extensible

          if (attachment.name === 'trace') {
            resultLines.push(_utilsBundle.colors.cyan(`    Usage:`));
            resultLines.push('');
            resultLines.push(_utilsBundle.colors.cyan(`        npx playwright show-trace ${relativePath}`));
            resultLines.push('');
          }
        } else {
          if (attachment.contentType.startsWith('text/') && attachment.body) {
            let text = attachment.body.toString();
            if (text.length > 300) text = text.slice(0, 300) + '...';
            resultLines.push(_utilsBundle.colors.cyan(`    ${text}`));
          }
        }

        resultLines.push(_utilsBundle.colors.cyan(pad('   ', '-')));
      }
    }

    const output = result[kOutputSymbol] || [];

    if (includeStdio && output.length) {
      const outputText = output.map(({
        chunk,
        type
      }) => {
        const text = chunk.toString('utf8');
        if (type === 'stderr') return _utilsBundle.colors.red(stripAnsiEscapes(text));
        return text;
      }).join('');
      resultLines.push('');
      resultLines.push(_utilsBundle.colors.gray(pad('--- Test output', '-')) + '\n\n' + outputText + '\n' + pad('', '-'));
    }

    for (const error of errors) {
      annotations.push({
        location: error.location,
        title,
        message: [header, ...retryLines, error.message].join('\n')
      });
    }

    lines.push(...resultLines);
  }

  lines.push('');
  return {
    message: lines.join('\n'),
    annotations
  };
}

function formatResultFailure(config, test, result, initialIndent, highlightCode) {
  const errorDetails = [];

  if (result.status === 'passed' && test.expectedStatus === 'failed') {
    errorDetails.push({
      message: indent(_utilsBundle.colors.red(`Expected to fail, but passed.`), initialIndent)
    });
  }

  if (result.status === 'interrupted') {
    errorDetails.push({
      message: indent(_utilsBundle.colors.red(`Test was interrupted.`), initialIndent)
    });
  }

  for (const error of result.errors) {
    const formattedError = formatError(config, error, highlightCode, test.location.file);
    errorDetails.push({
      message: indent(formattedError.message, initialIndent),
      location: formattedError.location
    });
  }

  return errorDetails;
}

function relativeFilePath(config, file) {
  return _path.default.relative(config.rootDir, file) || _path.default.basename(file);
}

function relativeTestPath(config, test) {
  return relativeFilePath(config, test.location.file);
}

function stepSuffix(step) {
  const stepTitles = step ? step.titlePath() : [];
  return stepTitles.map(t => ' › ' + t).join('');
}

function formatTestTitle(config, test, step, omitLocation = false) {
  // root, project, file, ...describes, test
  const [, projectName,, ...titles] = test.titlePath();
  let location;
  if (omitLocation) location = `${relativeTestPath(config, test)}`;else location = `${relativeTestPath(config, test)}:${test.location.line}:${test.location.column}`;
  const projectTitle = projectName ? `[${projectName}] › ` : '';
  return `${projectTitle}${location} › ${titles.join(' › ')}${stepSuffix(step)}`;
}

function formatTestHeader(config, test, indent, index) {
  const title = formatTestTitle(config, test);
  const header = `${indent}${index ? index + ') ' : ''}${title}`;
  return pad(header, '=');
}

function formatError(config, error, highlightCode, file) {
  const stack = error.stack;
  const tokens = [];
  let location;

  if (stack) {
    // Now that we filter out internals from our stack traces, we can safely render
    // the helper / original exception locations.
    const parsed = prepareErrorStack(stack);
    tokens.push(parsed.message);
    location = parsed.location;

    if (location) {
      try {
        const source = _fs.default.readFileSync(location.file, 'utf8');

        const codeFrame = (0, _babelBundle.codeFrameColumns)(source, {
          start: location
        }, {
          highlightCode
        }); // Convert /var/folders to /private/var/folders on Mac.

        if (!file || _fs.default.realpathSync(file) !== location.file) {
          tokens.push('');
          tokens.push(_utilsBundle.colors.gray(`   at `) + `${relativeFilePath(config, location.file)}:${location.line}`);
        }

        tokens.push('');
        tokens.push(codeFrame);
      } catch (e) {// Failed to read the source file - that's ok.
      }
    }

    tokens.push('');
    tokens.push(_utilsBundle.colors.dim(parsed.stackLines.join('\n')));
  } else if (error.message) {
    tokens.push(error.message);
  } else if (error.value) {
    tokens.push(error.value);
  }

  return {
    location,
    message: tokens.join('\n')
  };
}

function pad(line, char) {
  if (line) line += ' ';
  return line + _utilsBundle.colors.gray(char.repeat(Math.max(0, 100 - line.length)));
}

function indent(lines, tab) {
  return lines.replace(/^(?=.+$)/gm, tab);
}

function prepareErrorStack(stack) {
  const lines = stack.split('\n');
  let firstStackLine = lines.findIndex(line => line.startsWith('    at '));
  if (firstStackLine === -1) firstStackLine = lines.length;
  const message = lines.slice(0, firstStackLine).join('\n');
  const stackLines = lines.slice(firstStackLine);
  let location;

  for (const line of stackLines) {
    const {
      frame: parsed,
      fileName: resolvedFile
    } = (0, _utilsBundle.parseStackTraceLine)(line);
    if (!parsed || !resolvedFile) continue;
    location = {
      file: resolvedFile,
      column: parsed.column || 0,
      line: parsed.line || 0
    };
    break;
  }

  return {
    message,
    stackLines,
    location
  };
}

function monotonicTime() {
  const [seconds, nanoseconds] = process.hrtime();
  return seconds * 1000 + (nanoseconds / 1000000 | 0);
}

const ansiRegex = new RegExp('([\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~])))', 'g');

function stripAnsiEscapes(str) {
  return str.replace(ansiRegex, '');
} // Leaves enough space for the "prefix" to also fit.


function fitToWidth(line, width, prefix) {
  const prefixLength = prefix ? stripAnsiEscapes(prefix).length : 0;
  width -= prefixLength;
  if (line.length <= width) return line; // Even items are plain text, odd items are control sequences.

  const parts = line.split(ansiRegex);
  const taken = [];

  for (let i = parts.length - 1; i >= 0; i--) {
    if (i % 2) {
      // Include all control sequences to preserve formatting.
      taken.push(parts[i]);
    } else {
      let part = parts[i].substring(parts[i].length - width);

      if (part.length < parts[i].length && part.length > 0) {
        // Add ellipsis if we are truncating.
        part = '\u2026' + part.substring(1);
      }

      taken.push(part);
      width -= part.length;
    }
  }

  return taken.reverse().join('');
}