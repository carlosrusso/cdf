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
  './Abstract'
], function (AbstractView) {

  "use strict";

  /**
   * @class cdf.components.filter.views.Item
   * @amd cdf/components/filter/views/Item
   * @extends cdf.components.filter.views.Abstract
   * @classdesc View for items.
   * @ignore
   */
  return AbstractView.extend(/** @lends cdf.components.filter.views.Item# */{
    /**
     * View type.
     *
     * @const
     * @type {string}
     */
    type: 'Item',

    /**
     * Default event mappings.
     *
     * @type {object}
     */
    events: {
      'mouseover .filter-item-body': 'onMouseOver',
      'mouseout  .filter-item-body': 'onMouseOut',
      'click     .filter-item-body': 'onSelection',
      'click     .filter-item-only-this': 'onClickOnlyThis'
    },

    /**
     * @param {object} model
     */
    bindToModel: function (model) {
      this.base(model);
      this.onChange(model, 'isSelected', this.updateSelection);
      this.onChange(model, 'isVisible', this.updateVisibility);
    },
    /**
     * Callback for click events on the _only-this_ button.
     *
     * @param {Event} event
     */
    onClickOnlyThis: function (event) {
      event.stopPropagation();
      this.trigger('control:only-this', this.model);
    }
  });

});
