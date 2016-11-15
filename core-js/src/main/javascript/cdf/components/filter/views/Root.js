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

    bindToModel: function (model) {
      this.base(model);
      this.onChange(model, 'searchPattern', this.updateFilter, -1);
    },

    getViewModel: function () {
      var viewModel = this.base();

      var model = this.model;
      var hasChanged = _.memoize(function() {
        return model.hasChanged();
      });

      return _.extend(viewModel, {
        hasChanged: hasChanged
      });
    },

    onOverlayClick: function (event) {
      this.trigger("click:outside", this.model);
      var configView = this.config.view;

      if (configView.overlaySimulateClick === true) {

        this.$slots.container
          .toggleClass('expanded', false)
          .toggleClass('collapsed', true);

        _.delay(function () {
          var $element = $(document.elementFromPoint(event.clientX, event.clientY));

          $element.closest(configView.slots.header).click();
        }, 0);
      }
    }
  });

});
