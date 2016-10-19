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
  'amd!../../../lib/underscore',
  './AbstractSelect',
  '../models/SelectionTree'
], function (_, AbstractSelect, SelectionTree) {

  var SelectionStates = SelectionTree.SelectionStates;
  /**
   * @class cdf.components.filter.strategies.SingleSelect
   * @amd cdf/components/filter/strategies/SingleSelect
   * @extends cdf.components.filter.strategies.AbstractSelect
   * @classdesc Single Selection. Only one item can be selected at any time.
   * @ignore
   */
  return AbstractSelect.extend(/** @lends cdf.components.filter.strategies.SingleSelect# */{
    /**
     * Sets a new selection state.
     *
     * @param {string} newState The new selection state.
     * @param {object} model    The target model.
     * @return {string} The new selection state.
     */
    setSelection: function (newState, model) {
      if (model.children()) {
        // only leafs can be marked as (un)selected
        return;
      }

      model.root().setSelection(SelectionStates.NONE);
      model.setAndUpdateSelection(SelectionStates.ALL);
      return newState;
    },

    /**
     * Changes the selection state.
     *
     * @param {object} model The target model.
     * @return {*} The value returned by {@link cdf.components.filter.strategies.AbstractSelect#applySelection|applySelection}.
     */
    changeSelection: function (model) {
      this.base(model);
      return this.applySelection(model);
    }

  });

});
