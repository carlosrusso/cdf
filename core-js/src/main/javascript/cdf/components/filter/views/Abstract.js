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
  'amd!../../../lib/backbone',
  '../../../lib/mustache',
  '../../../lib/BaseEvents',
  './scrollbar/ScrollBarFactory',
  '../HtmlUtils'
], function ($, _, Backbone, Mustache, BaseEvents, ScrollBarFactory, HtmlUtils) {

  "use strict";

  /**
   * @class cdf.components.filter.views.Abstract
   * @amd cdf/components/filter/views/Abstract
   * @classdesc Abstract base class for all Views
   * @extends cdf.lib.BaseEvents
   * @extends Backbone.View
   * @ignore
   */


  /**
   * Map the handlers that are directly relayed to view events,
   * which will be processed by the view's controller.
   *
   * @type {object}
   */

  return BaseEvents.convertClass(Backbone.View).extend(/** @lends cdf.components.filter.views.Abstract# */{
    type: null,
    templates: null,

    initialize: function (options) {
      this.configuration = options.configuration;
      this.config = this.configuration[this.type];

      this._staticViewModel = _.extend({
        strings: this.config.strings,
        selectionStrategy: _.omit(options.configuration.selectionStrategy, 'strategy')
      }, this.config.options);

      this.templates = this.config.view.templates;

      if(!this.events) this.events = {};
      if (this.config.view.events) {
        this.events = $.extend(true, this.events, {}, this.config.view.events);
      }


      this.bindToModel(this.model);
      this.setElement(options.target);

      //this.updateViewModel();

      this.$slots = {};
      this.render();
    },

    /**
     * Binds changes of model properties to view methods.
     *
     * @param {cdf.components.filter.core.Model} model
     */

    bindToModel: function (model) {
      _.each(this.config.view.relayEvents, function(viewEvent, key) {
        this.events[key] = function(event) {
          this.trigger(viewEvent, model, event);
          return false;
        };
      }, this);


      //this.onChange(model, '', this.updateViewModel, this.config.view.modelDebounceTimeMilliseconds);

      _.each(this.config.view.onModelChange, function(slots, property) {
        this.onChange(model, property, this.updateSlots(slots));
      }, this);
    },

    /*
     * View methods
     */
    getViewModel: function () {
      var model = this.model.toJSON(true);

      var viewModel = _.extend(model, this._staticViewModel);
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

    injectContent: function (slot, viewModel) {
      var renderers = this.config.view.renderers[slot];
      if (!renderers) {
        return;
      }

      _.each(renderers, function (renderer) {
        if (_.isFunction(renderer)) {
          return renderer.call(this, this.$el, this.model, viewModel, this.configuration);
        }
      }, this);
    },

    /**
     * Fully renders the view.
     */

    render: function() {
      var viewModel = this.getViewModel();
      this.renderContainer(viewModel);
      this._cacheSlots();

      var slots = this.config.view.fullRender;
      this.updateSlots(slots).call(this, viewModel);

      return viewModel;
    },

    renderContainer: function(viewModel) {
      var html = this.getHtml(this.templates.container, viewModel);
      this.$el.html(html);
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


    /**
     * Sets up a listener for changes on a list of properties.
     *
     * By default, the listeners are debounced.
     *
     * @param obj
     * @param {string} properties - Space separated list of properties to observe.
     * @param {function} eventHandler - Event handler.
     * @param {number} [delayOverride]
     */
    onChange: function (obj, properties, eventHandler, delayOverride) {
      var events;
      var defaultDelay;

      if(properties){
        defaultDelay = this.config.view.throttleTimeMilliseconds;
        events = _.map(properties.split(' '), function(prop) {
          return prop ? 'change:' + prop : 'change';
        }).join(' ');
      } else {
        defaultDelay = this.config.view.modelDebounceTimeMilliseconds;
        events = 'change';
      }

      var delay = delayOverride ? delayOverride : defaultDelay;
      var f = (delay >= 0) ? _.debounce(eventHandler, delay) : eventHandler;

      this.listenTo(obj, events, f);
    },

    _cacheSlots: function() {
      _.each(this.config.view.slots, function(selector, slot) {
        this.$slots[slot] = this.$(selector);
      }, this);
    },

    updateSlots: function(slots) {
      return function() {

        var viewModel = this.getViewModel();

        _.each(slots, function(slot) {

          var template = this.templates[slot];
          if (template) {
            var html = this.getHtml(template, viewModel);
            this.$slots[slot].html(html);
          }

          this.injectContent(slot, viewModel);

        }, this);

      };
    }
  });


});
