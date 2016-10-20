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
  './Parent'
], function (ParentView) {

  "use strict";

  /**
   * @class cdf.components.filter.views.Group
   * @amd cdf/components/filter/views/Group
   * @extends cdf.components.filter.views.Parent
   * @classdesc View for groups of items.
   * @ignore
   */
  return ParentView.extend(/** @lends cdf.components.filter.views.Group# */{
    /**
     * View type.
     *
     * @const
     * @type {string}
     */
    type: 'Group',

    /**
     * Default event mappings.
     *
     * @type {object}
     */
    events: {
      'change    .filter-filter:eq(0)': 'onFilterChange',
      'keyup     .filter-filter:eq(0)': 'onFilterChange',
      'click     .filter-filter-clear:eq(0)': 'onFilterClear',
      'click     .filter-group-selection': 'onSelection',
      'click     .filter-collapse-icon:eq(0)': 'onToggleCollapse',
      'mouseover .filter-group-container': 'onMouseOver',
      'mouseout  .filter-group-container': 'onMouseOut'
    },

    bindToModel: function (model) {
      this.base(model);
      this.onChange(model, 'isSelected numberOfSelectedItems numberOfItems', this.updateSelection);
      this.onChange(model, 'isCollapsed', this.updateCollapse);
    },

    /**
     */
    updateCollapse: function () {
      var viewModel = this.getViewModel();
      this.renderCollapse(viewModel);
    },

    /**
     * @param {object} viewModel
     */
    renderCollapse: function (viewModel) {
      this.renderSelection(viewModel);
      var $collapsible = this.$('.filter-group-body, .filter-group-footer');
      if (viewModel.isCollapsed) {
        $collapsible.hide();
      } else {
        $collapsible.show();
      }
    }
  });

});
