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

  window.countRenders = {};

  /**
   * Map the handlers that are directly relayed to view events,
   * which will be processed by the view's controller.
   *
   * @type {object}
   */
  var relayEvents = {
    onToggleCollapse : 'toggleCollapse',
    onApply: 'control:apply',
    onCancel:'control:cancel'
  };

  var EventsMixin = {};
  _.each(relayEvents, function(viewEvent, viewHandler) {
    this[viewHandler] = function(event) {
      this.trigger(viewEvent, this.model, event);
    };
  }, EventsMixin);

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

      var selectedItems = this.configuration
        .selectionStrategy
        .strategy
        .getSelectedItems(this.model, 'label');

      var children = this.model.children();
      _.extend(viewModel, {
        selectedItems: selectedItems,
        allItemsSelected: this.model.getSelection() === SelectionStates.ALL,
        isPartiallySelected: this.model.getSelection() === SelectionStates.SOME,
        noItemsSelected: this.model.getSelection() === SelectionStates.NONE,
        numberOfChildren: children ? children.length : 0
      });

      return viewModel;
    },

    render: function(){
      var viewModel = this.base();
      this.renderCollapse(viewModel);
    },

    renderSkeleton: function(viewModel) {
      this.base(viewModel);

      if (this.config.options.isResizable) {
        var $container = this.$(this.config.view.slots.children).parent();
        if (_.isFunction($container.resizable)) {
          $container.resizable({
            handles: 's'
          });
        }
      }
    },

    updateFilter: function() {
      var text = this.model.root().get('searchPattern');
      this.$(this.config.view.slots.filter).val(text);
    },

    /*
     * Children management
     */
    getChildren: function() {
      return this.$(this.config.view.slots.children).children();
    },

    /**
     * Renders a list of (child) views using the specified order
     *
     * @param {Array.<cdf.components.filter.views.Abstract>} childViews
     */
    setChildren: function(childViews) {
      var currentNodes = this.getChildren();
      var futureNodes = childViews.map(function(view) {
        return view.$el.get(0);
      });

      if( _.isEqual(currentNodes.toArray(), futureNodes)) {
        return;
      }

      var $nursery = this.$(this.config.view.slots.children);
      $nursery.hide();
      currentNodes.detach();
      $nursery.append(childViews.map(function(view) {
        return view.$el;
      }));
      $nursery.show();
    },

    createChildNode: function () {
      var $child = $(this.getHtml(this.config.view.templates.child, {}));
      var $target = this.$(this.config.view.slots.children);
      $child.appendTo($target);
      return $child;
    },

    /*
     * Scrollbar methods
     */
    updateScrollBar: function () {
      var isPaginated = _.isFinite(this.configuration.pagination.pageSize) && this.configuration.pagination.pageSize > 0;
      var isOverThreshold = this.model.flatten().size().value() > this.config.options.scrollThreshold;

      if (isPaginated || isOverThreshold) {
        this._addScrollBar();
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

  }).extend(EventsMixin);

});
