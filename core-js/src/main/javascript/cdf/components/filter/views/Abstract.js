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
  'amd!../../../lib/underscore',
  'amd!../../../lib/backbone',
  '../../../lib/mustache',
  '../../../lib/BaseEvents',
  './scrollbar/ScrollBarFactory',
  '../HtmlUtils'
], function (_, Backbone, Mustache, BaseEvents, ScrollBarFactory, HtmlUtils) {

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
      this.templates = this.config.view.templates;

      if(this.config.view.events){
        this.events = this.config.view.events
      }

      this.bindToModel(this.model);
      this.setElement(options.target);

      this.updateViewModel();
      this.render();
    },

    /**
     * Binds changes of model properties to view methods.
     *
     * @param {cdf.components.filter.core.Model} model
     */

    bindToModel: function (model) {
      this.onChange(model, '', this.updateViewModel, this.config.view.modelDebounceTimeMilliseconds);
      this.onChange(model, 'isVisible', this.updateVisibility);
    },

    onChange: function (model, properties, callback, delayOverride) {
      var props = properties.split(' ');
      var events = _.map(props, function (prop) {
        return prop ? 'change:' + prop : 'change';
      }).join(' ');

      var delay = delayOverride ? delayOverride : this.config.view.throttleTimeMilliseconds;
      var c = _.bind(callback, this);
      var f = (delay >= 0) ? _.debounce(c, delay) : c;
      this.listenTo(model, events, f);
    },

    /*
     * View methods
     */
    getViewModel: function () {
      var model = this.model.toJSON();
      var viewModel = _.extend(
        model,
        this.config.options,
        {
          tooltip: model.tooltip || model.label,
          strings: this.config.strings,
          selectionStrategy: _.omit(this.configuration.selectionStrategy, 'strategy')
        }
      );
      return viewModel;
    },

    updateViewModel: function() {
      //console.log('Calculating viewModel', this.model.get('label'));
      this.viewModel = this.getViewModel();
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

      var patchViewModel = this.config.view.patchViewModel;
      if(_.isFunction(patchViewModel)){
        viewModel = patchViewModel(viewModel, this.model, this.configuration);
      }

      //console.log("rendering stuff", viewModel.label);

      var html = Mustache.render(template, viewModel, this.config.view.templates.partials);
      return HtmlUtils.sanitizeHtml(html);
    },

    injectContent: function (slot) {
      var renderers = this.config.renderers[slot];
      if (!renderers) {
        return;
      }

      _.each(renderers, function (renderer) {
        if (_.isFunction(renderer)) {
          return renderer.call(this, this.$el, this.model, this.configuration);
        }
      }, this);
    },

    /**
     * Fully renders the view.
     */
    render: function () {
      var viewModel = this.viewModel;
      this.renderSkeleton(viewModel);
      this.renderSelection(viewModel);
      this.updateVisibility(viewModel);
      return viewModel;
    },

    renderSkeleton: function (viewModel) {
      var html = this.getHtml(this.templates.skeleton, viewModel);
      this.$el.html(html);
    },

    updateSelection: function() {
      var viewModel = this.viewModel;
      this.renderSelection(viewModel);
    },

    renderSelection: function (viewModel) {
      var html = this.getHtml(this.templates.selection, viewModel);
      this.$(this.config.view.slots.selection).replaceWith(html);
      this.injectContent('selection');
    },

    updateVisibility: function () {
      this.$el.toggleClass('hidden', !this.viewModel.isVisible);
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
