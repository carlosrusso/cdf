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
  '../../../lib/Base',
  '../../../Logger',
  '../models/SelectionTree'
], function ($, _, Base, Logger, SelectionTree) {

  var SelectionStates = SelectionTree.SelectionStates;

  return Base.extend(Logger).extend(/** @lends cdf.components.filter.strategies.AbstractSelect# */{
    /**
     * @constructs
     * @extends {@link http://dean.edwards.name/weblog/2006/03/base/|Base}
     * @extends cdf.Logger
     * @amd cdf/components/filter/strategies/AbstractSelect
     * @classdesc Base class for handling the selection logic, for instance:
     *   <ul>
     *     <li> what happens when I click on a particular item </li>
     *     <li> what rules should be followed </li>
     *   </ul>
     * @ignore
     */
    constructor: function (options) {
      this.isLogicGlobal = true;
    },

    /**
     * Calculates the new state of an item, after the user clicked on it.
     *
     * @param  {SelectionStates} oldState The previouse selection state.
     * @return {SelectionStates} Returns the next selection state.
     */
    getNewState: function (oldState) {
      switch (oldState) {
        case SelectionStates.NONE:
          return SelectionStates.ALL;
        case SelectionStates.ALL:
          return SelectionStates.NONE;
        case SelectionStates.SOME:
          return SelectionStates.NONE;
      }
    },

    /**
     * Gets the selected models.
     *
     * @param {object} model The target model.
     * @param {string} [field="id"] The field that will be used to identify the selected item .
     * @return {object[]} The list of selected items.
     */
    getSelectedItems: function (model, field) {
      return model.getSelectedItems(field);
    },

    /**
     * Sets a node in the selection tree to a particular state.
     *
     * @param {SelectionStates} newState
     * @param {object} model
     */
    setSelection: function (newState, model) {
      throw new Error("NotImplemented");
    },

    selectOnlyThis: function (model) {
      model.root().setAndUpdateSelection(SelectionStates.NONE);
      this.setSelection(SelectionStates.ALL, model);
    },


    /**
     * Perform operations on the model, associated with the user clicking on an item.
     *
     * @param {object} model
     * @return {this}
     */
    changeSelection: function (model) {
      var newState = this.getNewState(model.getSelection());
      this.setSelection(newState, model);
    },

    /**
     * Perform operations on the model, associated with committing the current selection.
     *
     * @param {object} model
     * @return {this}
     */
    applySelection: function (model) {
      model.updateSelectedItems();
      model.root().set('isCollapsed', true);
    },

    /**
     * Resets the model to previous selection state.
     *
     * @param {object} model
     * @return {this}
     */
    cancelSelection: function(model){
      model.restoreSelectedItems();
      model.root().set('isCollapsed', true);
    },

    clickOutside: function(model) {
      model.root().set('isCollapsed', true);
    },

    filter: function(model, text){
      model.root().set('searchPattern', text);
    },

    toggleCollapse: function(model) {
      var willBeCollapsed;

      if (model.get('isDisabled') === true) {
        willBeCollapsed = true;
      } else {
        var isCollapsed = model.get('isCollapsed');
        willBeCollapsed = !isCollapsed;
        var hasVisibleNode = model.walkDown(function(m) {
          return m.getVisibility();
        }, _.some);
        if (!hasVisibleNode && isCollapsed) {
          this.filter(model, '');
        }
      }
      model.set('isCollapsed', willBeCollapsed);
    },

    mouseOver: function(model) {
    },

    mouseOut: function(model) {
    }
  });

});
