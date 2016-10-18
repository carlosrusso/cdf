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
  '../../../lib/mustache',
  './Abstract',
  '../base/templates'
], function ($, _, Mustache, AbstractView, templates) {

  /**
   * @class cdf.components.filter.views.Root
   * @amd cdf/components/filter/views/Root
   * @extends cdf.components.filter.views.Abstract
   * @classdesc Root View. The part of the filter that remains visible
   *   when the filter is collapsed.
   * @ignore
   */
  return AbstractView.extend(/** @lends cdf.components.filter.views.Root# */{
    /**
     * View type.
     *
     * @const
     * @type {string}
     */
    type: 'Root',

    /**
     * Default templates.
     *
     * @type {object}
     */
    templates: {
      skeleton: templates['Root-skeleton'],
      overlay: templates['Root-overlay'],
      header: templates['Root-header'],
      selection: templates['Root-selection'],
      footer: templates['Root-footer']
    },
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
      this.renderOverlay = this.renderSlot('overlay');
      this.renderHeader = this.renderSlot('header');
      this.renderFooter = this.renderSlot('footer');
      this.base(options);
    },

    bindToModel: function (model) {
      this.base(model);
      this.onChange(model, 'isCollapsed', this.updateCollapse);
      this.onChange(model, 'isSelected numberOfSelectedItems numberOfItems reachedSelectionLimit', this.updateHeader);
      this.onChange(model, 'isSelected numberOfSelectedItems numberOfItems selectedItems', this.updateSelection);
      this.onChange(model, 'reachedSelectionLimit isBusy', this.updateFooter);
      this.onChange(model, 'isDisabled', this.updateAvailability);
    },

    getViewModel: function () {
      var viewModel = this.base();

      var selectedItems = this.configuration
        .selectionStrategy
        .strategy
        .getSelectedItems(this.model, 'label');

      $.extend(viewModel, {
        selectedItems: selectedItems,
        allItemsSelected: this.model.getSelection() === true,
        noItemsSelected: this.model.getSelection() === false,
        hasChanged: this.model.hasChanged()
      });
      return viewModel;
    },

    render: function () {
      var viewModel = this.getViewModel();
      this.renderSkeleton(viewModel);
      this.renderOverlay(viewModel);
      this.renderHeader(viewModel);
      this.renderCollapse(viewModel);
      this.renderSelection(viewModel);
      this.renderFooter(viewModel);
      this.renderAvailability(viewModel);
      return this;
    },

    updateHeader: function () {
      var viewModel = this.getViewModel();
      this.renderHeader(viewModel);
      return this;
    },

    updateFooter: function () {
      var viewModel = this.getViewModel();
      this.renderFooter(viewModel);
      return this;
    },

    updateCollapse: function () {
      var viewModel = this.getViewModel();
      this.renderHeader(viewModel);
      this.renderOverlay(viewModel);
      this.renderCollapse(viewModel);
      return this;
    },

    renderCollapse: function (viewModel) {
      var $tgt = this.$('.filter-root-container');

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
      return this;
    },

    updateAvailability: function () {
      var viewModel = this.getViewModel();
      this.renderAvailability(viewModel);
      return this;
    },

    renderAvailability: function (viewModel) {
      this.$('.filter-root-container').toggleClass('disabled', viewModel.isDisabled === true);
      return this;
    },

    onOverlayClick: function (event) {
      this.trigger("click:outside", this.model);
      if (this.config.view.overlaySimulateClick === true) {
        this.$('.filter-overlay')
          .toggleClass('expanded', false)
          .toggleClass('collapsed', true);

        _.delay(function () {
          var $element = $(document.elementFromPoint(event.clientX, event.clientY));

          $element.closest('.filter-root-header').click();
        }, 0);
      }
      return this;
    }
  });

});
