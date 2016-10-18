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
  '../../../Logger',
  '../HtmlUtils'
], function($, _, BaseEvents, Logger, HtmlUtils) {

  "use strict";

  /**
   * @class cdf.components.filter.data-handlers.InputDataHandler
   * @amd cdf/components/filter/data-handlers/InputDataHandler
   * @extends cdf.lib.BaseEvents
   * @classdesc Import data from multiple sources, populate the model.
   * @ignore
   */
  return BaseEvents.extend(/** @lends cdf.components.filter.data-handlers.InputDataHandler# */{

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
      if (options.root && options.root.id) {
        model.set('id', options.root.id);
      }

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

      var data;
      var hasGroups = _.isFinite(parentIndexes) && parentIndexes < rows[0].length;
      if (hasGroups) {
        var groupedRows = _.groupBy(rows, function(row) {
            return row[indexes.parentId];
          });

        // Generate a flat map of groups
        var root = {};
        var createGroup = groupGenerator(indexes, pageData);
        _.each(groupedRows, function(rows, groupId) {
          root[groupId] = createGroup(rows, groupId);
        });

        // Assemble the tree by placing the groups in the correct place
        _.each(_.values(root), function(group){
          _.each(group.nodes, function(node){
            var id = node.id;
            if(_.has(root, id)){
              $.extend(node, root[id]);
              delete root[id];
            }
          });
        });

        data = _.values(root);

      } else {
        data = itemGenerator(indexes, pageData)(rows);
      }

      this.model.add(data);
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
    var pageData = {};
    if ((queryInfo != null ? queryInfo.pageStart : void 0) != null) {
      pageData = {
        page: Math.floor(parseInt(queryInfo.pageStart) / pageSize)
      };
    }
    return pageData;
  }

  function itemGenerator(idx, pageData) {
    if (!_.isObject(pageData)) {
      pageData = {};
    }
    var idxId = idx.id;
    var idxLabel = idx.label;

    var idxValue = idx.value;
    var hasValue = _.isFinite(idxValue) && idxValue >= 0;

    var createItems = function(rows) {
      return _.map(rows, function(row) {
        var itemData = {
          id: row[idxId],
          label: sanitizeInput(row[idxLabel])
        };
        if (hasValue) {
          itemData.value = sanitizeInput(row[idxValue]);
        }
        itemData = $.extend(true, itemData, pageData);
        return itemData;
      });
    };
    return createItems;
  };

  function groupGenerator(idx, pageData) {
    var createGroup = function(rows, group) {

      var label = _.chain(rows)
        .pluck(idx.parentLabel)
        .compact()
        .first()
        .value();

      var id = rows[0][idx.parentId];

      return {
        id: group != null ? id : void 0,
        label: label || id,
        nodes: itemGenerator(idx, pageData)(rows)
      };
    };
    return createGroup;
  };

});
