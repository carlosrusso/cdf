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

  var ISelection = {

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

      var parent = this.parent();
      if (parent) {
        parent.updateSelection();
      }
      return this;
    },

    setAndUpdateSelection: function(newState) {
      this.setSelection(newState);
      this.update();
      this.trigger('selection', this);
    },

    getSelectedItems: function(field) {
      var isSelected = this.getSelection();

      switch (isSelected) {
        case SelectionStates.NONE:
          return [];
        case SelectionStates.ALL:
          return [this.get(field || 'id')];
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

    update: function() {
      var root = this.root();
      root.updateSelection();

      root._updateCount('numberOfItems', function(model) {
        return 1; // 1 parent + 10 children === 11?
      });
      root._updateCount('numberOfSelectedItems', countSelectedItem);

      var numberOfServerItems = root.get('numberOfItemsAtServer');
      if (numberOfServerItems != null) {
        root.set('numberOfItems', numberOfServerItems);
      }
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

      return this._walkDown(getSelection, reduceSelectionStates, setSelection);
    },


    hasChanged: function(attr) {
      if (attr && attr !== 'isSelected') {
        return this.base(attr);
      }

      var _previousSelection = this.get('selectedItems');
      if (_previousSelection == null) {
        return false;
      }

      var previousSelection = _previousSelection.value();

      // Confirm if any of the previously marked items changed its selection state
      var foundChange = _.some(previousSelection.some, function(m) {
        return m.getSelection() != SelectionStates.SOME;
      });
      if (foundChange) {
        return true;
      }

      foundChange = _.some(previousSelection.none, function(m) {
        return m.getSelection() != SelectionStates.NONE;
      });
      if (foundChange) {
        return true;
      }

      foundChange = _.some(previousSelection.all, function(m) {
        return m.getSelection() != SelectionStates.ALL;
      });
      if (foundChange) {
        return true;
      }

      // Perhaps we added more elements after saving the snapshot.
      // Let's see if any of the new items are selected.
      // We must take into account if the parent item was previously stored as ALL or NONE
      function item(m) {
        if (m.getSelection() === SelectionStates.ALL) { // is selected
          var isNotNew = _.contains(previousSelection.all, m);
          if (isNotNew) {
            return false;
          }
          // is new
          var parent = m.parent();
          if (parent) {
            // if the parent was previously unselected, and the child is selected, then
            // something has changed
            return _.contains(previousSelection.none, parent);
            //&& parent.getSelection() !== SelectionStates.ALL;
          }
        }
        return false;
      }

      function aggregate(results, m) {
        return _.some(results);
      }

      return this._walkDown(item, aggregate);
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
      var _selectedItems = this.root().get('selectedItems');
      if (_selectedItems == null) {
        return;
      }

      var root = this.root();
      root.setSelection(SelectionStates.NONE);

      var selectedItems = _selectedItems.value();

      _.each(selectedItems.all, function(m) {
        m.setSelection(SelectionStates.ALL);
      });

      this.update();
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

    _inheritSelectionFromParent: function() {
      var parent = this.parent();
      if (!parent) {
        return;
      }
      var parentSelectionState = parent.getSelection();
      if (parentSelectionState !== SelectionStates.SOME) {
        this.setSelection(parentSelectionState);
      }
    }
  };

  var IVisibility = {
    getVisibility: function() {
      return this.get('isVisible');
    },

    setVisibility: function(newState) {
      var isVisible = this.get('isVisible');
      if (isVisible !== newState) {
        return this.set('isVisible', newState);
      }
      //Logger.debug("No need to set visibility of ", this.get('id'), " to ", newState);
    },

    filterBy: function(text) {
      var root = this.root();
      root.set('searchPattern', text);
      this._filter(text, root.get("matcher"));
      root.setVisibility(true);
      return this;
    },

    _filter: function(text, customMatcher) {

      /*
       * decide on item visibility based on a match to a filter string
       * The children are processed first in order to ensure the visibility is reset correctly
       * if the user decides to delete/clear the search box
       */

      var isMatch;
      var children = this.children();

      if (children) {
        // iterate over all children to set the visibility
        isMatch = children.chain()
          .map(function(m) {
            return m._filter(text, customMatcher);
          })
          .some()
          .value();
      } else if (_.isEmpty(text)) {
        isMatch = true;
      } else {
        isMatch = customMatcher(this, text);
      }

      this.setVisibility(isMatch);
      return isMatch;
    }
  };

  var Mixins = _.extend({}, ISelection, IVisibility);

  var BaseSelectionTree = Tree.extend(Mixins).extend(/** @lends cdf.lib.BaseSelectionTree */{

    /**
     * Default values for each node in the selection tree.
     *
     * @type     {Object}
     * @property {string}  id                    - The default id.
     * @property {string}  label                 - The default label.
     * @property {boolean} isSelected            - The default selection state.
     * @property {boolean} isVisible             - The default visibility state.
     * @property {number}  numberOfSelectedItems - The default number of selected items.
     * @property {number}  numberOfItems         - The default number of items.
     */
    defaults: {
      id: void 0,
      label: '',
      isSelected: SelectionStates.NONE,
      isVisible: true,
      numberOfSelectedItems: 0,
      numberOfItems: 0
    },

    initialize: function(attributes, options) {
      this.base.apply(this, arguments);

      if (this.isRoot()) {
        // Initializations specific to root node
        this.set('matcher', getOwn(options, 'matcher') || defaultMatcher);
        this.on('change:searchPattern', function(model, value) {
          model.filterBy(value);
        });
      }
    },

    /**
     * Loads a model specification.
     *
     * @param {modelSpec} data - A tree model specification
     */
    load: function(data) {
      this.add(data);

      this._inheritSelectionFromParent();

      // If there's a searchPattern defined, adjust the visibility of this node
      var root = this.root();
      var filterText = root.get('searchPattern');
      this._filter(filterText, root.get('matcher'));

      this.update();
    },

    _updateCount: function(property, countItemCallback) {
      function setPropertyIfParent(model, count) {
        if (model.children()) {
          model.set(property, count);
        }
        return count;
      }

      return this.walkDown(countItemCallback, sum, setPropertyIfParent);
    }

  }, {
    SelectionStates: SelectionStates,
    Collection: Tree.Collection
  });

  return BaseSelectionTree;

  function sum(list) {
    return _.reduce(list, function(memo, n) {
      return memo + n;
    }, 0);
  }

  function countSelectedItem(model) {
    return (model.getSelection() === SelectionStates.ALL) ? 1 : 0;
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

  function defaultMatcher(model, text) {
    var fullString = '';
    for (var n = model; n != null; n = n.parent()) {
      fullString = n.get('label') + ' ' + fullString;
    }
    return fullString.toLowerCase().indexOf(text.toLowerCase()) > -1;
  }

});
