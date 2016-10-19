/*!
 * Copyright 2002 - 2015 Webdetails, a Pentaho company. All rights reserved.
 *
 * This software was developed by Webdetails and is provided under the terms
 * of the Mozilla Public License, Version 2.0, or any later version. You may not use
 * this file except in compliance with the license. If you need a copy of the license,
 * please go to http://mozilla.org/MPL/2.0/. The Initial Developer is Webdetails.
 *
 * Software distributed under the Mozilla Public License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. Please refer to
 * the license for the specific language governing your rights and limitations.
 */

define([
  './models/SelectionTree',
  './views/Views',
  './controllers/Manager',
  './strategies/AbstractSelect',
  './strategies/LimitedSelect',
  './strategies/MultiSelect',
  './strategies/SingleSelect',
  './data-handlers/InputDataHandler',
  './data-handlers/OutputDataHandler',
  './base/templates',
  './base/defaults',
  './base/presets'
], function (
  SelectionTree,
  Views,
  Manager,
  AbstractSelect, LimitedSelect, MultiSelect, SingleSelect,
  Input, Output,
  templates,
  defaults,
  presets
) {

  /*
   * Schmiede, mein Hammer, ein hartes Schwert!
   */

  /**
   * @class  cdf.components.filter.BaseFilter
   * @amd cdf/components/filter/BaseFilter
   * @classdesc MVC-based tree-like filter that supports
   * <ul>
   *   <li>multiple nested groups</li>
   *   <li>server-side pagination and searching</li>
   * </ul>
   * @ignore
   */
  return /** @lends cdf.components.filter.BaseFilter */ {

    /**
     * MVC Models used internally to represent and manipulate information
     */
    Models: {
      SelectionTree: SelectionTree
    },

    /**
     * MVC views that listen to changes in a model and trigger events that will eventually be handled by a Controller
     */
    Views: Views,

    /**
     * Set of Controllers responsible for handling the interaction between views and models
     */
    Controllers: {
      Manager: Manager
    },

    /**
     * Controller-like set of classes design to encapsulate the selection strategy
     * and isolate that "business" logic from lower-level view interaction logic.
     *
     * These classes are singletons passed as part of the configuration objects.
     */
    SelectionStrategies: {
      AbstractSelect: AbstractSelect,
      LimitedSelect: LimitedSelect,
      MultiSelect: MultiSelect,
      SingleSelect: SingleSelect
    },

    /**
     * The MVC component consumes data in a specific format.
     * As such, it requires classes that:
     * <ul>
     *   <li> Import data to the filter</li>
     *   <li> Export the selection model</li>
     * </ul>
     */
    DataHandlers: {
      Input: Input,
      Output: Output
    },

    defaults: defaults,
    presets: presets,
    templates: templates
  };
});
