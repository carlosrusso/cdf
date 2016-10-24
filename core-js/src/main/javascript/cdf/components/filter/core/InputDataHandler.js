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
  '../../../lib/jquery',
  'amd!../../../lib/underscore',
  '../../../lib/BaseEvents',
  './Model',
  '../../../Logger',
  '../HtmlUtils'
], function($, _, BaseEvents, Model, Logger, HtmlUtils) {

  "use strict";

  /**
   * @class cdf.components.filter.core.InputDataHandler
   * @amd cdf/components/filter/core/InputDataHandler
   * @extends cdf.lib.BaseEvents
   * @classdesc Import data from multiple sources, populate the model.
   * @ignore
   */

  var SelectionStates = Model.SelectionStates;

  var defaultNormalizers = {
    label: sanitizeInput,
    value: sanitizeInput,
    isSelected: function(v) {
      if (_.isNull(v)) {
        return SelectionStates.SOME;
      } else if (_.isString(v)) {
        switch (v.toLowerCase()) {
          case "true":
            return SelectionStates.ALL;
          case "null":
            return SelectionStates.SOME;
          default:
            return SelectionStates.NONE;
        }
      } else {
        return Boolean(v) ? SelectionStates.ALL : SelectionStates.NONE;
      }
    }
  };

  return BaseEvents.extend(/** @lends cdf.components.filter.core.InputDataHandler# */{

    constructor: function(spec) {
      this.model = spec.model;
      this.options = _.extend({
        normalizers: defaultNormalizers
      }, spec.options);
    },
    /**
     * Import data into the MVC model, eventually inferring the data format.
     *
     * @param {CDAJson|Array} whatever
     * @return {this}
     */
    updateModel: function(whatever) {
      if (this._isCdaJson(whatever)) {
        this._updateModelFromCdaJson(whatever);
      } else if (_.isArray(whatever)) {
        this._updateModelFromBidimensionalArray(whatever);
      } else {
        this._updateModelFromJson(whatever);
      }

      var model = this.model;
      var options = this.options;

      if (options.hooks && options.hooks.postUpdate) {
        _.each(options.hooks.postUpdate, function(hook) {
          return hook.call(null, null, model, options);
        });
      }

      this.trigger('postUpdate', model);
    },

    _updateModelFromCdaJson: function(json) {
      var query = this.options.query;
      var queryInfo = json.queryInfo;

      var pageData = getPageData(queryInfo, query.getOption('pageSize'));

      this._addDataToModel(json.resultset, pageData);

      if (queryInfo && queryInfo.pageStart) {
        var numberOfItems = parseInt(queryInfo.totalRows);
        var searchPattern = query.getOption('searchPattern');
        if (_.isEmpty(searchPattern)) {
          this.model.set('numberOfItemsAtServer', numberOfItems);
        }
      }
    },

    _updateModelFromJson: function(anyJsonObject) {
    },

    _updateModelFromBidimensionalArray: function(rows) {
      this._addDataToModel(rows, undefined);
    },

    _addDataToModel: function(rows, pageData) {
      if (rows.length === 0) {
        return;
      }
      var options = this.options;
      var indexes = options.indexes;

      var hierarchy;
      if (_.isArray(indexes)) {
        hierarchy = indexes;
      } else {
        hierarchy = [];

        if (_.has(indexes, 'parentId')) {
          var parentId = indexes.parentId;
          var isValidParent = _.isNumber(parentId) && parentId >= 0 && parentId < rows[0].length;
          if (isValidParent)
            hierarchy.push({
              id: indexes.parentId,
              label: indexes.parentLabel
            });
        }
        hierarchy.push(_.omit(indexes, ['parentId', 'parentLabel']));
      }

      if(options.valueAsId === true){
         _.each(hierarchy, function(levelStructure){
          levelStructure.id = levelStructure.label;
        });
      }

      var data = nestedGroupBy(rows, hierarchy, options, pageData);

      // Attempt to insert nodes at pre-existent parents
      _.each(data, function(node) {
        var insertionNode = this.model.find(node.id);
        if (insertionNode) {
          insertionNode.load(node.nodes);
        } else {
          this.model.load(node);
        }
      }, this);

    },

    _isCdaJson: function(obj) {
      return _.isObject(obj) && _.isArray(obj.resultset);
    },

    /**
     * Matches the items against a list and marks the matches as selected.
     *
     * @param {Array} selectedItems Array containing the ids of the selected items.
     */
    setValue: function(selectedItems) {
      if(selectedItems == null){
        this.model.updateSelectedItems();
        return;
      }
      this.model.setSelectedItems(selectedItems);
      this.trigger('setValue', selectedItems);
    }
  });

  function sanitizeInput(input) {
    return _.isString(input) ?
      HtmlUtils.sanitizeHtml(input) :
      input;
  }

  function getPageData(queryInfo, pageSize) {
    if ((queryInfo != null ? queryInfo.pageStart : void 0) != null) {
      return {
        page: Math.floor(parseInt(queryInfo.pageStart) / pageSize)
      };
    }
    return {};
  }

  function nestedGroupBy(rows, indexes, options, payload) {
    if (!indexes.length) {
      return null;
    }

    var groupIndexes = indexes[0];
    var groupings = _.groupBy(rows, groupIndexes.id);

    return _.map(groupings, function(groupedRows, groupId) {
      var row = groupedRows[0];
      var N = row.length;
      var node = _.reduce(_.omit(groupIndexes, 'id'), function(memo, k, field) {

        var isValidIdx = _.isNumber(k) && k >= 0 && k < N;
        if (isValidIdx) {
          var normalizer = options.normalizers[field];
          memo[field] = normalizer ? normalizer(row[k]) : row[k];
        }

        return memo;
      }, {
        id: groupId
      });

      var nodes = nestedGroupBy(groupedRows, indexes.slice(1), options, payload);
      if (nodes) {
        node.nodes = nodes;
      }
      node.label = node.label || node.id;
      _.extend(node, payload);

      return node;
    });
  }


});
