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
      this.options = spec.options || {};
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

      var indexes = this.options.indexes;
      var parentIndexes = _.chain(indexes)
        .pick('parentId', 'parentLabel')
        .filter(_.isFinite)
        .max()
        .value();

      var normalizers = _.extend({}, defaultNormalizers, this.options.normalizers);
      var data;
      var hasGroups = _.isFinite(parentIndexes) && parentIndexes < rows[0].length;
      if (hasGroups) {
        var groupedRows = _.groupBy(rows, function(row) {
            return row[indexes.parentId];
          });

        // Generate a flat map of groups
        var root = {};
        var createGroup = groupGenerator(indexes, normalizers, pageData);
        _.each(groupedRows, function(rows, groupId) {
          root[groupId] = createGroup(rows, groupId);
        });

        // Assemble the tree by placing the groups in the correct place
        _.each(_.values(root), function(group) {
          _.each(group.nodes, function(node) {
            var id = node.id;
            if (_.has(root, id)) {
              var label = node.label;
              _.extend(node, root[id]);
              node.label = label; // restore the group's label
              delete root[id];
            }
          });
        });

        data = _.values(root);

      } else {
        data = itemGenerator(indexes, normalizers, pageData)(rows);
      }

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

  function itemGenerator(idx, normalizers,pageData) {
    if (!_.isObject(pageData)) {
      pageData = {};
    }
    return function createItems(rows) {
      return _.map(rows, function(row) {

        var N = row.length;
        var itemData = _.reduce(idx, function(memo, k, field) {

          var isValidIdx = _.isFinite(k) && k >= 0 && k < N;
          if (isValidIdx && !_.contains(['parentId', 'parentLabel'], field)) {
            var normalizer = normalizers[field];
            memo[field] = normalizer ? normalizer(row[k]) : row[k];
          }

          return memo;
        }, {});

        return $.extend(true, itemData, pageData);
      });
    };
  }

  function groupGenerator(idx, normalizers, pageData) {
    return function createGroup(rows, group) {

      var label = _.chain(rows)
        .pluck(idx.parentLabel)
        .filter(_.isString)
        .compact()
        .first()
        .value();

      var id = rows[0][idx.parentId];

      return {
        id: group != null ? id : void 0,
        label: label || id,
        nodes: itemGenerator(idx, normalizers, pageData)(rows)
      };
    };
  }

});
