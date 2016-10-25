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
  '../../../lib/Tree',
  '../../../Logger'
], function(_, Tree, Logger) {

  "use strict";

  return Tree.extend(/** @lends cdf.components.filter.controllers.Manager# */{
    /**
     * Class identifier.
     *
     * @const
     * @type {string}
     */
    ID: 'BaseFilter.Controllers.Manager',
    /**
     * Default values.
     *
     * @type {{model: object, view: object, configuration: object}}
     */
    defaults: {
      model: null,
      view: null,
      configuration: null
    },
    /**
     * @constructs
     * @amd cdf/components/filter/controllers/Manager
     * @extends cdf.lib.baseSelectionTree.Tree
     * @classdesc Controller responsible for managing the hierarchy of views and
     *   controllers. When data is added to the model, the Manager reacts by
     *   creating the appropriate views and respective controllers.
     * @param {object} node
     * @ignore
     */
    constructor: function(node) {
      this.base.apply(this, arguments);
      this.updateChildren();
    },

    initialize: function(options) {
      if (this.get('view') == null) {
        this.addView(this.get('model'));
      }
      this.applyBindings();
    },


    applyBindings: function() {
      var view = this.get('view');
      var configuration = this.get('configuration');
      var strategy = this.get('configuration').selectionStrategy.strategy;

      var throttleScroll = function(f) {
        var delayInMilliseconds = configuration.pagination.throttleTimeMilliseconds;
        return _.throttle(f, delayInMilliseconds || 0, {
          trailing: false
        });
      };
      var debounce = function(f) {
        var delayInMilliseconds = view.config.view.throttleTimeMilliseconds;
        return _.debounce(f, delayInMilliseconds);
      };

      /*
       * Declare bindings to model and view.
       */

      var bindings = {
        model: {
          'add': this.onNewData,
          'selection': this.sortSiblings
        },
        view: {
          'filter': debounce(this.onFilterChange),
          'scroll:reached:top': throttleScroll(this.getPreviousPage),
          'scroll:reached:bottom': throttleScroll(this.getNextPage)
        }
      };

      //map viewEvent: strategyMethod
      var viewBindings = {
        'toggleCollapse': 'toggleCollapse',
        'mouseover': 'mouseOver',
        'mouseout': 'mouseOut',
        'selected': 'changeSelection',
        'control:apply': 'applySelection',
        'control:cancel': 'cancelSelection',
        'control:only-this': 'selectOnlyThis',
        'click:outside': 'clickOutside'
      };


      _.each(viewBindings, function(strategyMethod, viewEvent) {
        this.listenTo(view, viewEvent, function() {
          strategy[strategyMethod].apply(strategy, arguments);
        });
      }, this);


      /*
       * Create listeners
       */

      _.each(bindings, function(bindingList, object) {
        var obj = this.get(object);
        _.each(bindingList, function(method, event) {

          this.listenTo(obj, event, _.bind(method, this));

        }, this);
      }, this);


      this.on('post:child:selection request:child:sort', debounce(this.renderSortedChildren));
      this.on('post:child:add', debounce(this.onAddChildren));
      return this;
    },

    addView: function(newModel) {

      /*
       * Decide which view to use
       */
      var viewConfig, configuration, target;
      if (this.isRoot()) {
        /*
         * This node is the Root.
         * A configuration object must have been passed as an option
         */
        configuration = this.get('configuration');
        target = configuration.target;
        viewConfig = configuration.Root;
      } else {
        /*
         * This node is either a Group or an Item
         * Use the parent's configuration
         */
        var parent = this.parent();
        var parentView = parent.get('view');

        configuration = parent.get('configuration');
        var childConfig = configuration[parentView.type].view.childConfig;

        if (newModel.children()) {
          viewConfig = configuration[childConfig.withChildrenPrototype];
        } else {
          viewConfig = configuration[childConfig.withoutChildrenPrototype];
        }

        target = parentView.createChildNode();
      }

      /*
       * Create new view
       */
      var newView = new viewConfig.view.constructor({
        model: newModel,
        configuration: configuration,
        target: target
      });

      this.set('view', newView);
    },

    onNewData: function(item, collection, obj) {
      var itemParent = this.where({
        model: item.parent()
      });
      if (itemParent.length === 1) {
        itemParent[0].trigger("post:child:add");
      }
    },

    onUpdateChildren: function() {
      this.updateChildren();
      this.restoreScroll();
      this.trigger('post:update:children', this);
    },

    restoreScroll: function() {
      var view = this.get('view');
      if (view._scrollBar != null) {
        if (this.previousPosition != null) {
          view.setScrollBarAt(this.previousPosition);
          this.previousPosition = null;
        }
      }
    },

    /*
     * Pagination
     */
    getNextPage: function(model, event) {
      var listOfChildren = listNodes(this.children());
      var sortedChildren = this.sortChildren(listOfChildren);
      var penultimateChild = _.last(sortedChildren, 2)[0];
      this.previousPosition = penultimateChild != null ? penultimateChild.target : undefined;
      return this.getPage('next', model, event);
    },
    getPreviousPage: function(model, event) {
      var listOfChildren = listNodes(this.children());
      var sortedChildren = this.sortChildren(listOfChildren);
      var secondChild = _.first(sortedChildren, 2)[1];
      this.previousPosition = secondChild != null ? secondChild.target : undefined;
      return this.getPage('previous', model, event);
    },

    getPage: function(page, model, event) {
      Logger.debug("Item " + (model.get('label')) + " requested page " + page);
      var searchPattern = "";
      if (this.get('configuration').search.serverSide === true) {
        searchPattern = model.root().get('searchPattern')
      }
      return this.requestPage(page, searchPattern);
    },

    requestPage: function(page, searchPattern) {
      var getPage = this.get('configuration').pagination.getPage;
      if (!_.isFunction(getPage)) {
        return this;
      }

      return getPage(page, searchPattern).then(function(json) {
        if (json.resultset != null) {
          Logger.debug("getPage: got " + json.resultset.length + " more items");
        } else {
          Logger.debug("getPage: no more items");
        }
      });
    },

    /*
     * Child management
     */
    updateChildren: function() {
      var models = this.get('model').children();
      if (models == null) {
        return;
      }

      var children = this.children();
      var modelsToAdd;
      if (!children) {
        modelsToAdd = models;
      } else {
        var existentModels = children.map(function(child) {
          return child.get('model');
        });

        modelsToAdd = models.chain().reject(function(m) {
          return _.includes(existentModels, m);
        });
      }

      modelsToAdd.each(function(m) {
        this.addChild(m);
      }, this);

      this.renderSortedChildren();
      this.get('view').updateScrollBar();
    },

    onAddChildren: function() {
      this.updateChildren();
    },

    /**
     * Create a new manager for this MVC tuple.
     */
    addChild: function(newModel) {
      var newManager = {
        model: newModel,
        configuration: this.get('configuration')
      };
      this.add(newManager);
      return this;
    },
    removeChild: function(model) {
      throw new Error("NotImplemented");
    },
    sortSiblings: function(model) {
      if (this.get('model') !== model) {
        return this;
      }
      if (this.parent()) {
        return this.parent().trigger('request:child:sort');
      }
    },
    /**
     * Gets an array containing the sorter functions. The most significant
     * sorter function should be placed at the beginning of the array.
     *
     * @return {function[]} An array with the available sorter functions.
     */
    getSorters: function() {
      var type = this.children().first().get('view').type;
      var customSorters = this.get('configuration')[type].sorters;

      if (_.isFunction(customSorters)) {
        return [customSorters];
      } else if (_.isArray(customSorters)) {
        return customSorters;
      }

      return [];
    },
    /**
     * Sorts a collection according to one or more custom sorter functions.
     * This function uses underscore's sortBy function. In order to
     * support multiple sorter functions we need to apply them in reverse order,
     * starting with the least significant and ending with the most significant.
     * The most significant should be placed at the beginning of the custom sorter
     * functions array.
     *
     * @param {object[]} children The array to be sorted.
     * @return {object[]} The sorted array.
     */
    sortChildren: function(children) {
      var customSorters = this.getSorters();
      if (_.isEmpty(customSorters)) {
        return children;
      }

      var sorterIdx = customSorters.length;
      var configuration = this.get('configuration');
      var orderedChildren = _.chain(children);

      // apply sorters in reverse order, from least to most important sorter
      while (sorterIdx--) {
        orderedChildren = orderedChildren.sortBy(function(child, idx) {
          return customSorters[sorterIdx](null, child.item.get('model'), configuration);
        });
      }
      return orderedChildren.value();
    },

    /**
     * Renders an array of sorted children.
     *
     * return {object} The current manager instance.
     */
    renderSortedChildren: function() {
      if (!this.children()) {
        return;
      }

      var $nursery = this.get('view').getChildrenContainer();
      $nursery.hide();
      this._appendChildren(this.sortChildren(detachNodes(this.children())));
      $nursery.show();
    },

    _appendChildren: function(children) {
      if (!children) {
        return;
      }

      var view = this.get('view');
      _.each(children, function(child) {
        view.appendChildNode(child.target);
      });
    },

    /**
     * React to the user typing in the search box.
     *
     * @param {string} text The new search pattern.
     */
    onFilterChange: function(model, text) {
      var configuration = this.get('configuration');
      configuration.selectionStrategy.strategy.filter(model, text);

      if (configuration.search.serverSide === true) {
        this.requestPage(0, text)
      }
    },

    /**
     * @summary Removes event handlers and closes the view from this node and its children.
     * @description Removes event handlers and closes the view from this node and its children.
     *              Also removes the children.
     *
     * @return {Object} Returns this node to allow chaining.
     */
    close: function() {
      this.empty();
      this.get('view').close();
      this.stopListening();
      this.off();
      this.clear();
      return this;
    },
    /**
     * @summary Closes and removes the children from the tree.
     * @description Closes and removes the children from the tree.
     */
    empty: function() {
      if (!this.children()) {
        return;
      }
      this.children().each(function(child) {
        child.close();
      });
      this.base();
    }

  });


  function detachNodes(children) {
    if (!children) {
      return null;
    }
    var nodes = listNodes(children);
    _.each(nodes, function(child) {
      child.target.detach();
    });
    return nodes;
  }

  function listNodes(children) {
    if (!children) {
      return null;
    }
    return children.map(function(child) {
      var $el = child.get('view').$el;
      return {
        item: child,
        target: $el
      };
    });
  }

});
