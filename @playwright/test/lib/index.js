"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "_addRunnerPlugin", {
  enumerable: true,
  get: function () {
    return _plugins.addRunnerPlugin;
  }
});
exports.default = exports._baseTest = void 0;
Object.defineProperty(exports, "expect", {
  enumerable: true,
  get: function () {
    return _expect.expect;
  }
});
exports.normalizeTraceMode = normalizeTraceMode;
exports.normalizeVideoMode = normalizeVideoMode;
exports.shouldCaptureTrace = shouldCaptureTrace;
exports.shouldCaptureVideo = shouldCaptureVideo;
exports.test = void 0;

var fs = _interopRequireWildcard(require("fs"));

var path = _interopRequireWildcard(require("path"));

var _testType = require("./testType");

var _utils = require("playwright-core/lib/utils");

var _fileUtils = require("playwright-core/lib/utils/fileUtils");

var _expect = require("./expect");

var _plugins = require("./plugins");

var outOfProcess = _interopRequireWildcard(require("playwright-core/lib/outofprocess"));

var playwrightLibrary = _interopRequireWildcard(require("playwright-core"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License");
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
const _baseTest = _testType.rootTestType.test;
exports._baseTest = _baseTest;

if (process['__pw_initiator__']) {
  const originalStackTraceLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 200;

  try {
    throw new Error('Requiring @playwright/test second time, \nFirst:\n' + process['__pw_initiator__'] + '\n\nSecond: ');
  } finally {
    Error.stackTraceLimit = originalStackTraceLimit;
  }
} else {
  process['__pw_initiator__'] = new Error().stack;
}

const test = _baseTest.extend({
  defaultBrowserType: ['chromium', {
    scope: 'worker',
    option: true
  }],
  browserName: [({
    defaultBrowserType
  }, use) => use(defaultBrowserType), {
    scope: 'worker',
    option: true
  }],
  playwright: [async ({}, use) => {
    if (process.env.PW_OUT_OF_PROCESS_DRIVER) {
      const impl = await outOfProcess.start({
        NODE_OPTIONS: undefined // Hide driver process while debugging.

      });
      const pw = impl.playwright;

      pw._setSelectors(playwrightLibrary.selectors);

      await use(pw);
      await impl.stop();
    } else {
      await use(require('playwright-core'));
    }
  }, {
    scope: 'worker'
  }],
  headless: [({
    launchOptions
  }, use) => {
    var _launchOptions$headle;

    return use((_launchOptions$headle = launchOptions.headless) !== null && _launchOptions$headle !== void 0 ? _launchOptions$headle : true);
  }, {
    scope: 'worker',
    option: true
  }],
  channel: [({
    launchOptions
  }, use) => use(launchOptions.channel), {
    scope: 'worker',
    option: true
  }],
  launchOptions: [{}, {
    scope: 'worker',
    option: true
  }],
  connectOptions: [process.env.PW_TEST_CONNECT_WS_ENDPOINT ? {
    wsEndpoint: process.env.PW_TEST_CONNECT_WS_ENDPOINT,
    headers: process.env.PW_TEST_CONNECT_HEADERS ? JSON.parse(process.env.PW_TEST_CONNECT_HEADERS) : undefined
  } : undefined, {
    scope: 'worker',
    option: true
  }],
  screenshot: ['off', {
    scope: 'worker',
    option: true
  }],
  video: ['off', {
    scope: 'worker',
    option: true
  }],
  trace: ['off', {
    scope: 'worker',
    option: true
  }],
  _artifactsDir: [async ({}, use, workerInfo) => {
    let dir;
    await use(() => {
      if (!dir) {
        dir = path.join(workerInfo.project.outputDir, '.playwright-artifacts-' + workerInfo.workerIndex);
        fs.mkdirSync(dir, {
          recursive: true
        });
      }

      return dir;
    });
    if (dir) await (0, _fileUtils.removeFolders)([dir]);
  }, {
    scope: 'worker',
    _title: 'playwright configuration'
  }],
  _browserOptions: [async ({
    playwright,
    headless,
    channel,
    launchOptions,
    connectOptions
  }, use) => {
    const options = {
      handleSIGINT: false,
      timeout: 0,
      ...launchOptions
    };
    if (headless !== undefined) options.headless = headless;
    if (channel !== undefined) options.channel = channel;

    for (const browserType of [playwright.chromium, playwright.firefox, playwright.webkit]) {
      browserType._defaultLaunchOptions = options;
      browserType._defaultConnectOptions = connectOptions;
    }

    await use(options);

    for (const browserType of [playwright.chromium, playwright.firefox, playwright.webkit]) {
      browserType._defaultLaunchOptions = undefined;
      browserType._defaultConnectOptions = undefined;
    }
  }, {
    scope: 'worker',
    auto: true
  }],
  browser: [async ({
    playwright,
    browserName
  }, use) => {
    if (!['chromium', 'firefox', 'webkit'].includes(browserName)) throw new Error(`Unexpected browserName "${browserName}", must be one of "chromium", "firefox" or "webkit"`);
    const browser = await playwright[browserName].launch();
    await use(browser);
    await browser.close();
  }, {
    scope: 'worker',
    timeout: 0
  }],
  acceptDownloads: [({
    contextOptions
  }, use) => {
    var _contextOptions$accep;

    return use((_contextOptions$accep = contextOptions.acceptDownloads) !== null && _contextOptions$accep !== void 0 ? _contextOptions$accep : true);
  }, {
    option: true
  }],
  bypassCSP: [({
    contextOptions
  }, use) => use(contextOptions.bypassCSP), {
    option: true
  }],
  colorScheme: [({
    contextOptions
  }, use) => use(contextOptions.colorScheme), {
    option: true
  }],
  deviceScaleFactor: [({
    contextOptions
  }, use) => use(contextOptions.deviceScaleFactor), {
    option: true
  }],
  extraHTTPHeaders: [({
    contextOptions
  }, use) => use(contextOptions.extraHTTPHeaders), {
    option: true
  }],
  geolocation: [({
    contextOptions
  }, use) => use(contextOptions.geolocation), {
    option: true
  }],
  hasTouch: [({
    contextOptions
  }, use) => use(contextOptions.hasTouch), {
    option: true
  }],
  httpCredentials: [({
    contextOptions
  }, use) => use(contextOptions.httpCredentials), {
    option: true
  }],
  ignoreHTTPSErrors: [({
    contextOptions
  }, use) => use(contextOptions.ignoreHTTPSErrors), {
    option: true
  }],
  isMobile: [({
    contextOptions
  }, use) => use(contextOptions.isMobile), {
    option: true
  }],
  javaScriptEnabled: [({
    contextOptions
  }, use) => {
    var _contextOptions$javaS;

    return use((_contextOptions$javaS = contextOptions.javaScriptEnabled) !== null && _contextOptions$javaS !== void 0 ? _contextOptions$javaS : true);
  }, {
    option: true
  }],
  locale: [({
    contextOptions
  }, use) => {
    var _contextOptions$local;

    return use((_contextOptions$local = contextOptions.locale) !== null && _contextOptions$local !== void 0 ? _contextOptions$local : 'en-US');
  }, {
    option: true
  }],
  offline: [({
    contextOptions
  }, use) => use(contextOptions.offline), {
    option: true
  }],
  permissions: [({
    contextOptions
  }, use) => use(contextOptions.permissions), {
    option: true
  }],
  proxy: [({
    contextOptions
  }, use) => use(contextOptions.proxy), {
    option: true
  }],
  storageState: [({
    contextOptions
  }, use) => use(contextOptions.storageState), {
    option: true
  }],
  timezoneId: [({
    contextOptions
  }, use) => use(contextOptions.timezoneId), {
    option: true
  }],
  userAgent: [({
    contextOptions
  }, use) => use(contextOptions.userAgent), {
    option: true
  }],
  viewport: [({
    contextOptions
  }, use) => use(contextOptions.viewport === undefined ? {
    width: 1280,
    height: 720
  } : contextOptions.viewport), {
    option: true
  }],
  actionTimeout: [0, {
    option: true
  }],
  testIdAttribute: ['data-testid', {
    option: true
  }],
  navigationTimeout: [0, {
    option: true
  }],
  baseURL: [async ({}, use) => {
    await use(process.env.PLAYWRIGHT_TEST_BASE_URL);
  }, {
    option: true
  }],
  serviceWorkers: [({
    contextOptions
  }, use) => {
    var _contextOptions$servi;

    return use((_contextOptions$servi = contextOptions.serviceWorkers) !== null && _contextOptions$servi !== void 0 ? _contextOptions$servi : 'allow');
  }, {
    option: true
  }],
  contextOptions: [{}, {
    option: true
  }],
  _combinedContextOptions: async ({
    acceptDownloads,
    bypassCSP,
    colorScheme,
    deviceScaleFactor,
    extraHTTPHeaders,
    hasTouch,
    geolocation,
    httpCredentials,
    ignoreHTTPSErrors,
    isMobile,
    javaScriptEnabled,
    locale,
    offline,
    permissions,
    proxy,
    storageState,
    viewport,
    timezoneId,
    userAgent,
    baseURL,
    contextOptions,
    serviceWorkers
  }, use) => {
    const options = {};
    if (acceptDownloads !== undefined) options.acceptDownloads = acceptDownloads;
    if (bypassCSP !== undefined) options.bypassCSP = bypassCSP;
    if (colorScheme !== undefined) options.colorScheme = colorScheme;
    if (deviceScaleFactor !== undefined) options.deviceScaleFactor = deviceScaleFactor;
    if (extraHTTPHeaders !== undefined) options.extraHTTPHeaders = extraHTTPHeaders;
    if (geolocation !== undefined) options.geolocation = geolocation;
    if (hasTouch !== undefined) options.hasTouch = hasTouch;
    if (httpCredentials !== undefined) options.httpCredentials = httpCredentials;
    if (ignoreHTTPSErrors !== undefined) options.ignoreHTTPSErrors = ignoreHTTPSErrors;
    if (isMobile !== undefined) options.isMobile = isMobile;
    if (javaScriptEnabled !== undefined) options.javaScriptEnabled = javaScriptEnabled;
    if (locale !== undefined) options.locale = locale;
    if (offline !== undefined) options.offline = offline;
    if (permissions !== undefined) options.permissions = permissions;
    if (proxy !== undefined) options.proxy = proxy;
    if (storageState !== undefined) options.storageState = storageState;
    if (timezoneId !== undefined) options.timezoneId = timezoneId;
    if (userAgent !== undefined) options.userAgent = userAgent;
    if (viewport !== undefined) options.viewport = viewport;
    if (baseURL !== undefined) options.baseURL = baseURL;
    if (serviceWorkers !== undefined) options.serviceWorkers = serviceWorkers;
    await use({ ...contextOptions,
      ...options
    });
  },
  _snapshotSuffix: [process.platform, {
    scope: 'worker'
  }],
  _setupContextOptionsAndArtifacts: [async ({
    playwright,
    _snapshotSuffix,
    _combinedContextOptions,
    _browserOptions,
    _artifactsDir,
    trace,
    screenshot,
    actionTimeout,
    navigationTimeout,
    testIdAttribute
  }, use, testInfo) => {
    if (testIdAttribute) playwrightLibrary.selectors.setTestIdAttribute(testIdAttribute);
    testInfo.snapshotSuffix = _snapshotSuffix;
    if ((0, _utils.debugMode)()) testInfo.setTimeout(0);
    const traceMode = normalizeTraceMode(trace);
    const defaultTraceOptions = {
      screenshots: true,
      snapshots: true,
      sources: true
    };
    const traceOptions = typeof trace === 'string' ? defaultTraceOptions : { ...defaultTraceOptions,
      ...trace,
      mode: undefined
    };
    const captureTrace = shouldCaptureTrace(traceMode, testInfo);
    const temporaryTraceFiles = [];
    const temporaryScreenshots = [];
    const testInfoImpl = testInfo;

    const createInstrumentationListener = context => {
      return {
        onApiCallBegin: (apiCall, stackTrace, userData) => {
          if (apiCall.startsWith('expect.')) return {
            userObject: null
          };

          if (apiCall === 'page.pause') {
            testInfo.setTimeout(0);
            context === null || context === void 0 ? void 0 : context.setDefaultNavigationTimeout(0);
            context === null || context === void 0 ? void 0 : context.setDefaultTimeout(0);
          }

          const step = testInfoImpl._addStep({
            location: stackTrace === null || stackTrace === void 0 ? void 0 : stackTrace.frames[0],
            category: 'pw:api',
            title: apiCall,
            canHaveChildren: false,
            forceNoParent: false
          });

          userData.userObject = step;
        },
        onApiCallEnd: (userData, error) => {
          const step = userData.userObject;
          step === null || step === void 0 ? void 0 : step.complete({
            error
          });
        }
      };
    };

    const startTracing = async tracing => {
      if (captureTrace) {
        const title = [path.relative(testInfo.project.testDir, testInfo.file) + ':' + testInfo.line, ...testInfo.titlePath.slice(1)].join(' › ');

        if (!tracing[kTracingStarted]) {
          await tracing.start({ ...traceOptions,
            title
          });
          tracing[kTracingStarted] = true;
        } else {
          await tracing.startChunk({
            title
          });
        }
      } else {
        if (tracing[kTracingStarted]) {
          tracing[kTracingStarted] = false;
          await tracing.stop();
        }
      }
    };

    const onDidCreateBrowserContext = async context => {
      context.setDefaultTimeout(actionTimeout || 0);
      context.setDefaultNavigationTimeout(navigationTimeout || actionTimeout || 0);
      await startTracing(context.tracing);
      const listener = createInstrumentationListener(context);

      context._instrumentation.addListener(listener);

      context.request._instrumentation.addListener(listener);
    };

    const onDidCreateRequestContext = async context => {
      const tracing = context._tracing;
      await startTracing(tracing);

      context._instrumentation.addListener(createInstrumentationListener());
    };

    const startedCollectingArtifacts = Symbol('startedCollectingArtifacts');

    const stopTracing = async tracing => {
      tracing[startedCollectingArtifacts] = true;

      if (captureTrace) {
        // Export trace for now. We'll know whether we have to preserve it
        // after the test finishes.
        const tracePath = path.join(_artifactsDir(), (0, _utils.createGuid)() + '.zip');
        temporaryTraceFiles.push(tracePath);
        await tracing.stopChunk({
          path: tracePath
        });
      }
    };

    const screenshottedSymbol = Symbol('screenshotted');

    const screenshotPage = async page => {
      if (page[screenshottedSymbol]) return;
      page[screenshottedSymbol] = true;
      const screenshotPath = path.join(_artifactsDir(), (0, _utils.createGuid)() + '.png');
      temporaryScreenshots.push(screenshotPath); // Pass caret=initial to avoid any evaluations that might slow down the screenshot
      // and let the page modify itself from the problematic state it had at the moment of failure.

      await page.screenshot({
        timeout: 5000,
        path: screenshotPath,
        caret: 'initial'
      }).catch(() => {});
    };

    const screenshotOnTestFailure = async () => {
      const contexts = [];

      for (const browserType of [playwright.chromium, playwright.firefox, playwright.webkit]) contexts.push(...browserType._contexts);

      await Promise.all(contexts.map(ctx => Promise.all(ctx.pages().map(screenshotPage))));
    };

    const onWillCloseContext = async context => {
      await stopTracing(context.tracing);

      if (screenshot === 'on' || screenshot === 'only-on-failure') {
        // Capture screenshot for now. We'll know whether we have to preserve them
        // after the test finishes.
        await Promise.all(context.pages().map(screenshotPage));
      }
    };

    const onWillCloseRequestContext = async context => {
      const tracing = context._tracing;
      await stopTracing(tracing);
    }; // 1. Setup instrumentation and process existing contexts.


    for (const browserType of [playwright.chromium, playwright.firefox, playwright.webkit]) {
      browserType._onDidCreateContext = onDidCreateBrowserContext;
      browserType._onWillCloseContext = onWillCloseContext;
      browserType._defaultContextOptions = _combinedContextOptions;
      const existingContexts = Array.from(browserType._contexts);
      await Promise.all(existingContexts.map(onDidCreateBrowserContext));
    }

    {
      playwright.request._onDidCreateContext = onDidCreateRequestContext;
      playwright.request._onWillCloseContext = onWillCloseRequestContext;
      const existingApiRequests = Array.from(playwright.request._contexts);
      await Promise.all(existingApiRequests.map(onDidCreateRequestContext));
    }
    if (screenshot === 'on' || screenshot === 'only-on-failure') testInfoImpl._onTestFailureImmediateCallbacks.set(screenshotOnTestFailure, 'Screenshot on failure'); // 2. Run the test.

    await use(); // 3. Determine whether we need the artifacts.

    const testFailed = testInfo.status !== testInfo.expectedStatus;
    const preserveTrace = captureTrace && (traceMode === 'on' || testFailed && traceMode === 'retain-on-failure' || traceMode === 'on-first-retry' && testInfo.retry === 1);
    const captureScreenshots = screenshot === 'on' || screenshot === 'only-on-failure' && testFailed;
    const traceAttachments = [];

    const addTraceAttachment = () => {
      const tracePath = testInfo.outputPath(`trace${traceAttachments.length ? '-' + traceAttachments.length : ''}.zip`);
      traceAttachments.push(tracePath);
      testInfo.attachments.push({
        name: 'trace',
        path: tracePath,
        contentType: 'application/zip'
      });
      return tracePath;
    };

    const screenshotAttachments = [];

    const addScreenshotAttachment = () => {
      const screenshotPath = testInfo.outputPath(`test-${testFailed ? 'failed' : 'finished'}-${screenshotAttachments.length + 1}.png`);
      screenshotAttachments.push(screenshotPath);
      testInfo.attachments.push({
        name: 'screenshot',
        path: screenshotPath,
        contentType: 'image/png'
      });
      return screenshotPath;
    }; // 4. Cleanup instrumentation.


    const leftoverContexts = [];

    for (const browserType of [playwright.chromium, playwright.firefox, playwright.webkit]) {
      leftoverContexts.push(...browserType._contexts);
      browserType._onDidCreateContext = undefined;
      browserType._onWillCloseContext = undefined;
      browserType._defaultContextOptions = undefined;
    }

    leftoverContexts.forEach(context => context._instrumentation.removeAllListeners());

    for (const context of playwright.request._contexts) context._instrumentation.removeAllListeners();

    const leftoverApiRequests = Array.from(playwright.request._contexts);
    playwright.request._onDidCreateContext = undefined;
    playwright.request._onWillCloseContext = undefined;

    testInfoImpl._onTestFailureImmediateCallbacks.delete(screenshotOnTestFailure);

    const stopTraceChunk = async tracing => {
      // When we timeout during context.close(), we might end up with context still alive
      // but artifacts being already collected. In this case, do not collect artifacts
      // for the second time.
      if (tracing[startedCollectingArtifacts]) return false;
      if (preserveTrace) await tracing.stopChunk({
        path: addTraceAttachment()
      });else if (captureTrace) await tracing.stopChunk();
      return true;
    }; // 5. Collect artifacts from any non-closed contexts.


    await Promise.all(leftoverContexts.map(async context => {
      if (!(await stopTraceChunk(context.tracing))) return;

      if (captureScreenshots) {
        await Promise.all(context.pages().map(async page => {
          if (page[screenshottedSymbol]) return; // Pass caret=initial to avoid any evaluations that might slow down the screenshot
          // and let the page modify itself from the problematic state it had at the moment of failure.

          await page.screenshot({
            timeout: 5000,
            path: addScreenshotAttachment(),
            caret: 'initial'
          }).catch(() => {});
        }));
      }
    }).concat(leftoverApiRequests.map(async context => {
      const tracing = context._tracing;
      await stopTraceChunk(tracing);
    }))); // 6. Either remove or attach temporary traces and screenshots for contexts closed
    // before the test has finished.

    await Promise.all(temporaryTraceFiles.map(async file => {
      if (preserveTrace) await fs.promises.rename(file, addTraceAttachment()).catch(() => {});else await fs.promises.unlink(file).catch(() => {});
    }));
    await Promise.all(temporaryScreenshots.map(async file => {
      if (captureScreenshots) await fs.promises.rename(file, addScreenshotAttachment()).catch(() => {});else await fs.promises.unlink(file).catch(() => {});
    }));
  }, {
    auto: 'all-hooks-included',
    _title: 'playwright configuration'
  }],
  _contextFactory: [async ({
    browser,
    video,
    _artifactsDir
  }, use, testInfo) => {
    const videoMode = normalizeVideoMode(video);
    const captureVideo = shouldCaptureVideo(videoMode, testInfo);
    const contexts = new Map();
    await use(async options => {
      const hook = hookType(testInfo);

      if (hook) {
        throw new Error([`"context" and "page" fixtures are not supported in "${hook}" since they are created on a per-test basis.`, `If you would like to reuse a single page between tests, create context manually with browser.newContext(). See https://aka.ms/playwright/reuse-page for details.`, `If you would like to configure your page before each test, do that in beforeEach hook instead.`].join('\n'));
      }

      const videoOptions = captureVideo ? {
        recordVideo: {
          dir: _artifactsDir(),
          size: typeof video === 'string' ? undefined : video.size
        }
      } : {};
      const context = await browser.newContext({ ...videoOptions,
        ...options
      });
      const contextData = {
        pages: []
      };
      contexts.set(context, contextData);
      context.on('page', page => contextData.pages.push(page));
      return context;
    });
    const prependToError = testInfo.status === 'timedOut' ? formatPendingCalls(browser._connection.pendingProtocolCalls()) : '';
    let counter = 0;
    await Promise.all([...contexts.keys()].map(async context => {
      await context.close();
      const testFailed = testInfo.status !== testInfo.expectedStatus;
      const preserveVideo = captureVideo && (videoMode === 'on' || testFailed && videoMode === 'retain-on-failure' || videoMode === 'on-first-retry' && testInfo.retry === 1);

      if (preserveVideo) {
        const {
          pages
        } = contexts.get(context);
        const videos = pages.map(p => p.video()).filter(Boolean);
        await Promise.all(videos.map(async v => {
          try {
            const savedPath = testInfo.outputPath(`video${counter ? '-' + counter : ''}.webm`);
            ++counter;
            await v.saveAs(savedPath);
            testInfo.attachments.push({
              name: 'video',
              path: savedPath,
              contentType: 'video/webm'
            });
          } catch (e) {// Silent catch empty videos.
          }
        }));
      }
    }));
    if (prependToError) testInfo.errors.push({
      message: prependToError
    });
  }, {
    scope: 'test',
    _title: 'context'
  }],
  _contextReuseEnabled: !!process.env.PW_TEST_REUSE_CONTEXT,
  _reuseContext: async ({
    video,
    trace,
    _contextReuseEnabled
  }, use, testInfo) => {
    const reuse = _contextReuseEnabled && !shouldCaptureVideo(normalizeVideoMode(video), testInfo) && !shouldCaptureTrace(normalizeTraceMode(trace), testInfo);
    await use(reuse);
  },
  context: async ({
    playwright,
    browser,
    _reuseContext,
    _contextFactory
  }, use, testInfo) => {
    if (!_reuseContext) {
      await use(await _contextFactory());
      return;
    }

    const defaultContextOptions = playwright.chromium._defaultContextOptions;
    const context = await browser._newContextForReuse(defaultContextOptions);
    await use(context);
  },
  page: async ({
    context,
    _reuseContext
  }, use) => {
    if (!_reuseContext) {
      await use(await context.newPage());
      return;
    } // First time we are reusing the context, we should create the page.


    let [page] = context.pages();
    if (!page) page = await context.newPage();
    await use(page);
  },
  request: async ({
    playwright,
    _combinedContextOptions
  }, use) => {
    const request = await playwright.request.newContext(_combinedContextOptions);
    await use(request);
    await request.dispose();
  }
});

exports.test = test;

function formatPendingCalls(calls) {
  calls = calls.filter(call => !!call.apiName);
  if (!calls.length) return '';
  return 'Pending operations:\n' + calls.map(call => {
    const frame = call.frames && call.frames[0] ? ' at ' + formatStackFrame(call.frames[0]) : '';
    return `  - ${call.apiName}${frame}\n`;
  }).join('');
}

function formatStackFrame(frame) {
  const file = path.relative(process.cwd(), frame.file) || path.basename(frame.file);
  return `${file}:${frame.line || 1}:${frame.column || 1}`;
}

function hookType(testInfo) {
  var _timeoutManager$_runn, _timeoutManager$_runn2;

  if (((_timeoutManager$_runn = testInfo._timeoutManager._runnable) === null || _timeoutManager$_runn === void 0 ? void 0 : _timeoutManager$_runn.type) === 'beforeAll') return 'beforeAll';
  if (((_timeoutManager$_runn2 = testInfo._timeoutManager._runnable) === null || _timeoutManager$_runn2 === void 0 ? void 0 : _timeoutManager$_runn2.type) === 'afterAll') return 'afterAll';
}

function normalizeVideoMode(video) {
  if (!video) return 'off';
  let videoMode = typeof video === 'string' ? video : video.mode;
  if (videoMode === 'retry-with-video') videoMode = 'on-first-retry';
  return videoMode;
}

function shouldCaptureVideo(videoMode, testInfo) {
  return videoMode === 'on' || videoMode === 'retain-on-failure' || videoMode === 'on-first-retry' && testInfo.retry === 1;
}

function normalizeTraceMode(trace) {
  if (!trace) return 'off';
  let traceMode = typeof trace === 'string' ? trace : trace.mode;
  if (traceMode === 'retry-with-trace') traceMode = 'on-first-retry';
  return traceMode;
}

function shouldCaptureTrace(traceMode, testInfo) {
  return traceMode === 'on' || traceMode === 'retain-on-failure' || traceMode === 'on-first-retry' && testInfo.retry === 1;
}

const kTracingStarted = Symbol('kTracingStarted');
var _default = test;
exports.default = _default;