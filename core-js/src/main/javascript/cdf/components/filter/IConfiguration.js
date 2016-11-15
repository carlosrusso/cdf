/*!
 * Copyright 2002 - 2016 Webdetails, a Pentaho company. All rights reserved.
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
  '../../Logger',
  './strategies',
  './configuration/defaults',
  './configuration/presets'
], function ($, _, Logger, strategies, defaults, presets) {

  'use strict';

  /*
   * Interface mixin for the configuration
   *
   * Processes the public properties of the FilterComponent and generates a configuration object.
   *
   */
  return /** @lends cdf.components.filter.FilterComponent# */ {

    /**
     * Default settings of the component.
     * <pre>
     * <code>
     * {
     *   component: {...}, // Uses defaults
     *     input: {
     *       root: {
     *         isCollapsed: true,
     *         isDisabled: true,
     *         searchPattern: ''
     *       },
     *       indexes: {
     *         id: 0,
     *         label: 1,
     *         parentId: 2,
     *         parentLabel: 3,
     *         value: 4
     *       }
     *     },
     *     output: {
     *       outputFormat: 'lowestId'
     *     }
     * </code>
     * </pre>
     *
     * @type {object}
     */
    defaults: {
      component: defaults,
      input: {
        valueAsId: false,
        valuesArray: null,
        root: {
          isCollapsed: true,
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
      output: {
        trigger: 'apply',
        outputFormat: 'lowestId'
      }
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
      $.extend(true, configuration,
        presets[selectionStrategy],
        {
          component: {
            target: this.placeholder(),
            Root: {
              options: {
                showIcons: cd.showIcons,
                alwaysExpanded: cd.alwaysExpanded,
                showFilter: cd.showFilter,
                useOverlay: cd.useOverlay
              },
              strings: {
                title: cd.title
              }
            },
            Group: {
              options: {
                showIcons: cd.showIcons
              }
            },
            Item: {
              options: {
                showIcons: cd.showIcons
              }
            }
          }
        }
      );

      importLocalizedStrings.call(this, configuration);

      /*
       *  Pagination and Server-side Search
       */

      var _getPage = function(page, searchPattern) {

        var query = this.query;
        var isPaginated = query && query.getOption('pageSize') > 0;
        var searchServerSide = configuration.component.search.serverSide;

        /*
         * Handle empty datasets
         */
        if (!searchServerSide && !isPaginated) {
          return $.when({});
        }

        var deferred = $.Deferred();
        var onSuccess = _.bind(function (data) {

          this.inputDataHandler.updateModel(data);

          deferred.resolve(data);
          return data;
        }, this);

        var onError = _.bind(function () {
          deferred.reject();
        }, this);

        var pattern = _.isEmpty(searchPattern) ? '' : searchPattern;
        query.setSearchPattern(pattern);
        this.model.setBusy(true);
        try {
          switch (page) {
            case 'previous':
              if (query.getOption('page') !== 0) {
                query.previousPage(onSuccess);
              }
              break;
            case 'next':
              query.nextPage(onSuccess);
              break;
            default:
              query.setOption('page', page);
              query.doQuery(onSuccess, onError);
          }
        } catch (_error) {
          deferred.reject({});
        }
        return deferred.always(_.bind(function(){
          this.model.setBusy(false);
        }, this))
      };

      var p  = this.queryDefinition.pageSize;
      var pageSize = _.isFinite(p) ? p : Infinity;
      $.extend(true, configuration.component, {
        pagination: {
          pageSize: pageSize,
          getPage: _.bind(_getPage, this)
        }
      });

      /*
       * Selection strategy
       */
      var limit = _.isNumber(cd.selectionLimit) ? cd.selectionLimit : Infinity;
      configuration.component.selectionStrategy.limit = limit;

      var strategyCfg = configuration.component.selectionStrategy;
      var strategy = new strategies[strategyCfg.type](strategyCfg);
      configuration.component.selectionStrategy.strategy = strategy;

      /*
       * Patches
       */
      if (strategyCfg.type !== 'SingleSelect') {
        var onlyThis = cd.showButtonOnlyThis;
        if (_.isBoolean(onlyThis)) {
          _.each(["Root", "Group", "Item"], function(viewType){
            configuration.component[viewType].options.showButtonOnlyThis = onlyThis;
          });
        }
      }

      this._mapAddInsToConfiguration(configuration);
      return $.extend(true, configuration, _.result(this, 'options'));
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
    _mapAddInsToConfiguration: function (configuration) {
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
              return function($tgt, model, viewModel, configuration) {
                var st = {
                  viewModel: viewModel,
                  model: model,
                  configuration: configuration,
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
        renderRootHeader: 'component.Root.view.renderers.header',
        renderRootSelection: 'component.Root.view.renderers.selection',
        renderRootFooter: 'component.Root.view.renderers.footer',
        renderGroupSelection: 'component.Group.view.renderers.selection',
        renderItemSelection: 'component.Item.view.renderers.selection',
        sortItem: 'component.Item.sorters',
        sortGroup: 'component.Group.sorters',
        outputFormat: 'output.outputFormat'
      };

      _.each(addInList, function (functionList, addInSlot) {
        if (!_.isEmpty(functionList)) {
          setProperty(configuration, addInHash[addInSlot], addInList[addInSlot]);
        }
      });
      return configuration;

    }
  };

  function setProperty(obj, location, value) {
    var address = location.split('.');
    var parentAddress = _.initial(address);
    var childKey = _.last(address);
    var parent = _.reduce(parentAddress, getOrCreateEntry, obj);

    var existingValue = parent[childKey];
    if(_.isArray(value) && _.isArray(existingValue)){
      Array.prototype.push.apply(parent[childKey], value)
    } else {
      parent[childKey] = value;
    }

    function getOrCreateEntry(memo, key) {
      if (memo[key] == null) {
        memo[key] = {};
      }
      return memo[key];
    }
  }

  // Import localized strings, if they are defined in a bundle
  function importLocalizedStrings(configuration) {
    var i18nMap = this.dashboard.i18nSupport.map || {};
    var prop = this.dashboard.i18nSupport.prop;
    _.each(['Root', 'Group', 'Item'], function(viewType) {
      _.each(configuration.component[viewType].strings, function(value, token, list) {
        var fullToken = "filter_" + viewType + "_" + token;
        if (_.has(i18nMap, fullToken)) {
          list[token] = prop(fullToken);
        }
      });
    });
  }

});
