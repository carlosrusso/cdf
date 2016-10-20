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
  './Parent'
], function ($, _, ParentView) {

  "use strict";

  /**
   * @class cdf.components.filter.views.Root
   * @amd cdf/components/filter/views/Root
   * @extends cdf.components.filter.views.Parent
   * @classdesc Root View. The part of the filter that remains visible
   *   when the filter is collapsed.
   * @ignore
   */
  return ParentView.extend(/** @lends cdf.components.filter.views.Root# */{
    /**
     * View type.
     *
     * @const
     * @type {string}
     */
    type: 'Root',

    /**
     * Default event mappings.
     *
     * @type {object}
     */
    events: {
      'click     .filter-root-header:eq(0)': 'onToggleCollapse',
      'click     .filter-root-selection:eq(0)': 'onSelection',
      'click     .filter-btn-apply:eq(0)': 'onApply',
      'click     .filter-btn-cancel:eq(0)': 'onCancel',
      'mouseover .filter-root-header': 'onMouseOver',
      'mouseout  .filter-root-header': 'onMouseOut',
      'keyup   .filter-filter:eq(0)': 'onFilterChange',
      'change  .filter-filter:eq(0)': 'onFilterChange',
      'click  .filter-filter-clear:eq(0)': 'onFilterClear',
      'click  .filter-overlay': 'onOverlayClick'
    },

    initialize: function (options) {
      this.renderOverlay = this._renderSlot('overlay');
      this.renderHeader = this._renderSlot('header');
      this.renderFooter = this._renderSlot('footer');
      this.renderControls = this._renderSlot('controls');
      this.base(options);
    },

    bindToModel: function (model) {
      this.base(model);
      this.onChange(model, 'isCollapsed', this.updateCollapse);
      this.onChange(model, 'isSelected numberOfSelectedItems numberOfItems reachedSelectionLimit', this.updateHeader);
      this.onChange(model, 'isSelected numberOfSelectedItems numberOfItems selectedItems', this.updateSelection);
      this.onChange(model, 'isSelected', this.updateControls);
      this.onChange(model, 'numberOfSelectedItems isBusy', this.updateFooter);
      this.onChange(model, 'isDisabled', this.updateAvailability);
      this.onChange(model, 'searchPattern', this.updateFilter);
    },

    getViewModel: function () {
      var viewModel = this.base();
      return _.extend(viewModel, {
        hasChanged: this.model.hasChanged()
      });
    },

    render: function () {
      var viewModel = this.getViewModel();
      this.renderSkeleton(viewModel);
      this.renderOverlay(viewModel);
      this.renderHeader(viewModel);
      this.renderCollapse(viewModel);
      this.renderSelection(viewModel);
      this.renderControls(viewModel);
      this.renderFooter(viewModel);
      this.renderAvailability(viewModel);
    },

    updateHeader: function () {
      var viewModel = this.getViewModel();
      this.renderHeader(viewModel);
    },

    updateFooter: function () {
      var viewModel = this.getViewModel();
      this.renderFooter(viewModel);
    },


    updateControls: function () {
      var viewModel = this.getViewModel();
      this.renderControls(viewModel);
    },


    updateCollapse: function () {
      var viewModel = this.getViewModel();
      this.renderHeader(viewModel);
      this.renderOverlay(viewModel);
      this.renderCollapse(viewModel);
    },

    renderCollapse: function (viewModel) {
      var $tgt = this.$(this.config.view.slots.container);

      if (viewModel.isDisabled === true) {
        var isAlwaysExpand = (viewModel.alwaysExpanded === true); // we might want to start off the component as always-expanded
        $tgt
          .toggleClass('expanded', false)
          .toggleClass('collapsed', !isAlwaysExpand)
          .toggleClass('always-expanded', isAlwaysExpand);
      } else if (viewModel.alwaysExpanded === true) {
        $tgt
          .toggleClass('expanded', false)
          .toggleClass('collapsed', false)
          .toggleClass('always-expanded', true);
      } else {
        var isCollapsed = viewModel.isCollapsed;
        $tgt
          .toggleClass('expanded', !isCollapsed)
          .toggleClass('collapsed', isCollapsed)
          .toggleClass('always-expanded', false);
      }
    },

    updateAvailability: function () {
      var viewModel = this.getViewModel();
      this.renderAvailability(viewModel);
    },

    renderAvailability: function (viewModel) {
      this.$(this.config.view.slots.container).toggleClass('disabled', viewModel.isDisabled === true);
    },

    onOverlayClick: function (event) {
      this.trigger("click:outside", this.model);

      if (this.config.view.overlaySimulateClick === true) {
        this.$(this.config.view.slots.overlay)
          .toggleClass('expanded', false)
          .toggleClass('collapsed', true);

        _.delay(function () {
          var $element = $(document.elementFromPoint(event.clientX, event.clientY));

          $element.closest('.filter-root-header').click();
        }, 0);
      }
    }
  });

});
