"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.types = exports.traverse = exports.parse = exports.declare = exports.codeFrameColumns = exports.babelTransform = void 0;

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
const codeFrameColumns = require('./babelBundleImpl').codeFrameColumns;

exports.codeFrameColumns = codeFrameColumns;

const declare = require('./babelBundleImpl').declare;

exports.declare = declare;

const types = require('./babelBundleImpl').types;

exports.types = types;

const parse = require('./babelBundleImpl').parse;

exports.parse = parse;

const traverse = require('./babelBundleImpl').traverse;

exports.traverse = traverse;

const babelTransform = require('./babelBundleImpl').babelTransform;

exports.babelTransform = babelTransform;