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
  'amd!../../../lib/backbone',
  '../../../lib/mustache',
  '../../../lib/BaseEvents',
  '../models/SelectionTree',
  './scrollbar/ScrollBarFactory',
  '../HtmlUtils'
], function (_, Backbone, Mustache, BaseEvents, SelectionTree, ScrollBarFactory, HtmlUtils) {

  "use strict";
  /**
   * @class cdf.components.filter.views.Abstract
   * @amd cdf/components/filter/views/Abstract
   * @classdesc Abstract base class for all Views
   * @extends cdf.lib.BaseEvents
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
    onMouseOver: 'mouseover',
    onMouseOut: 'mouseout',
    onSelection:'selected',
    onApply: 'control:apply',
    onCancel:'control:cancel'
  };

  var EventsMixin = {};
  _.each(relayEvents, function(viewEvent, viewHandler) {
    this[viewHandler] = function(event) {
      this.trigger(viewEvent, this.model, event);
    };
  }, EventsMixin);

  return BaseEvents.convertClass(Backbone.View).extend(/** @lends cdf.components.filter.views.Abstract# */{
    type: null,
    templates: null,

    initialize: function (options) {
      this.configuration = options.configuration;
      this.config = this.configuration[this.type];

      /*
       * Consider user-defined templates
       */
      if (this.config.view.templates != null) {
        _.extend(this.templates, this.config.view.templates);
      }

      this.bindToModel(this.model);
      this.setElement(options.target);
      this.render();
    },

    /**
     * Binds changes of model properties to view methods.
     *
     * @param {cdf.components.filter.model.SelectionTree} model
     */

    bindToModel: function (model) {
      this.onChange(model, 'isVisible', this.updateVisibility);
    },

    onChange: function (model, properties, callback) {
      var props = properties.split(' ');
      var events = _.map(props, function (prop) {
        return 'change:' + prop;
      }).join(' ');

      var delay = this.config.view.throttleTimeMilliseconds;
      var c = _.bind(callback, this);
      var f = (delay >= 0) ? _.debounce(c, delay) : c;
      this.listenTo(model, events, f);
    },

    /*
     * View methods
     */
    getViewModel: function () {
      var viewOptions = _.result(this.config, 'options', {});
      var children = this.model.children();

      return _.extend(
        this.model.toJSON(),
        viewOptions,
        {
          strings: _.result(this.config, 'strings', {}),
          selectionStrategy: _.omit(this.configuration.selectionStrategy, 'strategy'),
          isPartiallySelected: this.model.getSelection() === SelectionTree.SelectionStates.SOME,
          numberOfChildren:  children ? children.length : 0
        }
      );
    },

    /**
     * Renders a template to a string whose html is properly sanitized.
     *
     * @param {string} template
     * @param {object} viewModel
     * @return {string} The sanitized html
     */
    getHtml: function(template, viewModel){
      /**
       *
       * To enable setting a placeholder in the input box, one must explicitly whitelist the
       * corresponding attribute:
       *
       * @example
       * require(["cdf/lib/sanitizer/lib/html4"], function(html4){
       *   html4.ATTRIBS["input::placeholder"] = 0
       * });
       */
      if(!template){
        return "";
      }
      var html = Mustache.render(template, viewModel);
      return HtmlUtils.sanitizeHtml(html);
    },

    injectContent: function (slot) {
      var ref, ref1;
      var renderers = (ref = this.config) != null ? (ref1 = ref.renderers) != null ? ref1[slot] : void 0 : void 0;
      if (renderers == null) {
        return;
      }
      if (!_.isArray(renderers)) {
        renderers = [renderers];
      }

      _.each(renderers, function (renderer) {
        if (_.isFunction(renderer)) {
          return renderer.call(this, this.$el, this.model, this.configuration);
        }
      }, this);
      return this;
    },

    /**
     * Fully renders the view.
     */
    render: function () {
      var viewModel = this.getViewModel();
      this.renderSkeleton(viewModel);
      this.renderSelection(viewModel);
      this.updateVisibility(viewModel);
      return this;
    },

    renderSkeleton: function (viewModel) {
      var html = this.getHtml(this.templates.skeleton, viewModel);
      this.$el.html(html);
      return this;
    },

    updateSelection: function (model, options) {
      if (model === this.model) {
        var viewModel = this.getViewModel();
        this.renderSelection(viewModel);
      }
      return this;
    },

    renderSelection: function (viewModel) {
      var html = this.getHtml(this.templates.selection, viewModel);
      this.$(this.config.view.slots.selection).replaceWith(html);
      this.injectContent('selection');

      window.countRenders[this.type] = (window.countRenders[this.type] || 0) + 1;
      return this;
    },

    updateVisibility: function () {
      if (this.model.getVisibility()) {
        this.$el.show();
      } else {
        this.$el.hide();
      }
    },

    /*
     * Boilerplate methods
     */
    close: function () {
      this.remove();
      return this.unbind();
    },

    /*
     * internal machinery
     */

    _renderSlot: function(slot) {
      return _.bind(function(viewModel) {
        if (this.templates[slot]) {
          var html = this.getHtml(this.templates[slot], viewModel);
          this.$(this.config.view.slots[slot]).replaceWith(html);
        }
        this.injectContent(slot);
      }, this);
    }

  }).extend(EventsMixin);

});
