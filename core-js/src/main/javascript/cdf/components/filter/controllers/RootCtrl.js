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
  '../../../lib/BaseEvents'
], function($, _, BaseEvents) {

  return BaseEvents.extend(/** @lends cdf.components.filter.controllers.RootCtl# */{
    /**
     * @constructs
     * @amd cdf/components/filter/controllers/RootCtl
     * @extends cdf.lib.baseEvents.BaseEvents
     * @classdesc General-purpose controller.
     * @param {object} args Some aditional default options.
     * @ignore
     */
    constructor: function(args) {
      $.extend(this, _.pick(args, ['model', 'view', 'configuration']));
      if (this.view) {
        this.bindToView(this.view);
      }
    },

    bindToView: function(view) {
      var bindings = {
        'selected': this.onSelection,
        'toggleCollapse': this.onToggleCollapse,
        'control:only-this': this.onOnlyThis,
        'control:apply': this.onApply,
        'control:cancel': this.onCancel,
        'click:outside': this.onClickOutside
      };

      _.each(bindings, function(callback, event) {
        this.listenTo(view, event, callback);
      }, this);
    },

    /*
     * Event handling
     */

    /**
     * Acts upon the model whenever the user selected something.
     * Delegates work to the current selection strategy.
     *
     * @param {object} model The target model.
     */
    onSelection: function(model) {
      this.configuration.selectionStrategy.strategy.changeSelection(model);
    },

    /**
     * Informs the model that the user chose to commit the current selection.
     * Delegates work to the current selection strategy.
     *
     * @param {object} model The target model.
     */
    onApply: function(model) {
      this.configuration.selectionStrategy.strategy.applySelection(model);
    },

    /**
     * Informs the model that the user chose to revert to the last saved selection.
     * Delegates work to the current selection strategy.
     *
     * @param {object} model The target model.
     */
    onCancel: function(model) {
      this.configuration.selectionStrategy.strategy.cancelSelection(model);
    },

    /**
     * Toggles the component collapsed state and updates the models visibility.
     * When collapsing the component, if no model was visible,
     * the filter (search pattern) is reset.
     *
     * @param {object} model The target model.
     */
    onToggleCollapse: function(model) {
      var newState, oldState;
      this.debug("Setting isCollapsed");
      if (model.get('isDisabled') === true) {
        newState = true;
      } else {
        oldState = model.get('isCollapsed');
        newState = !oldState;
      }
      var hasVisibleNode = !!model.nodes() && _.some(model.nodes().models, function(m) {
        return m.get('isVisible');
      });
      if (!hasVisibleNode && oldState) {
        this.view.onFilterClear();
      }
      model.set('isCollapsed', newState);
    },

    /**
     * Collapses the component when a mouse click happens outside the component.
     *
     * @param {object} model The target model.
     */
    onClickOutside: function(model) {
      this.configuration.selectionStrategy.strategy.clickOutside(model);
    },

    /**
     * Updates the models selection state when the _only-this_ button is pressed.
     *
     * @param {object} model The target model.
     */
    onOnlyThis: function(model) {
      this.configuration.selectionStrategy.strategy.selectOnlyThis(model);
    }
  });

});
