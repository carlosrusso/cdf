/**
 * Represents the state of the filter as tree structure.
 #
 * @module BaseFilter
 * @submodule Models
 * @class SelectionTree
 * @constructor
 * @extends Tree
 */

define([
  'amd!cdf/lib/underscore',
  './Tree',
  'cdf/Logger'
], function(_, Tree, Logger) {

  /**
   * The selection state representation.
   *
   * @typedef {?boolean} SelectionStates
   * @property {null}  SOME - Some items selected.
   * @property {false} NONE - No items selected.
   * @property {true}  ALL  - All items selected.
   */
  var SelectionStates = {
    SOME: null,
    NONE: false,
    ALL: true
  };

  var BaseSelectionTree = Tree.extend({

    /**
     * Default values for each node in the selection tree.
     *
     * @type     {Object}
     * @property {string}  id                    - The default id.
     * @property {string}  label                 - The default label.
     * @property {boolean} isSelected            - The default selection state.
     * @property {boolean} isVisible             - The default visibility state.
     * @property {boolean} isCollapsed           - The default collapsed state.
     * @property {number}  numberOfSelectedItems - The default number of selected items.
     * @property {number}  numberOfItems         - The default number of items.
     * @property {number}  page                  - The default page.
     */
    defaults: {
      id: void 0,
      label: '',
      isSelected: SelectionStates.NONE,
      isVisible: true,
      numberOfSelectedItems: 0,
      numberOfItems: 0
    },

    constructor: function(attributes, options) {
      if ((attributes != null ? attributes.label : void 0) != null) {
        if ((getOwn(attributes, 'id') == null) || (getOwn(options, 'useValueAsId') === true)) {
          attributes.id = attributes.label;
        }
      }
      this.base(attributes, options);
    },

    initialize: function() {
      this.base.apply(this, arguments);

      if (this.parent()) {
        this._inheritSelectionFromParent();
      }
      var filterText = this.root().get('searchPattern');
      this.filterBy(filterText);

      this.on('add remove', this._onAddRemove);
    },

    _inheritSelectionFromParent: function() {
      var parentSelectionState = this.parent().getSelection();
      if (parentSelectionState !== SelectionStates.SOME) {
        this.setSelection(parentSelectionState);
      }
    },

    _onAddRemove: function() {
      this.update();
    },

    /**
     * Sets the selection state of the model.
     *
     * @method setSelection
     * @public
     * @param {SelectionStates} newState The new selection state to be set.
     */
    setSelection: function(newState) {
      if (this.getSelection() === newState) {
        //Logger.log("No need to set selection of ", this.get('id'), " to ", newState);
        return this;
      }
      this.set('isSelected', newState);
      if (newState !== SelectionStates.SOME) {
        var children = this.children();
        if (children) {
          children.each(function(child) {
            return child.setSelection(newState);
          });
        }
      }
      if (this.parent()) {
        this.parent().updateSelection();
      }
      return this;
    },

    /**
     * Gets the selection state of the model.
     *
     * @method getSelection
     * @public
     * @return {Boolean}
     */
    getSelection: function() {
      return this.get('isSelected');
    },

    setAndUpdateSelection: function(newState) {
      this.setSelection(newState);
      this.update();
      this.trigger('selection', this);
    },

    setVisibility: function(newState) {
      var isVisible = this.get('isVisible');
      if (isVisible !== newState) {
        return this.set('isVisible', newState);
      }
      //Logger.debug("No need to set visibility of ", this.get('id'), " to ", newState);
    },

    getVisibility: function() {
      return this.get('isVisible');
    },

    getSelectedItems: function(field) {
      var isSelected = this.getSelection();

      switch (isSelected) {
        case SelectionStates.NONE:
          return [];
        case SelectionStates.ALL:
          return this.get(field || 'id');
        default:
          var children = this.children();
          if (children) {
            return children.chain()
              .map(function(child) {
                return child.getSelectedItems(field);
              })
              .flatten()
              .value();
          }
      }
      return [];
    },

    /**
     * Mark listed items as selected.
     *
     * @method setSelectedItems
     * @param {Array} idList A list of ids.
     */
    // NOTE: currently acts directly on the model and bypasses any business logic
    // TODO: change implementation to be recursive rather than acting on a flat tree
    setSelectedItems: function(idList) {
      var nodes = this.flatten().partition(function(m) {
        return m.children() == null;
      }).value();

      var leafs = nodes[0];
      var parents = nodes[1];

      if (leafs.length + parents.length === 0) {
        return;
      }

      var idMap = {};
      _.each(idList, function(id) {
        idMap[id] = 1;
      });

      _.each(leafs, function(m) {
        var id = m.get('id');
        if (_.has(idMap, id)) {
          m.setSelection(SelectionStates.ALL);
        } else {
          m.setSelection(SelectionStates.NONE);
        }
      });

      _.each(parents, function(m) {
        var id = m.get('id');
        if (_.has(idMap, id)) {
          m.setSelection(SelectionStates.ALL);
        }
      });

      this.update();
      return this.root().updateSelectedItems({
        silent: true
      });
    },

    updateSelectedItems: function(options) {
      var root = this.root();
      root.set('selectedItems', root._getSelectionSnapshot(), options);
    },

    restoreSelectedItems: function() {
      var selectedItems = this.root().get('selectedItems').value();

      if (selectedItems == null) {
        var root = this.root();
        root.setSelection(SelectionStates.NONE);
        root.update();
        return;
      }

      _.each(selectedItems.none, function(m) {
        return m.setSelection(SelectionStates.NONE);
      });

      _.each(selectedItems.all, function(m) {
        return m.setSelection(SelectionStates.ALL);
      });

      return this.update();
    },

    _getSelectionSnapshot: function() {
      var selectionSnapshot = this.flatten()
        .groupBy(function(m) {
          switch (m.getSelection()) {
            case SelectionStates.NONE:
              return "none";
            case SelectionStates.SOME:
              return "some";
            case SelectionStates.ALL:
              return "all";
            default:
              return "undefined";
          }
        });

      return selectionSnapshot;
    },

    update: function() {
      this.root().updateSelection();

      var numberOfServerItems = this.root().get('numberOfItemsAtServer');
      if (numberOfServerItems != null) {
        this.root().set('numberOfItems', numberOfServerItems);
      } else {
        this.root().updateCountOfItems('numberOfItems', function(model) {
          return 1;
        });
      }

      this.root().updateCountOfSelectedItems();
      return this;
    },

    updateSelection: function() {

      function getSelection(m) {
        return m.getSelection();
      }

      function setSelection(model, state) {
        if (model.children()) {
          model.setSelection(state);
        }
        return state;
      }

      return this.walkDown(getSelection, reduceSelectionStates, setSelection);
    },

    countItems: function(callback) {
      // TODO: attempt to reimplement using walkDown
      var count;
      var children = this.children();
      if (children) {
        count = children.reduce(function(memo, child) {
          return memo + child.countItems(callback);
        }, 0);
      } else {
        count = callback(this);
      }
      return count;
    },

    updateCountOfItems: function(property, countItemCallback) {
      function setPropertyIfParent(model, count) {
        if (model.children()) {
          model.set(property, count);
        }
        return count;
      }

      return this.walkDown(countItemCallback, sum, setPropertyIfParent);
    },

    countSelectedItems: function() {
      return this.countItems(countSelectedItem);
    },

    updateCountOfSelectedItems: function() {
      return this.updateCountOfItems('numberOfSelectedItems', countSelectedItem);
    },


    hasChanged: function() {
      var previousSelection = this.get('selectedItems');
      if (previousSelection == null) {
        return false;
      }
      previousSelection = previousSelection.value();
      var hasChanged = this._getSelectionSnapshot()
        .map(function(current, state) {
          var previous = previousSelection[state];
          var intersection = _.intersection(current, previous);
          return !(_.isEqual(current, intersection) && _.isEqual(previous, intersection));
        })
        .any()
        .value();

      return hasChanged;
    },

    filterBy: function(text) {
      this.root().set('searchPattern', text);
      this._filter(text, "", this.get("matcher"));
      this.root().setVisibility(true);
      return this;
    },

    _filter: function(text, prefix, customMatcher) {

      /*
       * decide on item visibility based on a match to a filter string
       * The children are processed first in order to ensure the visibility is reset correctly
       * if the user decides to delete/clear the search box
       */

      // TODO: generalize this to allow searching by id, value, etc
      var fullString = _.chain(['label'])
        .map(function(property) {
          return this.get(property);
        }, this)
        .compact()
        .value()
        .join(' ');
      if (prefix) {
        fullString = prefix + fullString;
      }

      var isMatch;
      if (this.children()) {
        isMatch = _.any(this.children().map(function(m) {
          return m._filter(text, fullString, customMatcher);
        }));
      } else if (_.isEmpty(text)) {
        isMatch = true;
      } else {
        if (_.isFunction(customMatcher)) {
          isMatch = customMatcher(fullString, text);
        } else {
          isMatch = fullString.toLowerCase().indexOf(text.toLowerCase()) > -1;
        }
      }

      this.setVisibility(isMatch);
      return isMatch;
    }


  }, {
    SelectionStates: SelectionStates
  });

  return BaseSelectionTree;

  function sum(list) {
    return _.reduce(list, function(memo, n) {
      return memo + n;
    }, 0);
  }

  function countSelectedItem(model) {
    if (model.getSelection() === SelectionStates.ALL) {
      return 1;
    }
    return 0;
  }

  /**
   * Infers the state of a node, based on the current state of its children.
   *
   * @param {SelectionStates[]} states an array containing the state of each child
   * @return {SelectionStates} Returns the inferred state
   */
  function reduceSelectionStates(states) {
    var all = _.every(states, function(el) {
      return el === SelectionStates.ALL;
    });
    if (all) {
      return SelectionStates.ALL;
    }

    var none = _.every(states, function(el) {
      return el === SelectionStates.NONE;
    });
    if (none) {
      return SelectionStates.NONE;
    }

    return SelectionStates.SOME;
  }

  function getOwn(o, p, v) {
    return _.has(o, p) ? o[p] : v;
  }

});
