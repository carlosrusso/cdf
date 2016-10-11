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
  '../../lib/jquery',
  'amd!../../lib/underscore',
  'amd!../../lib/backbone',
  '../UnmanagedComponent',
  '../../Logger',
  './BaseFilter',
  './addIns',
  'css!./styles/filter'
], function ($, _, Backbone, UnmanagedComponent, Logger, BaseFilter) {

  /*
   * Über-filter: one filter to rule them all
   */

  /*
   * Interface Mixin for a filter
   */
  var IFilter = /** @lends cdf.components.filter.FilterComponent# */ {

    /**
     * Gets the current selection state.
     *
     * @return {Array} List of strings containing the IDs of the selected items,
     *                 in the same format as they would be written to the parameter.
     */
    getValue: function () {
      return this._value;
    },

    /**
     * Updates the selection state of the filter.
     *
     * @param {Array} value List of strings containing the IDs of the selected items,
     *                      which will be written to the parameter.
     * @return {this}
     */
    setValue: function (value) {
      this.inputDataHandler.setValue(value);
      return this;
    },

    /**
     * Implement's CDF logic for updating the state of the parameter, by
     * invoking the dashboard's {@link cdf.dashboard.Dashboard#processChange|processChange} function.
     *
     * @param {Array} value List of strings containing the IDs of the selected items,
     *                      in the same format as they would be written to the parameter.
     * @return {this}
     */
    processChange: function (value) {
      this._value = value;
      this.dashboard.processChange(this.name);
      return this;
    }
  };

  /*
   * Interface mixin for the configuration
   */
  var IConfiguration = /** @lends cdf.components.filter.FilterComponent# */ {

    /**
     * Default settings of the component.
     * <pre>
     * <code>
     * {
         *   component: {}, // Uses BaseFilter defaults
         *   input: {
         *     defaultModel: {
         *      isDisabled: true
         *     },
         *     indexes: { // layout of the data: column indexes
         *       id: 0,
         *       label: 1,
         *       parentId: 2,
         *       parentLabel: 3,
         *       value: undefined
         *     }
         *   },
         *   output: {}
         * }
     * </code>
     * </pre>
     *
     * @type {object}
     */
    defaults: {
      component: BaseFilter.defaults,
      input: {
        defaultModel: {
          isDisabled: true,
          searchPattern: ''
        },
        indexes: {
          id: 0,
          label: 1,
          parentId: 2,
          parentLabel: 3,
          value: 4
        }
      },
      output: {}
    },

    /**
     * Collate and conciliate settings from the following origins:
     * <ul>
     *   <li>component's {@link cdf.components.FilterComponent#defaults|defaults}</li>
     *   <li>properties set by the user at design time, via the CDE interface</li>
     *   <li>options programmatically defined at run time</li>
     * </ul>
     *
     * @return {object} Returns a configuration object.
     */
    getConfiguration: function() {

      var configuration = $.extend(true, {}, _.result(this, 'defaults'));

      /*
       *  Add input/output options to configuration object
       */
      $.extend(true, configuration.input, this.componentInput, {
        query: this.query
      });
      $.extend(true, configuration.output, this.componentOutput);


      /*
       *  Configure the views
       */
      var cd = this.componentDefinition;
      var selectionStrategy = cd.multiselect ? 'LimitedSelect' : 'SingleSelect';
      $.extend(true, configuration.component,
        BaseFilter.Enum.selectionStrategy[selectionStrategy],
        {
          target: this.placeholder(),
          Root: {
            options: {
              styles: cd.showIcons ? [] : ['no-icons'],
              alwaysExpanded: cd.alwaysExpanded,
              showFilter: cd.showFilter,
              useOverlay: cd.useOverlay
            },
            strings: {
              title: cd.title
            }
          }
        }
      );

      // Import localized strings, if they are defined in a bundle
      var i18nMap = this.dashboard.i18nSupport.map || {};
      var prop = this.dashboard.i18nSupport.prop;
      _.each(['Root', 'Group', 'Item'], function(level) {
        _.each(configuration.component[level].strings, function(value, token, list) {
          var fullToken = "filter_" + level + "_" + token;
          if (_.has(i18nMap, fullToken)) {
            list[token] = prop(fullToken);
          }
        });
      });


      /*
       *  Pagination and Server-side Search
       */

      var _getPage = function(page, searchPattern) {
        var deferred = $.Deferred();

        var query = this.query;
        var isPaginated = !!query && query.getOption('pageSize') > 0;
        var searchServerSide = configuration.component.search.serverSide;

        /*
         * Handle empty datasets
         */
        if (!searchServerSide && !isPaginated) {
          deferred.resolve({});
          return deferred;
        }

        var successCallback = _.bind(function (data) {
          this.inputDataHandler.updateModel(data);
          this.model.setBusy(false);
          deferred.resolve(data);
          return data;
        }, this);

        var errorCallback = _.bind(function () {
          this.model.setBusy(false);
          deferred.reject();
        }, this);

        this.model.setBusy(true);
        var pattern = _.isEmpty(searchPattern) ? '' : searchPattern;
        query.setSearchPattern(pattern);
        try {
          switch (page) {
            case 'previous':
              if (query.getOption('page') !== 0) {
                query.previousPage(successCallback);
              }
              break;
            case 'next':
              query.nextPage(successCallback);
              break;
            default:
              query.setOption('page', page);
              query.doQuery(successCallback, errorCallback);
          }
        } catch (_error) {
          deferred.reject({});
          this.model.setBusy(false);
        }
        return deferred;
      };

      var p  = this.queryDefinition.pageSize;
      var pageSize = (p && _.isFinite(p)) ? p : Infinity;
      $.extend(true, configuration.component, {
        pagination: {
          pageSize: pageSize,
          getPage: _.bind(_getPage, this)
        }
      });

      /*
       * Selection strategy
       */
      $.extend(true, configuration.component, {
        selectionStrategy: {
          limit: _.isNumber(cd.selectionLimit) ? cd.selectionLimit : Infinity
        }
      });

      var selectionStrategyConfig = configuration.component.selectionStrategy;
      var strategy = new BaseFilter.SelectionStrategies[selectionStrategyConfig.type](selectionStrategyConfig);
      configuration.component.selectionStrategy.strategy = strategy;

      /*
       * Patches
       */
      if (selectionStrategyConfig.type !== 'SingleSelect') {
        var onlyThis = cd.showButtonOnlyThis;
        if (_.isBoolean(onlyThis)) {
          configuration.component.Root.options.showButtonOnlyThis = onlyThis;
          configuration.component.Group.options.showButtonOnlyThis = onlyThis;
          configuration.component.Item.options.showButtonOnlyThis = onlyThis;
        }
      }

      return $.extend(true, configuration, this._mapAddInsToConfiguration(), _.result(this, 'options'));
    },

    /**
     * List of add-ins to be processed by the component
     * <pre>
     * <code>
     * {
     *   postUpdate:  [], // e.g. 'accordion'
     *   renderRootHeader: [],
     *   renderRootSelection: [], // e.g. ['sumSelected', 'notificationSelectionLimit']
     *   renderRootFooter: [],
     *   renderGroupHeader: [],
     *   renderGroupSelection:[],
     *   renderGroupFooter: [],
     *   renderItemSelection: [],
     *   sortGroup: [],
     *   sortItem: []
     * }
     * </pre>
     * </code>
     *
     * @property {object} addIns
     * @ignore
     */

    /**
     * Maps the add-ins to the component configuration.
     *
     * @return {*|Array} The result of executing the add-in,
     *                   or the array of slot-addIns pair values.
     * @private
     */
    _mapAddInsToConfiguration: function () {
      /*
       * Traverse the list of declared addIns,
       * Get the addIns, the user-defined options, wrap this into a function
       * Create a hash map { slot: [ function($tgt, model, options) ]}
       */
      var that = this;
      var addInList = _.chain(this.addIns)
        .map(function(list, slot) {
          var addIns = _.chain(list)
            .map(function(name) {
              var addInName = name.trim();
              var addIn = that.getAddIn(slot, addInName);
              if (addIn == null) {
                return null;
              }

              var addInOptions = that.getAddInOptions(slot, addInName);
              return function($tgt, model, options) {
                var st = {
                  model: model,
                  configuration: options,
                  dashboard: that.dashboard
                };
                return addIn.call($tgt, st, addInOptions);
              };

            })
            .compact()
            .value();
          return [slot, addIns];
        })
        .object()
        .value();

      /*
       * Place the functions in the correct location in the configuration object
       */
      var addInHash = {
        postUpdate: 'input.hooks.postUpdate',
        renderRootHeader: 'component.Root.renderers.header',
        renderRootSelection: 'component.Root.renderers.selection',
        renderRootFooter: 'component.Root.renderers.footer',
        renderGroupSelection: 'component.Group.renderers.selection',
        renderItemSelection: 'component.Item.renderers.selection',
        sortItem: 'component.Item.sorter',
        sortGroup: 'component.Group.sorter',
        outputFormat: 'output.outputFormat'
      };

      var configuration = {};
      _.each(addInList, function (functionList, addInSlot) {
        if (!_.isEmpty(functionList)) {
          setProperty(configuration, addInHash[addInSlot], addInList[addInSlot]);
        }
      });
      return configuration;

    }
  };

  /**
   * @class cdf.components.filter.FilterComponent
   * @extends cdf.components.UnmanagedComponent
   * @amd cdf/components/FilterComponent
   * @classdesc An intuitive Filter Component with many out-of-the-box features:
   *   <ul>
   *     <li>pluggable selection logic: single-, multi-, and limited-select</li>
   *     <li>automatic handling of groups of options</li>
   *     <li>searchable</li>
   *     <li>extensible via addIns</li>
   *   </ul>
   * @ignore
   */
  return UnmanagedComponent.extend(IFilter).extend(IConfiguration).extend(/** @lends cdf.components.filter.FilterComponent# */{
    /**
     * Object responsible for storing the MVC model, which contains both the data and the state of the component.
     *
     * @type {SelectionTree}
     */
    model: void 0,

    /**
     * Object responsible for managing the MVC hierarchy of views and controllers associated with the model.
     *
     * @type {Manager}
     */
    manager: void 0,

    /**
     * Object that handles writing to the MVC model.
     *
     * @type {Input}
     */
    inputDataHandler: void 0,

    /**
     * Object that handles reading from the MVC model.
     *
     * @type {Output}
     */
    outputDataHandler: void 0,
    update: function () {
      this.getData()
        .then(_.bind(function(data) {
          this.initialize();
          return data;
        }, this), _.bind(this.onDataFail, this))
        .then(_.bind(this.onDataReady, this));
      return this;
    },
    close: function () {
      if (this.manager != null) {
        this.manager.empty();
      }
      if (this.model != null) {
        this.model.stopListening().off();
      }
      return this.stopListening();
    },

    /**
     * Initialize the component by creating new instances of the main objects:
     * <ul>
     *   <li>model</li>
     *   <li>MVC manager</li>
     *   <li>input data handler</li>
     *   <li>output data handler</li>
     * </ul>
     *
     * @return {Promise} Returns a $.Deferred().promise() object.
     */
    initialize: function () {

      /*
       * Transform user-defined CDF settings to our own configuration object
       */
      var configuration = this.getConfiguration();
      this.close();

      /*
       * Initialize our little MVC world
       */
      this.model = new BaseFilter.Models.SelectionTree(configuration.input.defaultModel);
      this.model.set('matcher', configuration.component.search.matcher);

      this.manager = new BaseFilter.Controllers.Manager({
        model: this.model,
        configuration: configuration.component
      });

      /*
       * Initialize the CDF interface
       */
      this.inputDataHandler = new BaseFilter.DataHandlers.Input({
        model: this.model,
        options: configuration.input
      });
      this.outputDataHandler = new BaseFilter.DataHandlers.Output({
        model: this.model,
        options: configuration.output
      });
      this.listenTo(this.outputDataHandler, 'changed', this.processChange);

      return configuration;
    },

    /**
     * Abstract the origin of the data used to populate the component.
     * Precedence order for importing data: query -> parameter -> valuesArray
     *
     * @return {Promise} Returns promise that is fulfilled when the data is available.
     */
    getData: function () {
      var deferred = new $.Deferred();
      if (!_.isEmpty(this.dashboard.detectQueryType(this.queryDefinition))) {
        var queryOptions = {
          ajax: {
            error: function () {
              deferred.reject({});
              return Logger.log("Query failed", 'debug');
            }
          }
        };
        var queryDataCallback = _.bind(function (data) {
          deferred.resolve(data);
        }, this);
        this.triggerQuery(this.queryDefinition, queryDataCallback, queryOptions);
      } else {
        if (this.componentInput.inputParameter && !_.isEmpty(this.componentInput.inputParameter)) {
          var paramDataCallback = _.bind(function () {
            var data = this.dashboard.getParameterValue(this.componentInput.inputParameter);
            deferred.resolve(data);
          }, this);
          this.synchronous(paramDataCallback, null);
        } else {
          var staticDataCallback = _.bind(function () {
            deferred.resolve(this.componentInput.valuesArray);
          }, this);
          this.synchronous(staticDataCallback, null);
        }
      }
      return deferred.promise();
    },

    /*
     * Launch an event equivalent to postExecution
     */

    onDataReady: function (data) {
      this.inputDataHandler.updateModel(data);
      if (this.parameter) {
        var currentSelection = this.dashboard.getParameterValue(this.parameter);
        this.setValue(currentSelection);
      }

      this.trigger('getData:success');
      return this;
    },

    onDataFail: function (reason) {
      Logger.log('Component failed to retrieve data: ' + reason, 'debug');
      this.trigger('getData:failed');
      return this;
    }
  }, {
    help: function () {
      return "Filter component";
    }
  });

  // auxiliary functions

  function setProperty(obj, location, value) {
    var address = location.split('.');
    var parentAddress = _.initial(address);
    var childKey = _.last(address);
    var parent = _.reduce(parentAddress, getOrCreateEntry, obj);
    parent[childKey] = value;

    function getOrCreateEntry(memo, key) {
      if (memo[key] == null) {
        memo[key] = {};
      }
      return memo[key];
    }
  }


});
