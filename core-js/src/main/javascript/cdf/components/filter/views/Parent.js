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
  '../../../lib/jquery',
  'amd!../../../lib/underscore',
  './Abstract',
  '../core/Model',
  './scrollbar/ScrollBarFactory'
], function ($, _, AbstractView, Model, ScrollBarFactory) {

  "use strict";

  var SelectionStates = Model.SelectionStates;

  /**
   * @class cdf.components.filter.views.Parent
   * @amd cdf/components/filter/views/Parent
   * @classdesc Abstract base class for all Views that have children
   * @extends cdf.components.filter.views.Abstract
   * @extends Backbone.View
   * @ignore
   */

  /**
   * Map the handlers that are directly relayed to view events,
   * which will be processed by the view's controller.
   *
   * @type {object}
   */

  return AbstractView.extend(/** @lends cdf.components.filter.views.Abstract# */{

    initialize: function(options) {
      this.base(options);

      var that = this;
      this.on('scroll:reached:top', function(){
        that.saveScrollBar(1);
      });
      this.on('scroll:reached:bottom', function(){
        that.saveScrollBar(-1);
      });

      this.updateScrollBar();
    },

    bindToModel: function(model) {
      this.base(model);

      var that = this;
      this.listenTo(model, 'update', function() {
        that.updateScrollBar();
      });
    },

    /*
     * View methods
     */
    getViewModel: function () {
      var viewModel = this.base();

      // lazy evaluation of viewModel properties
      var that = this;
      var selectedItems = _.memoize(function(){
        return that.configuration
          .selectionStrategy
          .strategy
          .getSelectedItems(that.model, 'label');
      });

      var modelSelection = this.model.getSelection();
      var isPartiallySelected = (modelSelection === SelectionStates.SOME);
      var allItemsSelected = (modelSelection === SelectionStates.ALL);
      var noItemsSelected = (modelSelection === SelectionStates.NONE);

      var selectionState = "none-selected";
      if(allItemsSelected) {
        selectionState = "all-selected"
      } else if(isPartiallySelected){
        selectionState = "some-selected"
      }

      var children = this.model.children();
      _.extend(viewModel, {
        selectedItems: selectedItems,
        numberOfChildren: children ? children.length : 0,
        selectionState: selectionState,

        isPartiallySelected: isPartiallySelected,
        allItemsSelected: allItemsSelected,
        noItemsSelected: noItemsSelected
      });

      return viewModel;
    },

    updateFilter: function() {
      var $filter = this.$slots.filter;
      var v = $filter.val();
      var text = this.model.root().get('searchPattern');
      if(v !== text){
        $filter.val(text);
      }
    },

    /*
     * Children management
     */
    getChildren: function() {
      return this.$slots.children.children();
    },

    /**
     * Renders a list of (child) views using the specified order
     *
     * @param {Array.<cdf.components.filter.views.Abstract>} childViews
     */
    setChildren: function(childViews) {
      var currentNodes = this.getChildren();

      var elems = [];
      var futureNodes = childViews.map(function(view) {
        var $el = view.$el;
        elems.push($el.get(0));
        return $el;
      });

      if( _.isEqual(currentNodes.toArray(), elems)) {
        return;
      }

      var $nursery = this.$slots.children;
      //$nursery.hide();
      $nursery.toggleClass('filter-hidden', true);
      currentNodes.detach();
      $nursery.append(futureNodes);
      //$nursery.show();
      $nursery.toggleClass('filter-hidden', false);
    },

    createChildNode: function () {
      var $child = $(this.getHtml(this.config.view.templates.child, {}));
      $child.appendTo(this.$slots.children);
      return $child;
    },

    hide: function(){
      if(this._hiddenChildren){
        return;
      }
      this._hiddenChildren = this.getChildren().detach();
      this.isHidden = true;
    },

    show: function() {
      if(!this._hiddenChildren){
        return;
      }
      this.$slots.children.append(this._hiddenChildren);
      this._hiddenChildren = null;
      this.isHidden = false;
    },


    /*
     * Scrollbar methods
     */
    updateScrollBar: function () {
      var pageSize = this.configuration.pagination.pageSize;
      var isPaginated = _.isFinite(pageSize) && pageSize > 0;

      if (isPaginated) {
        this._addScrollBar();
      } else {
        var isOverThreshold = this.model.count() > this.config.options.scrollThreshold;
        if(isOverThreshold){
          this._addScrollBar();
        }
      }
      this.restoreScrollBar();
    },

    _addScrollBar: function () {
      if (this._scrollBar != null) {
        return;
      }

      if (!this.config.view.scrollbar) {
        return;
      }

      var that = this;
      ScrollBarFactory
        .createScrollBar(this.config.view.scrollbar.engine, this)
        .then(function(scrollBar) {
          that._scrollBar = scrollBar;
        });
    },

    restoreScrollBar: function() {
      if (this._scrollBar) {
        this._scrollBar.restorePosition();
      }
    },

    saveScrollBar: function(position) {
      if (this._scrollBar) {
        this._scrollBar.savePosition(position);
      }
    },

    /*
     * Events triggered by the user
     */

    onFilterChange: function (event) {
      var text = $(event.target).val();
      if(event.keyCode === 27){
        this.onFilterClear();
      } else {
        this.trigger('filter', this.model, text);
      }
    },

    onFilterClear: function () {
      this.trigger('filter', this.model, '');
    }

  });

});
